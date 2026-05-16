import { useEffect, useState } from 'react';
import { Button, Space, Switch, Tag, Tooltip, Typography, message } from 'antd';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import { SyncStatus } from '@/apollo/client/graphql/__types__';
import { useDeployMutation } from '@/apollo/client/graphql/deploy.generated';
import { useDeployStatusContext } from '@/components/deploy/Context';

const { Text } = Typography;

const SKIP_REINDEX_KEY = 'nucleai.skipReindex';

const getDeployStatus = (deploying: boolean, status: SyncStatus) => {
  const syncStatus = deploying ? SyncStatus.IN_PROGRESS : status;

  return (
    {
      [SyncStatus.IN_PROGRESS]: (
        <Space size={[4, 0]}>
          <LoadingOutlined className="mr-1 gray-1" />
          <Text className="gray-1">Publicando...</Text>
        </Space>
      ),
      [SyncStatus.SYNCRONIZED]: (
        <Space size={[4, 0]}>
          <CheckCircleOutlined className="mr-1 green-7" />
          <Text className="gray-1">Sincronizado</Text>
        </Space>
      ),
      [SyncStatus.UNSYNCRONIZED]: (
        <Space size={[4, 0]}>
          <WarningOutlined className="mr-1 gold-6" />
          <Text className="gray-1">Alterações não publicadas</Text>
        </Space>
      ),
    }[syncStatus] || ''
  );
};

const readInitialSkip = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(SKIP_REINDEX_KEY);
  if (stored !== null) return stored === 'true';
  const envDefault = process.env.NEXT_PUBLIC_NUCLEAI_SKIP_REINDEX_DEFAULT;
  return envDefault === 'true';
};

export default function Deploy() {
  const deployContext = useDeployStatusContext();
  const { data, loading, startPolling, stopPolling } = deployContext;

  const [skipReindex, setSkipReindex] = useState<boolean>(readInitialSkip);

  const [deployMutation, { data: deployResult, loading: deploying }] =
    useDeployMutation({
      onError: (error) => console.error(error),
      onCompleted: (result) => {
        if (result.deploy?.status === 'FAILED') {
          const errMsg: string = result.deploy?.error ?? '';
          console.error('Failed to deploy - ', errMsg);
          // First-deploy guard: automatically turn off the toggle so the
          // next click runs a real indexing.
          if (/first deploy/i.test(errMsg)) {
            setSkipReindex(false);
            window.localStorage.setItem(SKIP_REINDEX_KEY, 'false');
            message.warning(
              'Skip re-indexing foi desligado: primeiro deploy precisa indexar no Qdrant.',
            );
          } else {
            message.error(
              'Falha ao publicar. Verifique o log para mais detalhes.',
            );
          }
        }
      },
    });

  useEffect(() => {
    if (
      deployResult?.deploy?.status === 'FAILED' &&
      data?.modelSync.status === SyncStatus.UNSYNCRONIZED
    ) {
      stopPolling();
    }
  }, [deployResult, data]);

  const syncStatus = data?.modelSync.status;
  const lastDeployHash = data?.modelSync.lastDeployHash ?? null;

  const onSkipToggle = (checked: boolean) => {
    setSkipReindex(checked);
    window.localStorage.setItem(SKIP_REINDEX_KEY, String(checked));
  };

  const onDeploy = () => {
    deployMutation({
      variables: { force: false, skipAiReindex: skipReindex },
    });
    startPolling(1000);
  };

  const onForceReindex = () => {
    deployMutation({
      variables: { force: true, skipAiReindex: false },
    });
    startPolling(1000);
  };

  const copyHash = () => {
    if (!lastDeployHash) return;
    navigator.clipboard?.writeText(lastDeployHash).then(
      () => message.success('Hash copiado'),
      () => message.error('Não foi possível copiar'),
    );
  };

  useEffect(() => {
    if (syncStatus === SyncStatus.SYNCRONIZED) stopPolling();
  }, [syncStatus]);

  const busy = deploying || loading || syncStatus === SyncStatus.IN_PROGRESS;
  const deployDisabled =
    busy ||
    [SyncStatus.SYNCRONIZED, SyncStatus.IN_PROGRESS].includes(syncStatus);
  const forceDisabled = busy;

  return (
    <Space size={[8, 0]}>
      {getDeployStatus(deploying, syncStatus)}
      {lastDeployHash && (
        <Tooltip title="Último deploy hash — clique para copiar">
          <Tag
            style={{ cursor: 'pointer', fontFamily: 'monospace' }}
            onClick={copyHash}
          >
            {lastDeployHash.slice(0, 8)}
          </Tag>
        </Tooltip>
      )}
      <Tooltip title="Pula a reindexação de IA: adota o estado atual do Qdrant como válido para a nova MDL. Use apenas em mudanças cosméticas.">
        <Space size={[4, 0]}>
          <Switch
            size="small"
            checked={skipReindex}
            onChange={onSkipToggle}
            disabled={busy}
          />
          <Text className="gray-1" style={{ fontSize: 12 }}>
            Pular reindexação de IA
          </Text>
        </Space>
      </Tooltip>
      <Button
        className={`adm-modeling-header-btn ${deployDisabled ? '' : 'gray-10'}`}
        disabled={deployDisabled}
        onClick={onDeploy}
        size="small"
        data-guideid="deploy-model"
      >
        Publicar
      </Button>
      <Tooltip title="Força reindexação completa no Qdrant (consome tokens OpenAI)">
        <Button
          size="small"
          disabled={forceDisabled}
          onClick={onForceReindex}
          icon={<ReloadOutlined />}
        />
      </Tooltip>
    </Space>
  );
}
