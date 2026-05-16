declare module 'vega-lite' {
  export type Config = any;
  export type TopLevelSpec = any;
  export function compile(
    spec: TopLevelSpec,
    options?: { config?: Config },
  ): { spec: any };
}

declare module 'vega-embed' {
  export type EmbedOptions = any;
  export type Result = {
    finalize: () => void;
    view?: any;
    spec?: any;
    vgSpec?: any;
  };

  export default function embed(
    el: Element | string,
    spec: any,
    options?: EmbedOptions,
  ): Promise<Result>;
}
