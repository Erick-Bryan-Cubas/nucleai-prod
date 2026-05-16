import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ILLMConfigRepository,
  LLMConfig,
} from '@server/repositories/llmConfigRepository';
import { IWrenAIAdaptor, ReloadConfigResult } from '@server/adaptors';
import { Encryptor } from '@server/utils';
import { renderConfigYaml } from './templates/configYamlTemplate';
import { getLogger } from '@server/utils/logger';

const logger = getLogger('LLMConfigService');

// LLM_SHARED_DIR is the bindmount path seen from inside the wren-ui
// container; the same host path is mounted into wren-ai-service as /app.
// Fallback matches docker-compose.yaml.
const SHARED_DIR = process.env.LLM_SHARED_DIR || '/app/shared';
const CONFIG_YAML_PATH = path.join(SHARED_DIR, 'config.yaml');
const ENV_RUNTIME_PATH = path.join(SHARED_DIR, '.env.runtime');

export type LLMProvider = 'openai' | 'ollama';
export type LLMConnectionTarget = 'CHAT' | 'EMBEDDING';

export interface LLMConfigView {
  chatProvider: LLMProvider;
  embeddingProvider: LLMProvider;
  hasOpenaiApiKey: boolean;
  openaiModel: string;
  openaiEmbeddingModel: string;
  openaiEmbeddingDim: number;
  ollamaEndpoint: string;
  ollamaModel: string;
  ollamaEmbeddingModel: string;
  ollamaEmbeddingDim: number;
  updatedAt?: string;
}

export interface UpdateLLMConfigInput {
  chatProvider?: LLMProvider;
  embeddingProvider?: LLMProvider;
  openaiApiKey?: string | null;
  openaiModel?: string;
  openaiEmbeddingModel?: string;
  openaiEmbeddingDim?: number;
  ollamaEndpoint?: string;
  ollamaModel?: string;
  ollamaEmbeddingModel?: string;
  ollamaEmbeddingDim?: number;
}

export interface TestConnectionResult {
  ok: boolean;
  error?: string;
}

export interface OllamaModelInfo {
  name: string;
  size?: number;
  family?: string;
  parameterSize?: string;
}

export interface ListOllamaModelsResult {
  ok: boolean;
  error?: string;
  models: OllamaModelInfo[];
}

export interface ProbeEmbeddingDimResult {
  ok: boolean;
  error?: string;
  dim?: number;
}

type NormalizedLLMConfig = LLMConfig & {
  chatProvider: LLMProvider;
  embeddingProvider: LLMProvider;
};

export interface ILLMConfigService {
  getConfig(): Promise<LLMConfigView>;
  updateConfig(
    input: UpdateLLMConfigInput,
  ): Promise<LLMConfigView & { reload: ReloadConfigResult }>;
  testConnection(
    target: LLMConnectionTarget,
    input: UpdateLLMConfigInput,
  ): Promise<TestConnectionResult>;
  listOllamaModels(endpoint?: string): Promise<ListOllamaModelsResult>;
  probeEmbeddingDim(
    endpoint: string,
    model: string,
  ): Promise<ProbeEmbeddingDimResult>;
}

export class LLMConfigService implements ILLMConfigService {
  constructor(
    private readonly repo: ILLMConfigRepository,
    private readonly encryptor: Encryptor,
    private readonly wrenAIAdaptor: IWrenAIAdaptor,
  ) {}

  public async getConfig(): Promise<LLMConfigView> {
    const row = await this.repo.findSingleton();
    return toView(row);
  }

  public async updateConfig(
    input: UpdateLLMConfigInput,
  ): Promise<LLMConfigView & { reload: ReloadConfigResult }> {
    const patch: Partial<LLMConfig> = { ...input };
    delete (patch as any).openaiApiKey;

    // Only rotate the stored key if the user typed something. Empty string
    // means "clear"; undefined means "leave alone".
    if (input.openaiApiKey !== undefined) {
      patch.openaiApiKeyEncrypted = input.openaiApiKey
        ? this.encryptor.encrypt(
            JSON.parse(JSON.stringify({ apiKey: input.openaiApiKey })),
          )
        : null;
    }

    const updated = normalizeConfig(await this.repo.updateSingleton(patch));

    await this.writeConfigFiles(updated);

    // Best-effort reload: a failure here is shown to the user but doesn't
    // roll back the DB — the on-disk config and DB are still consistent.
    const reload = await this.wrenAIAdaptor.reloadConfig();
    if (!reload.ok) {
      logger.warn(`LLM reload failed: ${reload.error}`);
    }

    return { ...toView(updated), reload };
  }

