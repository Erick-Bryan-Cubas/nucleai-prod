import { TopLevelSpec, Config } from 'vega-lite';

// Enum for mark types matching the frontend implementation
export enum MarkType {
  ARC = 'arc',
  AREA = 'area',
  BAR = 'bar',
  BOXPLOT = 'boxplot',
  CIRCLE = 'circle',
  ERRORBAND = 'errorband',
  ERRORBAR = 'errorbar',
  IMAGE = 'image',
  LINE = 'line',
  POINT = 'point',
  RECT = 'rect',
  RULE = 'rule',
  SQUARE = 'square',
  TEXT = 'text',
  TICK = 'tick',
  TRAIL = 'trail',
}

// Constants from handler.ts - NucleAI Brand Colors
const COLOR = {
  GRAY_10: '#1a1a1a',
  GRAY_9: '#282828',
  GRAY_8: '#444444',
  GRAY_5: '#CECECE',
  DARK_TEXT_PRIMARY: '#d1d5db',
  DARK_TEXT_SECONDARY: '#9ca3af',
  DARK_GRID: 'rgba(255,255,255,0.1)',
  DARK_TITLE: '#e5e7eb',
};

// Default color scheme - NucleAI Brand Palette
const colorScheme = [
  '#4ED4A0', // Primary Green
  '#66FFC4', // Green Light
  '#3CAE82', // Green Dark
  '#3CAE82', // Green
  '#4EDA40', // Green Light
  '#66FFC4', // Green Bright
  '#8E6389', // Purple
  '#B080E1', // Purple Light
  '#CC99FF', // Purple Bright
  '#5C5C5C', // Gray Dark
];

const DEFAULT_COLOR = colorScheme[0];

