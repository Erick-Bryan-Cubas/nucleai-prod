import { IContext } from '@server/types';
import {
  LLMConnectionTarget,
  UpdateLLMConfigInput,
} from '@server/services/llmConfigService';

export class LLMConfigResolver {
  constructor() {
    this.getLLMConfig = this.getLLMConfig.bind(this);
    this.updateLLMConfig = this.updateLLMConfig.bind(this);
    this.testLLMConnection = this.testLLMConnection.bind(this);
    this.listOllamaModels = this.listOllamaModels.bind(this);
    this.probeOllamaEmbeddingDim = this.probeOllamaEmbeddingDim.bind(this);
  }

  public async getLLMConfig(_root: any, _args: any, ctx: IContext) {
    return ctx.llmConfigService.getConfig();
  }

  public async updateLLMConfig(
    _root: any,
    args: { data: UpdateLLMConfigInput },
    ctx: IContext,
  ) {
    const { reload, ...config } = await ctx.llmConfigService.updateConfig(
      args.data,
    );
    return { config, reload };
  }

  public async testLLMConnection(
    _root: any,
    args: { target: LLMConnectionTarget; data: UpdateLLMConfigInput },
    ctx: IContext,
  ) {
    return ctx.llmConfigService.testConnection(args.target, args.data);
  }

  public async listOllamaModels(
    _root: any,
    args: { endpoint?: string },
    ctx: IContext,
  ) {
    return ctx.llmConfigService.listOllamaModels(args.endpoint);
  }

  public async probeOllamaEmbeddingDim(
    _root: any,
    args: { endpoint: string; model: string },
    ctx: IContext,
  ) {
    return ctx.llmConfigService.probeEmbeddingDim(args.endpoint, args.model);
  }
}
