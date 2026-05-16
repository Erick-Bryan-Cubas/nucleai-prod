import type { NextApiRequest, NextApiResponse } from 'next';

// Resolve a Langfuse trace summary (tokens + cost) by traceId.
//
// The trace lives in the self-hosted Langfuse instance running on the same
// docker network, so we proxy the request server-side using the project
// credentials baked into the deployment. The browser never sees the secret.
//
// Returns 204 (no content) when the trace isn't ready yet or Langfuse is
// disabled, so the UI just hides the chip silently instead of erroring.

const LANGFUSE_HOST =
  process.env.LANGFUSE_HOST || 'http://langfuse-web:3000';
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || '';
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || '';

interface TraceSummary {
  traceId: string;
  totalTokens: number | null;
  totalCost: number | null;
  latencyMs: number | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TraceSummary | { error: string }>,
) {
  const traceId = (req.query.traceId || '').toString();
  if (!traceId) {
    return res.status(400).json({ error: 'missing traceId' });
  }
  if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) {
    // Langfuse not configured in this environment; tell the UI to hide chip.
    return res.status(204).end();
  }

  const auth = Buffer.from(
    `${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`,
  ).toString('base64');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const apiRes = await fetch(
      `${LANGFUSE_HOST}/api/public/traces/${encodeURIComponent(traceId)}`,
      {
        headers: { Authorization: `Basic ${auth}` },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (apiRes.status === 404) return res.status(204).end();
    if (!apiRes.ok) return res.status(204).end();

    const trace: any = await apiRes.json();
    const summary: TraceSummary = {
      traceId,
      totalTokens:
        typeof trace?.totalTokens === 'number' ? trace.totalTokens : null,
      totalCost: typeof trace?.totalCost === 'number' ? trace.totalCost : null,
      latencyMs: typeof trace?.latency === 'number' ? trace.latency : null,
    };
    return res.status(200).json(summary);
  } catch {
    return res.status(204).end();
  }
}