  public async testConnection(
    target: LLMConnectionTarget,
    input: UpdateLLMConfigInput,
  ): Promise<TestConnectionResult> {
    const row = normalizeConfig(await this.repo.findSingleton());
    const provider =
      target === 'CHAT'
        ? input.chatProvider || row.chatProvider
        : input.embeddingProvider || row.embeddingProvider;

    try {
      if (provider === 'openai') {
        const apiKey = input.openaiApiKey ?? (await this.decryptStoredApiKey());
        if (!apiKey) return { ok: false, error: 'OpenAI API key is empty' };
        const res = await fetchWithTimeout(
          'https://api.openai.com/v1/models',
          { headers: { Authorization: `Bearer ${apiKey}` } },
          5000,
        );
        if (!res.ok) {
          return { ok: false, error: `OpenAI responded ${res.status}` };
        }
        return { ok: true };
      }

      if (provider === 'ollama') {
        const endpoint = input.ollamaEndpoint || row.ollamaEndpoint;
        if (!endpoint) return { ok: false, error: 'Ollama endpoint is empty' };

        if (target === 'EMBEDDING') {
          const model = input.ollamaEmbeddingModel || row.ollamaEmbeddingModel;
          if (!model) {
            return { ok: false, error: 'Ollama embedding model is empty' };
          }
          const result = await this.probeEmbeddingDim(endpoint, model);
          return result.ok
            ? { ok: true }
            : { ok: false, error: result.error || 'Embedding probe failed' };
        }

        const res = await fetchWithTimeout(
          `${endpoint.replace(/\/$/, '')}/api/tags`,
          {},
          5000,
        );
        if (!res.ok) {
          return { ok: false, error: `Ollama responded ${res.status}` };
        }
        return { ok: true };
      }

      return { ok: false, error: `Unknown provider: ${provider}` };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  public async listOllamaModels(
    endpoint?: string,
  ): Promise<ListOllamaModelsResult> {
    const ep = endpoint || (await this.repo.findSingleton()).ollamaEndpoint;
    try {
      const res = await fetchWithTimeout(
        `${ep.replace(/\/$/, '')}/api/tags`,
        {},
        5000,
      );
      if (!res.ok) {
        return {
          ok: false,
          error: `Ollama responded ${res.status}`,
          models: [],
        };
      }
      const body = (await res.json()) as {
        models?: Array<{
          name: string;
          size?: number;
          details?: { family?: string; parameter_size?: string };
        }>;
      };
      const models = (body.models || []).map((m) => ({
        name: m.name,
        size: m.size,
        family: m.details?.family,
        parameterSize: m.details?.parameter_size,
      }));
      return { ok: true, models };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err), models: [] };
    }
  }

  public async probeEmbeddingDim(
    endpoint: string,
    model: string,
  ): Promise<ProbeEmbeddingDimResult> {
    const ep = endpoint.replace(/\/$/, '');
    try {
      // Prefer /api/embed (newer, array input). Fall back to /api/embeddings.
      let res = await fetchWithTimeout(
        `${ep}/api/embed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, input: 'probe' }),
        },
        15000,
      );
      if (res.ok) {
        const body = (await res.json()) as { embeddings?: number[][] };
        const dim = body.embeddings?.[0]?.length;
        if (dim) return { ok: true, dim };
      }
      res = await fetchWithTimeout(
        `${ep}/api/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: 'probe' }),
        },
        15000,
      );
      if (!res.ok) {
        return { ok: false, error: `Ollama responded ${res.status}` };
      }
      const body = (await res.json()) as { embedding?: number[] };
      const dim = body.embedding?.length;
      if (!dim) return { ok: false, error: 'No embedding returned' };
      return { ok: true, dim };
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  private async decryptStoredApiKey(): Promise<string | null> {
    const row = await this.repo.findSingleton();
    if (!row.openaiApiKeyEncrypted) return null;
    try {
      const json = JSON.parse(
        this.encryptor.decrypt(row.openaiApiKeyEncrypted),
      );
      return json.apiKey || null;
    } catch {
      return null;
    }
  }

  private async writeConfigFiles(row: NormalizedLLMConfig): Promise<void> {
    const yamlStr = renderConfigYaml(row);
    // Atomic write: tmp + rename. Protects against wren-ai-service reading
    // a torn file during reload.
    const yamlTmp = `${CONFIG_YAML_PATH}.tmp`;
    await fs.writeFile(yamlTmp, yamlStr, 'utf8');
    await fs.rename(yamlTmp, CONFIG_YAML_PATH);

    const apiKey =
      usesOpenAI(row) &&
      row.openaiApiKeyEncrypted &&
      (() => {
        try {
          return JSON.parse(this.encryptor.decrypt(row.openaiApiKeyEncrypted))
            .apiKey as string;
        } catch {
          return '';
        }
      })();
    const envContent = `# NucleAI runtime overrides — written by wren-ui LLMSettings.\nOPENAI_API_KEY=${apiKey || ''}\n`;
    const envTmp = `${ENV_RUNTIME_PATH}.tmp`;
    await fs.writeFile(envTmp, envContent, { mode: 0o600 });
    await fs.rename(envTmp, ENV_RUNTIME_PATH);
  }
}

function toView(row: LLMConfig): LLMConfigView {
  const normalized = normalizeConfig(row);
  return {
    chatProvider: normalized.chatProvider,
    embeddingProvider: normalized.embeddingProvider,
    hasOpenaiApiKey: !!normalized.openaiApiKeyEncrypted,
    openaiModel: normalized.openaiModel,
    openaiEmbeddingModel: normalized.openaiEmbeddingModel,
    openaiEmbeddingDim: normalized.openaiEmbeddingDim,
    ollamaEndpoint: normalized.ollamaEndpoint,
    ollamaModel: normalized.ollamaModel,
    ollamaEmbeddingModel: normalized.ollamaEmbeddingModel,
    ollamaEmbeddingDim: normalized.ollamaEmbeddingDim,
    updatedAt: normalized.updatedAt,
  };
}

function normalizeConfig(row: LLMConfig): NormalizedLLMConfig {
  return {
    ...row,
    chatProvider: (row.chatProvider || row.provider || 'openai') as LLMProvider,
    embeddingProvider: (row.embeddingProvider ||
      row.provider ||
      'openai') as LLMProvider,
  };
}

function usesOpenAI(row: NormalizedLLMConfig): boolean {
  return row.chatProvider === 'openai' || row.embeddingProvider === 'openai';
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
