import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '@/apollo/server/config';

// Fire-and-forget pre-warm: pokes the downstream services so the first real
// user question doesn't pay the cold-start tax (qdrant index load, embedding
// model warm-up, ibis startup). All probes have short timeouts and any
// failure is swallowed — this endpoint is best-effort.
const poke = async (url: string, timeoutMs = 4000) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    await fetch(url, { signal: controller.signal }).catch(() => undefined);
    clearTimeout(timer);
  } catch {
    /* swallow */
  }
};

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse,
) {
  const config = getConfig();
  // Don't block the HTTP response on the probes — return immediately.
  void Promise.all([
    poke(`${config.wrenAIEndpoint}/health`),
    poke(`${config.wrenEngineEndpoint}/v1/mdl/status`),
    poke(`${config.ibisServerEndpoint}/health`),
  ]);
  res.status(202).json({ warming: true });
}
