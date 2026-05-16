import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Tag, Typography, Skeleton } from 'antd';
import styled from 'styled-components';
import SimpleLayout from '@/components/layouts/SimpleLayout';
import { Logo } from '@/components/Logo';

const { Title, Paragraph, Text, Link } = Typography;

interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number;
  version: string;
  services: {
    ai: 'ok' | 'down' | 'unknown';
    engine: 'ok' | 'down' | 'unknown';
    ibis: 'ok' | 'down' | 'unknown';
  };
}

const Wrapper = styled.div`
  max-width: 960px;
  margin: 32px auto;
  padding: 0 24px;
  color: var(--gray-2);
`;

const SectionCard = styled(Card)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 24px;

  .ant-card-head {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--gray-2);
  }

  .ant-statistic-title,
  .ant-statistic-content {
    color: var(--gray-3);
  }
`;

const formatUptime = (seconds: number) => {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h >= 1) return `${h}h ${m}min`;
  return `${m}min`;
};

const statusTag = (s: 'ok' | 'down' | 'unknown') => {
  if (s === 'ok') return <Tag color="green">Online</Tag>;
  if (s === 'down') return <Tag color="red">Offline</Tag>;
  return <Tag>Indisponível</Tag>;
};

export default function About() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SimpleLayout>
      <Wrapper>
        <div className="d-flex align-center mb-6">
          <Logo size={64} color="var(--geekblue-4)" />
          <div className="ml-4">
            <Title level={2} className="mt-0 mb-1" style={{ color: 'var(--gray-2)' }}>
              NucleAI
            </Title>
            <Text type="secondary">Plataforma Text-to-SQL para análise de dados</Text>
          </div>
        </div>

        <SectionCard title="Saúde do sistema">
          {loading ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : health ? (
            <Row gutter={24}>
              <Col span={6}>
                <Statistic
                  title="Status geral"
                  value={health.status === 'ok' ? 'Operacional' : 'Degradado'}
                  valueStyle={{
                    color: health.status === 'ok' ? 'var(--green-5)' : 'var(--gold-5)',
                  }}
                />
              </Col>
              <Col span={6}>
                <Statistic title="Uptime" value={formatUptime(health.uptime)} />
              </Col>
              <Col span={6}>
                <Statistic title="Versão" value={health.version} />
              </Col>
              <Col span={6}>
                <div>
                  <div className="text-sm gray-5 mb-1">Serviços</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div>AI: {statusTag(health.services.ai)}</div>
                    <div>Engine: {statusTag(health.services.engine)}</div>
                    <div>Ibis: {statusTag(health.services.ibis)}</div>
                  </div>
                </div>
              </Col>
            </Row>
          ) : (
            <Paragraph type="secondary">
              Não foi possível ler o endpoint de saúde.
            </Paragraph>
          )}
        </SectionCard>

        <SectionCard title="Sobre o projeto">
          <Paragraph style={{ color: 'var(--gray-3)' }}>
            NucleAI é uma plataforma Text-to-SQL com IA, desenvolvida como
            adaptação do projeto open-source <b>WrenAI</b> da Canner Inc.
            Permite que usuários façam perguntas em linguagem natural sobre
            seus dados e recebam respostas baseadas em SQL gerado
            automaticamente, com explicação passo a passo.
          </Paragraph>
          <Paragraph style={{ color: 'var(--gray-3)' }}>
            Esta instância foi configurada para demonstração com dados
            anonimizados do contexto Núclea (boletos, sacados, cedentes,
            scores de risco).
          </Paragraph>
        </SectionCard>

        <SectionCard title="Licença e atribuição">
          <Paragraph style={{ color: 'var(--gray-3)' }}>
            <Text strong>Projeto original:</Text>{' '}
            <Link
              href="https://github.com/Canner/WrenAI"
              target="_blank"
              rel="noopener noreferrer"
            >
              WrenAI
            </Link>{' '}
            por Canner Inc. — licenciado sob{' '}
            <Link
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              GNU AGPL-3.0
            </Link>
            .
          </Paragraph>
          <Paragraph style={{ color: 'var(--gray-3)' }}>
            <Text strong>Modificações NucleAI:</Text> branding customizado,
            integração com Langfuse v3 para observabilidade, configuração de
            LLM em runtime, manifests Terraform para deploy AWS, ajustes de
            UX, suporte multi-fonte de dados e correções de estabilidade.
          </Paragraph>
          <Paragraph style={{ color: 'var(--gray-3)' }}>
            Em conformidade com a Seção 13 da AGPL-3.0, o código-fonte
            completo desta versão modificada está publicamente disponível
            em:{' '}
            <Link
              href="https://github.com/Erick-Bryan-Cubas/nucleai-prod"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/Erick-Bryan-Cubas/nucleai-prod
            </Link>
            .
          </Paragraph>
        </SectionCard>

        <SectionCard title="Stack técnica">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div className="text-sm gray-5 mb-1">Frontend</div>
              <Text style={{ color: 'var(--gray-3)' }}>
                Next.js · React · Ant Design · Apollo Client
              </Text>
            </Col>
            <Col span={8}>
              <div className="text-sm gray-5 mb-1">Backend</div>
              <Text style={{ color: 'var(--gray-3)' }}>
                FastAPI · Python · Java (engine) · Qdrant
              </Text>
            </Col>
            <Col span={8}>
              <div className="text-sm gray-5 mb-1">Infra</div>
              <Text style={{ color: 'var(--gray-3)' }}>
                Docker Compose · AWS EC2 · Caddy 2 · Terraform
              </Text>
            </Col>
            <Col span={8}>
              <div className="text-sm gray-5 mb-1">Observabilidade</div>
              <Text style={{ color: 'var(--gray-3)' }}>
                Langfuse v3 · PostgreSQL · ClickHouse · Redis · MinIO
              </Text>
            </Col>
            <Col span={8}>
              <div className="text-sm gray-5 mb-1">Dados</div>
              <Text style={{ color: 'var(--gray-3)' }}>
                DuckDB · Parquet · PostgreSQL · BigQuery · Snowflake
              </Text>
            </Col>
            <Col span={8}>
              <div className="text-sm gray-5 mb-1">Segurança</div>
              <Text style={{ color: 'var(--gray-3)' }}>
                HTTPS (Let's Encrypt) · Rate-limit · Backup automático
              </Text>
            </Col>
          </Row>
        </SectionCard>
      </Wrapper>
    </SimpleLayout>
  );
}
