import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '@/apollo/server/config';

type ServiceHealth = 'ok' | 'down' | 'unknown';

interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number;
  version: string;
  services: {
    ai: ServiceHealth;
    engine: ServiceHealth;
    ibis: ServiceHealth;
  };
}

const probe = async (url: string, timeoutMs = 1500): Promise<ServiceHealth> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
};

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse<HealthResponse>,
) {
  const config = getConfig();

  // Each adapter exposes a different liveness path; we hit the cheapest one.
  const [ai, engine, ibis] = await Promise.all([
    probe(`${config.wrenAIEndpoint}/health`),
    probe(`${config.wrenEngineEndpoint}/v1/health`),
    probe(`${config.ibisServerEndpoint}/health`),
  ]);

  const allOk = ai === 'ok' && engine === 'ok' && ibis === 'ok';

  res.status(200).json({
    status: allOk ? 'ok' : 'degraded',
    uptime: Math.round(process.uptime()),
    version: process.env.WREN_PRODUCT_VERSION || 'dev',
    services: { ai, engine, ibis },
  });
}
