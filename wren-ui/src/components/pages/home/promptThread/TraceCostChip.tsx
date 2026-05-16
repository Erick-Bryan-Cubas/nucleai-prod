import { useEffect, useState } from 'react';
import { Tag, Tooltip } from 'antd';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';

interface TraceSummary {
  traceId: string;
  totalTokens: number | null;
  totalCost: number | null;
  latencyMs: number | null;
}

interface Props {
  traceId?: string | null;
}

const formatTokens = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
};

const formatCost = (n: number) => {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(3)}`;
};

const formatLatency = (ms: number) => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
};

// Renders a small chip with tokens / cost / latency pulled from Langfuse.
// Stays invisible if Langfuse isn't configured, the trace isn't ready yet,
// or the metrics aren't useful (no tokens, no cost). Observability without
// noise — fits next to the "Salvar no conhecimento" button.
export default function TraceCostChip({ traceId }: Props) {
  const [summary, setSummary] = useState<TraceSummary | null>(null);

  useEffect(() => {
    if (!traceId) return;
    let cancelled = false;
    // Wait a moment for the trace to be flushed to Langfuse before reading.
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/langfuse_trace?traceId=${encodeURIComponent(traceId)}`,
        );
        if (res.status !== 200) return;
        const data: TraceSummary = await res.json();
        if (!cancelled) setSummary(data);
      } catch {
        /* swallow */
      }
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [traceId]);

  if (!summary) return null;
  const { totalTokens, totalCost, latencyMs } = summary;
  const hasUseful =
    (totalTokens && totalTokens > 0) || (totalCost && totalCost > 0);
  if (!hasUseful) return null;

  const tooltip = (
    <div>
      <div>Tokens: {totalTokens ?? '—'}</div>
      <div>Custo: {totalCost ? formatCost(totalCost) : '—'}</div>
      <div>Latência: {latencyMs ? formatLatency(latencyMs) : '—'}</div>
      <div className="mt-2 text-sm gray-6">via Langfuse</div>
    </div>
  );

  return (
    <Tooltip title={tooltip} placement="top">
      <Tag
        icon={<ThunderboltOutlined />}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'var(--gray-5)',
          marginLeft: 8,
        }}
      >
        {totalTokens ? formatTokens(totalTokens) : '0'} tok
        {totalCost ? ` · ${formatCost(totalCost)}` : ''}
      </Tag>
    </Tooltip>
  );
}
