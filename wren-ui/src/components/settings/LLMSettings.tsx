import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import {
  useLlmConfigQuery,
  useUpdateLlmConfigMutation,
  useTestLlmConnectionMutation,
  useListOllamaModelsLazyQuery,
  useProbeOllamaEmbeddingDimMutation,
} from '@/apollo/client/graphql/llmConfig.generated';
import {
  buildLLMConfigPayload,
  hasEmbeddingConfigChanged,
  LLMConnectionTarget,
  LLMProvider,
  LLMSettingsFormValues,
  OPENAI_CHAT_MODELS,
  OPENAI_EMBEDDING_MODELS,
} from './llmSettingsHelpers';

const PROVIDERS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Ollama (self-hosted)', value: 'ollama' },
];

const Section = styled.div`
  background: var(--gray-11);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 16px;
`;

const SectionTitle = styled(Typography.Text)`
  display: block;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gray-6) !important;
  margin-bottom: 16px;
`;

const FooterBar = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px 0 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  margin-top: 4px;
`;

export default function LLMSettings() {
  const [form] = Form.useForm<LLMSettingsFormValues>();
  const [chatProvider, setChatProvider] = useState<LLMProvider>('openai');
  const [embeddingProvider, setEmbeddingProvider] =
    useState<LLMProvider>('openai');
  const [replaceKey, setReplaceKey] = useState(false);
  const pendingEmbeddingChangeRef = useRef(false);

  const { data, loading, refetch } = useLlmConfigQuery({
    fetchPolicy: 'cache-and-network',
  });

  const config = data?.llmConfig;

  const usesOpenAI =
    chatProvider === 'openai' || embeddingProvider === 'openai';
  const usesOllama =
    chatProvider === 'ollama' || embeddingProvider === 'ollama';

  const [updateLLMConfig, { loading: saving }] = useUpdateLlmConfigMutation({
    onCompleted: (res) => {
      const reload = res.updateLLMConfig.reload;
      const appliedSummary = [
        reload.llmModel ? `chat: ${reload.llmModel}` : null,
        reload.embeddingModel ? `embedding: ${reload.embeddingModel}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      if (reload.ok) {
        message.success(
          `Configurações salvas e aplicadas${appliedSummary ? ` (${appliedSummary})` : ''}.`,
        );
        if (pendingEmbeddingChangeRef.current) {
          message.info(
            'As configurações de embedding mudaram. Vá em Publicar e use Forçar reindexação para reconstruir o Qdrant.',
            8,
          );
        }
      } else {
        message.warning(
          `Salvo em disco, mas o hot-reload falhou: ${reload.error || 'erro desconhecido'}. Pode ser necessário reiniciar o wren-ai-service.`,
          8,
        );
      }

      pendingEmbeddingChangeRef.current = false;
      setReplaceKey(false);
      refetch();
    },
    onError: (err) => {
      pendingEmbeddingChangeRef.current = false;
      message.error(err.message);
    },
  });

  const [testConnection, { loading: testing }] = useTestLlmConnectionMutation();

  const [fetchOllamaModels, { data: ollamaData, loading: ollamaLoading }] =
    useListOllamaModelsLazyQuery({ fetchPolicy: 'network-only' });

  const [probeDim, { loading: probing }] = useProbeOllamaEmbeddingDimMutation();

  const ollamaModelOptions = useMemo(() => {
    const models = ollamaData?.listOllamaModels?.models || [];
    return models.map((model) => {
      const tag = model.parameterSize ? ` · ${model.parameterSize}` : '';
      const family = model.family ? ` (${model.family})` : '';
      return {
        label: `${model.name}${tag}${family}`,
        value: model.name,
      };
    });
  }, [ollamaData]);

  const ollamaListError =
    ollamaData?.listOllamaModels?.ok === false
      ? ollamaData.listOllamaModels.error
      : null;

  useEffect(() => {
    if (!config) return;

    setChatProvider(config.chatProvider as LLMProvider);
    setEmbeddingProvider(config.embeddingProvider as LLMProvider);
    form.setFieldsValue({
      chatProvider: config.chatProvider as LLMProvider,
      embeddingProvider: config.embeddingProvider as LLMProvider,
      openaiModel: config.openaiModel,
      openaiEmbeddingModel: config.openaiEmbeddingModel,
      openaiEmbeddingDim: config.openaiEmbeddingDim,
      ollamaEndpoint: config.ollamaEndpoint,
      ollamaModel: config.ollamaModel,
      ollamaEmbeddingModel: config.ollamaEmbeddingModel,
      ollamaEmbeddingDim: config.ollamaEmbeddingDim,
    });

    if (
      (config.chatProvider === 'ollama' ||
        config.embeddingProvider === 'ollama') &&
      config.ollamaEndpoint
    ) {
      fetchOllamaModels({ variables: { endpoint: config.ollamaEndpoint } });
    }
  }, [config, form, fetchOllamaModels]);

  const refreshOllamaModels = () => {
    const endpoint = form.getFieldValue('ollamaEndpoint');
    if (!endpoint) {
      message.warning('Informe o endpoint do Ollama primeiro.');
      return;
    }
    fetchOllamaModels({ variables: { endpoint } });
  };

  const onEmbeddingModelChange = async (modelName: string) => {
    const endpoint = form.getFieldValue('ollamaEndpoint');
    if (!endpoint || !modelName) return;

    const res = await probeDim({
      variables: { endpoint, model: modelName },
    });
    const result = res.data?.probeOllamaEmbeddingDim;

    if (result?.ok && result.dim) {
      form.setFieldsValue({ ollamaEmbeddingDim: result.dim });
      message.success(`Dimensão de embedding detectada: ${result.dim}`);
    } else if (result?.error) {
      message.warning(
        `Não foi possível detectar a dimensão: ${result.error}. Insira manualmente.`,
      );
    }
  };

  const showOpenaiKeyInput = useMemo(
    () => !config?.hasOpenaiApiKey || replaceKey,
    [config?.hasOpenaiApiKey, replaceKey],
  );

  const onProviderChange = (
    type: 'chatProvider' | 'embeddingProvider',
    nextProvider: LLMProvider,
  ) => {
    if (type === 'chatProvider') {
      setChatProvider(nextProvider);
    } else {
      setEmbeddingProvider(nextProvider);
    }

    form.setFieldsValue({ [type]: nextProvider });

    if (nextProvider === 'ollama') {
      const endpoint = form.getFieldValue('ollamaEndpoint');
      if (endpoint && ollamaModelOptions.length === 0) {
        fetchOllamaModels({ variables: { endpoint } });
      }
    }
  };

  const onTest = async (target: LLMConnectionTarget) => {
    const values = form.getFieldsValue();
    const payload = buildLLMConfigPayload(values);
    const res = await testConnection({ variables: { target, data: payload } });
    const result = res.data?.testLLMConnection;

    if (result?.ok) {
      message.success(
        target === 'CHAT'
          ? 'Conexão de chat bem-sucedida'
          : 'Conexão de embedding bem-sucedida',
      );
    } else {
      message.error(
        `Falha na conexão de ${
          target === 'CHAT' ? 'chat' : 'embedding'
        }: ${result?.error || 'desconhecido'}`,
      );
    }
  };

  const onSave = () => {
    form
      .validateFields()
      .then((values) => {
        const payload = buildLLMConfigPayload(values);
        pendingEmbeddingChangeRef.current = config
          ? hasEmbeddingConfigChanged(config, payload)
          : false;
        updateLLMConfig({ variables: { data: payload } });
      })
      .catch(() => {
        // antd already surfaces field errors
      });
  };

  if (loading && !data) {
    return (
      <div className="d-flex justify-center py-6">
        <Spin />
      </div>
    );
  }

  return (
    <Form form={form} layout="vertical">
      {/* Provedores */}
      <Section>
        <SectionTitle>Provedores</SectionTitle>

        <Form.Item
          name="chatProvider"
          label="Chat"
          extra="Trocar apenas o chat não exige reindexação do Qdrant."
          style={{ marginBottom: 20 }}
        >
          <Radio.Group
            options={PROVIDERS}
            optionType="button"
            value={chatProvider}
            onChange={(e) =>
              onProviderChange('chatProvider', e.target.value as LLMProvider)
            }
          />
        </Form.Item>

        <Form.Item
          name="embeddingProvider"
          label="Embeddings"
          extra="Se você mudar o provider, modelo, dimensão ou endpoint do embedding, salve e use Forçar reindexação em Publicar."
          style={{ marginBottom: 0 }}
        >
          <Radio.Group
            options={PROVIDERS}
            optionType="button"
            value={embeddingProvider}
            onChange={(e) =>
              onProviderChange('embeddingProvider', e.target.value as LLMProvider)
            }
          />
        </Form.Item>
      </Section>

      {/* OpenAI */}
      {usesOpenAI && (
        <Section>
          <SectionTitle>OpenAI</SectionTitle>

          <Form.Item
            label="Chave API"
            extra={
              config?.hasOpenaiApiKey && !replaceKey
                ? 'Uma chave já está armazenada. Clique em Substituir para renová-la.'
                : 'Armazenada criptografada; também gravada em .env.runtime quando OpenAI é usado.'
            }
            style={{ marginBottom: chatProvider === 'openai' ? 20 : 0 }}
          >
            {showOpenaiKeyInput ? (
              <Input.Group compact style={{ display: 'flex' }}>
                <Form.Item
                  name="openaiApiKey"
                  noStyle
                  rules={[
                    {
                      validator: (_rule, value) => {
                        if (usesOpenAI && !value && !config?.hasOpenaiApiKey) {
                          return Promise.reject(new Error('API key obrigatória'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input.Password
                    placeholder="sk-..."
                    autoComplete="new-password"
                    style={{ flex: 1 }}
                  />
                </Form.Item>
                {config?.hasOpenaiApiKey && (
                  <Button onClick={() => setReplaceKey(false)}>Cancelar</Button>
                )}
              </Input.Group>
            ) : (
              <Space>
                <Input.Password value="••••••••••••••••" disabled />
                <Button onClick={() => setReplaceKey(true)}>Substituir</Button>
              </Space>
            )}
          </Form.Item>

          {chatProvider === 'openai' && (
            <Form.Item
              name="openaiModel"
              label="Modelo de chat"
              rules={[{ required: true, message: 'Selecione um modelo de chat' }]}
              style={{ marginBottom: embeddingProvider === 'openai' ? 20 : 0 }}
            >
              <Select options={OPENAI_CHAT_MODELS} showSearch />
            </Form.Item>
          )}

          {embeddingProvider === 'openai' && (
            <Form.Item
              name="openaiEmbeddingModel"
              label="Modelo de embedding"
              rules={[{ required: true, message: 'Selecione um modelo de embedding' }]}
              extra="A dimensão do embedding é sincronizada automaticamente com o modelo escolhido."
              style={{ marginBottom: 0 }}
            >
              <Select options={OPENAI_EMBEDDING_MODELS} />
            </Form.Item>
          )}
        </Section>
      )}

      {/* Ollama */}
      {usesOllama && (
        <Section>
          <SectionTitle>Ollama</SectionTitle>

          <Alert
            type="info"
            showIcon
            className="mb-4"
            message="Use host.docker.internal:11434 se o Ollama estiver rodando no host Docker."
          />

          <Form.Item
            name="ollamaEndpoint"
            label="Endpoint"
            rules={[{ required: true, message: 'Informe o endpoint do Ollama' }]}
            extra={
              <Button
                type="link"
                size="small"
                icon={<ReloadOutlined />}
                onClick={refreshOllamaModels}
                loading={ollamaLoading}
                style={{ padding: 0 }}
              >
                Atualizar modelos
              </Button>
            }
            style={{ marginBottom: 20 }}
          >
            <Input placeholder="http://host.docker.internal:11434" />
          </Form.Item>

          {ollamaListError && (
            <Alert
              type="error"
              showIcon
              className="mb-4"
              message="Não foi possível conectar ao Ollama"
              description={ollamaListError}
            />
          )}

          {chatProvider === 'ollama' && (
            <Form.Item
              name="ollamaModel"
              label="Modelo de chat"
              rules={[{ required: true, message: 'Selecione um modelo de chat' }]}
              extra={ollamaModelOptions.length === 0 ? 'Clique em "Atualizar modelos" para carregar.' : undefined}
              style={{ marginBottom: embeddingProvider === 'ollama' ? 20 : 0 }}
            >
              <Select
                options={ollamaModelOptions}
                placeholder="Selecione um modelo instalado"
                showSearch
                loading={ollamaLoading}
                notFoundContent={ollamaLoading ? <Spin size="small" /> : 'Nenhum modelo encontrado'}
              />
            </Form.Item>
          )}

          {embeddingProvider === 'ollama' && (
            <>
              <Form.Item
                name="ollamaEmbeddingModel"
                label="Modelo de embedding"
                rules={[{ required: true, message: 'Selecione um modelo para embeddings' }]}
                extra="Ao selecionar, o NucleAI tenta detectar automaticamente a dimensão."
                style={{ marginBottom: 20 }}
              >
                <Select
                  options={ollamaModelOptions}
                  placeholder="Selecione um modelo instalado"
                  showSearch
                  loading={ollamaLoading}
                  onChange={onEmbeddingModelChange}
                  notFoundContent={ollamaLoading ? <Spin size="small" /> : 'Nenhum modelo encontrado'}
                />
              </Form.Item>
              <Form.Item
                name="ollamaEmbeddingDim"
                label="Dimensão de embedding"
                rules={[{ required: true, type: 'number', min: 1, message: 'Informe uma dimensão válida' }]}
                extra={probing ? 'Detectando dimensão…' : 'Preenchido automaticamente. Ajuste manualmente apenas se necessário.'}
                style={{ marginBottom: 0 }}
              >
                <InputNumber min={1} style={{ width: '100%' }} disabled={probing} />
              </Form.Item>
            </>
          )}
        </Section>
      )}

      <FooterBar>
        <Button onClick={() => onTest('CHAT')} loading={testing}>
          Testar chat
        </Button>
        <Button onClick={() => onTest('EMBEDDING')} loading={testing}>
          Testar embedding
        </Button>
        <Button type="primary" onClick={onSave} loading={saving}>
          Salvar
        </Button>
      </FooterBar>
    </Form>
  );
}