// Configuration object kept in sync with handler.ts
const config: Config = {
  background: 'transparent',
  mark: { tooltip: true },
  font: 'Roboto, Arial, Noto Sans, sans-serif',
  padding: { top: 30, bottom: 20, left: 0, right: 0 },
  title: {
    color: COLOR.DARK_TITLE,
    fontSize: 14,
    fontWeight: 600,
    anchor: 'start',
    offset: 8,
  },
  axis: {
    labelPadding: 4,
    labelOffset: 0,
    labelFontSize: 11,
    labelFontWeight: 400,
    gridColor: 'rgba(255,255,255,0.06)',
    gridDash: [3, 3],
    titleColor: COLOR.DARK_TEXT_SECONDARY,
    titleFontSize: 11,
    titleFontWeight: 500,
    titlePadding: 8,
    labelColor: COLOR.DARK_TEXT_SECONDARY,
    labelFont: 'Roboto, Arial, Noto Sans, sans-serif',
    domainColor: 'rgba(255,255,255,0.1)',
    tickColor: 'rgba(255,255,255,0.1)',
    tickSize: 4,
  },
  axisX: { labelAngle: -35, labelLimit: 120 },
  axisY: { gridOpacity: 0.6 },
  line: { color: DEFAULT_COLOR, strokeWidth: 2.5 },
  area: { color: DEFAULT_COLOR, fillOpacity: 0.3, strokeWidth: 2 },
  bar: { color: DEFAULT_COLOR, cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
  point: { size: 70, color: DEFAULT_COLOR, filled: true, opacity: 0.85 },
  rect: { opacity: 0.9 },
  arc: { stroke: 'transparent' },
  legend: {
    symbolLimit: 15,
    columns: 1,
    labelFontSize: 11,
    labelColor: COLOR.DARK_TEXT_SECONDARY,
    titleColor: COLOR.DARK_TEXT_PRIMARY,
    titleFontSize: 12,
    titleFontWeight: 600,
    padding: 10,
    rowPadding: 4,
    symbolSize: 100,
    symbolStrokeWidth: 1.5,
  },
  range: {
    category: colorScheme,
    ordinal: colorScheme,
    diverging: ['#3CAE82', '#1a1a1a', '#8E6389'],
    symbol: colorScheme,
    heatmap: ['#061e14', '#3CAE82', '#66FFC4'],
    ramp: ['#061e14', '#3CAE82', '#66FFC4'],
  },
  view: { stroke: 'transparent' },
};

/**
 * VegaSpecHandler provides methods to enhance and standardize Vega specifications
 * Similar to the frontend handler.ts but focusing only on core styling needs
 */
export class VegaSpecHandler {
  public config: Config;
  public data: { values: any[] };
  public encoding: any;
  public mark: any;
  public width: 'container';
  public height: 'container';
  public autosize: { type: string; contains: string };
  public params: any[];
  public title: string;
  public $schema: string;

  constructor(spec: any, dataValues: any[]) {
    this.config = config;
    this.$schema = 'https://vega.github.io/schema/vega-lite/v5.json';
    this.title = spec.title;
    this.width = 'container';
    this.height = 'container';
    this.autosize = { type: 'fit', contains: 'padding' };
    this.data = { values: dataValues };
    this.params = [
      {
        name: 'hover',
        select: {
          type: 'point',
          on: 'mouseover',
          clear: 'mouseout',
        },
      },
    ];

    // Clone to avoid mutating the original spec
    const clonedSpec = { ...spec };
    this.parseSpec(clonedSpec);
  }

  /**
   * Returns the complete enhanced Vega specification
   */
  public getChartSpec(): TopLevelSpec {
    return {
      $schema: this.$schema,
      config: this.config,
      title: this.title,
      data: this.data,
      mark: this.mark,
      width: this.width,
      height: this.height,
      autosize: this.autosize,
      encoding: this.encoding,
      params: this.params,
    } as TopLevelSpec;
  }

  /**
   * Parses the input specification to extract and enhance components
   */
  private parseSpec(spec: any): void {
    if ('mark' in spec) {
      const mark =
        typeof spec.mark === 'string' ? { type: spec.mark } : spec.mark;
      this.addMark(mark);
    }

    if ('encoding' in spec) {
      this.addEncoding(spec.encoding);
    }
  }

  /**
   * Processes and enhances the mark specification
   */
  private addMark(mark: any): void {
    this.mark = {
      type: mark.type,
    };

    // Handle specific mark types if needed
    if (mark.type === MarkType.LINE) {
      this.mark.point = true;
      this.mark.interpolate = 'monotone';
    } else if (mark.type === MarkType.AREA) {
      this.mark.line = { strokeWidth: 2 };
      this.mark.interpolate = 'monotone';
    } else if (mark.type === MarkType.ARC) {
      this.mark.innerRadius = 60;
      this.mark.stroke = 'transparent';
    } else if (mark.type === MarkType.POINT) {
      this.mark.filled = true;
      this.mark.size = 80;
      this.mark.opacity = 0.85;
    } else if (mark.type === MarkType.RECT) {
      this.mark.tooltip = true;
    }
  }

  /**
   * Processes and enhances encoding with proper color and interactivity
   */
  private addEncoding(encoding: any): void {
    this.encoding = { ...encoding };

    // Add color field if not provided
    this.addColorEncoding();

    // Handle special case for bar charts
    this.handleBarChartEncoding();

    // Add interactivity through opacity
    this.addOpacityForInteractivity();
  }

  /**
   * Handles special encoding for bar charts
   */
  private handleBarChartEncoding(): void {
    if (this.mark.type === MarkType.BAR) {
      // Handle stacking for bar charts
      if (this.encoding.y && 'stack' in this.encoding.y) {
        this.encoding.y.stack = 'zero';
      }

      // Handle xOffset titles if present
      if (this.encoding.xOffset) {
        const xOffset = this.encoding.xOffset;
        let title = xOffset.title;

        // Find xOffset title if not provided
        if (!title && xOffset.field) {
          title = this.findFieldTitleInEncoding(xOffset.field);
        }

        if (title) {
          this.encoding.xOffset.title = title;
        }
      }
    }
  }

  /**
   * Utility to find a field's title from other encodings
   */
  private findFieldTitleInEncoding(field: string): string | undefined {
    const axes = ['x', 'y', 'xOffset', 'color'];

    for (const axis of axes) {
      if (this.encoding[axis]?.field === field && this.encoding[axis]?.title) {
        return this.encoding[axis].title;
      }
    }

    return undefined;
  }

  /**
   * Adds or enhances color encoding
   */
  private addColorEncoding(): void {
    // If no color encoding exists, use a nominal axis
    if (!this.encoding.color) {
      const nominalAxis = ['x', 'y'].find(
        (axis) => this.encoding[axis]?.type === 'nominal',
      );

      if (nominalAxis) {
        const category = this.encoding[nominalAxis];
        this.encoding.color = {
          field: category.field,
          type: category.type,
          title: category.title || category.field,
          scale: {
            range: colorScheme,
          },
        };
      }
    } else if (this.encoding.color && !this.encoding.color.scale) {
      // Add color scale if not present
      this.encoding.color.scale = {
        range: colorScheme,
      };
    }

    // Set up hover fields for the interactive parameter
    if (this.params && this.encoding.color?.field) {
      this.params[0].select.fields = [this.encoding.color.field];
    }
  }

  /**
   * Adds opacity encoding for hover interactivity
   */
  private addOpacityForInteractivity(): void {
    // Add opacity for hover effect
    if (!this.encoding.opacity) {
      this.encoding.opacity = {
        condition: {
          param: 'hover',
          value: 1,
        },
        value: 0.3,
      };
    }
  }
}

/**
 * Enhances a Vega specification with standard configuration and styling
 *
 * @param vegaSpec The original Vega specification from the AI model
 * @param dataValues The data to be visualized
 * @returns Enhanced Vega specification with consistent styling
 */
export function enhanceVegaSpec(
  vegaSpec: any,
  dataValues: any[],
): TopLevelSpec {
  const handler = new VegaSpecHandler(vegaSpec, dataValues);
  return handler.getChartSpec();
}
