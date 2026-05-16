import {
  ChartType,
  ThreadResponseChartDetail,
} from '@/apollo/client/graphql/__types__';
import { isNil, cloneDeep, uniq, sortBy, omit, isNumber } from 'lodash';
import { Config, TopLevelSpec } from 'vega-lite';

enum MarkType {
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

// Map ChartType enum values to Vega-Lite mark types
const CHART_TYPE_TO_MARK: Partial<Record<ChartType, MarkType>> = {
  [ChartType.BAR]: MarkType.BAR,
  [ChartType.GROUPED_BAR]: MarkType.BAR,
  [ChartType.STACKED_BAR]: MarkType.BAR,
  [ChartType.LINE]: MarkType.LINE,
  [ChartType.MULTI_LINE]: MarkType.LINE,
  [ChartType.AREA]: MarkType.AREA,
  [ChartType.PIE]: MarkType.ARC,
  [ChartType.SCATTER]: MarkType.POINT,
  [ChartType.HEATMAP]: MarkType.RECT,
};

const COLOR = {
  GRAY_10: '#1a1a1a',
  GRAY_9: '#282828',
  GRAY_8: '#444444',
  GRAY_5: '#CECECE',
  // dark mode palette
  DARK_TEXT_PRIMARY: '#d1d5db',   // gray-3
  DARK_TEXT_SECONDARY: '#9ca3af', // gray-5
  DARK_GRID: 'rgba(255,255,255,0.1)',
  DARK_TITLE: '#e5e7eb',          // gray-2
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

// high contrast color scheme
const pickedColorScheme = [
  colorScheme[0], // Primary Blue
  colorScheme[3], // Green
  colorScheme[6], // Purple
  colorScheme[1], // Blue Light
  colorScheme[4], // Green Light
];

const DEFAULT_COLOR = colorScheme[0];

// type EncodingFieldType = 'quantitative' | 'nominal' | 'temporal';
type DataSpec = { values: Record<string, any>[] };
type EncodingSpec = Extract<TopLevelSpec, { encoding?: any }>['encoding'] & {
  x: { type: string; field: string };
  y: { type: string; field: string };
};
type MarkSpec = Extract<TopLevelSpec, { mark?: any }>['mark'] extends
  | string
  | infer M
  ? M
  : never;
type AutosizeSpec = Extract<TopLevelSpec, { autosize?: any }>['autosize'];
type ParamsSpec = {
  name: string;
  select: {
    type: string;
    fields?: string[];
    on: string;
    clear: string;
  };
  value?: any;
}[];
type TransformSpec = Extract<TopLevelSpec, { transform?: any }>['transform'];

type ChartOptions = {
  width?: number | string;
  height?: number | string;
  stack?: 'zero' | 'normalize';
  point?: boolean;
  donutInner?: number | false;
  categoriesLimit?: number;
  isShowTopCategories?: boolean;
  isHideLegend?: boolean;
  isHideTitle?: boolean;
};

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

export default class ChartSpecHandler {
  public config: Config;
  public options: ChartOptions;
  public $schema: string;
  public title: string;
  public data: DataSpec;
  public encoding: EncodingSpec;
  public mark: MarkSpec;
  public autosize: AutosizeSpec;
  public params: ParamsSpec;
  public transform: TransformSpec;

  constructor(spec: TopLevelSpec, options?: ChartOptions) {
    this.config = config;
    this.data = spec.data as DataSpec;
    this.autosize = { type: 'fit', contains: 'padding' };
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
    // default options
    this.options = {
      width: isNil(options?.width) ? 'container' : options.width,
      height: isNil(options?.height) ? 'container' : options.height,
      stack: isNil(options?.stack) ? 'zero' : options.stack,
      point: isNil(options?.point) ? true : options.point,
      donutInner: isNil(options?.donutInner) ? 60 : options.donutInner,
      categoriesLimit: isNil(options?.categoriesLimit)
        ? 25
        : options.categoriesLimit,
      isShowTopCategories: isNil(options?.isShowTopCategories)
        ? false
        : options?.isShowTopCategories,
      isHideLegend: isNil(options?.isHideLegend) ? false : options.isHideLegend,
      isHideTitle: isNil(options?.isHideTitle) ? false : options.isHideTitle,
    };

    // avoid mutating the original spec
    const clonedSpec = cloneDeep(spec);
    this.parseSpec(clonedSpec);
  }

  public getChartSpec() {
    const categories = this.getAllCategories(this.encoding);
    // chart not support if categories more than the categories limit
    if (categories.length > this.options.categoriesLimit) {
      return null;
    }

    // if categories less or equal 5, use the picked color
    if (categories.length <= 5) {
      // Set the contrast color range on the color encoding instead of x/xOffset
      this.encoding.color = {
        ...this.encoding.color,
        scale: {
          range: pickedColorScheme,
        },
      } as any;
    }

    if (this.options.isHideLegend) {
      this.encoding.color = {
        ...this.encoding.color,
        legend: null,
      } as any;
    }

    if (this.options.isHideTitle) {
      this.title = null;
    }

    // transform values
    this.data = this.transformDataValues(this.data, this.encoding);

    return {
      $schema: this.$schema,
      title: this.title,
      data: this.data,
      mark: this.mark,
      width: this.options.width,
      height: this.options.height,
      autosize: this.autosize,
      encoding: this.encoding,
      params: this.params,
      transform: this.transform,
    } as TopLevelSpec;
  }

  private parseSpec(spec: TopLevelSpec) {
    this.$schema = spec.$schema;
    this.title = spec.title as string;
    this.transform = spec.transform;

    if ('mark' in spec) {
      const mark =
        typeof spec.mark === 'string' ? { type: spec.mark } : spec.mark;
      this.addMark(mark);
    }

    if ('encoding' in spec) {
      // filter top categories before encoding scale calculation
      if (this.options?.isShowTopCategories) {
        const filteredData = this.filterTopCategories(
          spec.encoding as EncodingSpec,
        );
        if (filteredData) this.data = filteredData;
      }

      this.addEncoding(spec.encoding as EncodingSpec);
    }
  }

  private addMark(mark: MarkSpec) {
    let additionalProps = {};

    if (mark.type === MarkType.LINE) {
      additionalProps = { point: this.options.point, tooltip: true, interpolate: 'monotone' };
    } else if (mark.type === MarkType.AREA) {
      additionalProps = { point: false, tooltip: true, interpolate: 'monotone', line: { strokeWidth: 2 } };
    } else if (mark.type === MarkType.ARC) {
      additionalProps = { innerRadius: this.options.donutInner, tooltip: true };
    } else if (mark.type === MarkType.POINT) {
      additionalProps = { tooltip: true, filled: true, size: 80, opacity: 0.85 };
    } else if (mark.type === MarkType.RECT) {
      additionalProps = { tooltip: true };
    }
    this.mark = { type: mark.type, ...additionalProps };
  }

  private addEncoding(encoding: EncodingSpec) {
    this.encoding = encoding;

    // fill color by x field if AI not provide color(category) field
    if (isNil(this.encoding.color)) {
      // find the nominal axis
      const nominalAxis = ['x', 'y'].find(
        (axis) => encoding[axis]?.type === 'nominal',
      );
      if (nominalAxis) {
        const category = encoding[nominalAxis] as any;
        this.encoding.color = {
          field: category.field,
          type: category.type,
        };
      }
    }

    // handle scale on bar chart
    if (this.mark.type === MarkType.BAR) {
      if ('stack' in this.encoding.y) {
        this.encoding.y.stack = this.options.stack;
      }

      if ('xOffset' in this.encoding) {
        const xOffset = this.encoding.xOffset as any;
        let title = xOffset?.title;
        // find xOffset title if not provided
        if (!title) {
          title = this.findFieldTitleInEncoding(this.encoding, xOffset?.field);
        }
        this.encoding.xOffset = { ...xOffset, title };
      }
    }

    this.addHoverHighlight(this.encoding);
  }

  private addHoverHighlight(encoding: EncodingSpec) {
    const category = (
      encoding.color?.condition ? encoding.color.condition : encoding.color
    ) as { type: any; field: string; title?: string };
    if (!category?.field || !category?.type) return;

    // Define the hover parameter correctly
    if (this.params && category?.field) {
      this.params[0].select.fields = [category.field];
    }

    this.encoding.opacity = {
      condition: {
        param: 'hover',
        value: 1,
      },
      value: 0.3,
    };

    let title = category?.title;
    // find color title if not provided
    if (!title) {
      title = this.findFieldTitleInEncoding(this.encoding, category?.field);
    }

    // basic color properties
    const colorProperties = {
      title,
      field: category?.field,
      type: category?.type,
      scale: {
        range: colorScheme,
      },
    } as any;

    this.encoding.color = {
      ...colorProperties,
      condition: {
        param: 'hover',
        ...omit(colorProperties, 'scale'),
      } as any,
    };
  }

  private filterTopCategories(encoding: EncodingSpec) {
    const nominalKeys = ['xOffset', 'color', 'x', 'y'].filter(
      (axis) => encoding[axis]?.type === 'nominal',
    );
    const quantitativeKeys = ['theta', 'x', 'y'].filter(
      (axis) => encoding[axis]?.type === 'quantitative',
    );
    if (!nominalKeys.length || !quantitativeKeys.length) return;

    const clonedValues = cloneDeep((this.data as any).values);

    const quantitativeAxis = quantitativeKeys[0];
    const quanAxis = encoding[quantitativeAxis] as any;
    const sortedValues = sortBy(clonedValues, (val) => {
      const value = val[quanAxis.field];
      return isNumber(value) ? -value : 0;
    });

    // nominal values probably have different length, so we need to filter them
    const filteredNominals = [];
    for (const nominalKey of nominalKeys) {
      const nomiAxis = encoding[nominalKey] as any;
      if (filteredNominals.some((val) => val.field === nomiAxis.field)) {
        continue;
      }
      const nominalValues = sortedValues.map((val) => val[nomiAxis.field]);
      const uniqueNominalValues = uniq(nominalValues);
      const topNominalValues = uniqueNominalValues.slice(
        0,
        this.options.categoriesLimit,
      );
      filteredNominals.push({
        field: nomiAxis.field,
        values: topNominalValues,
      });
    }
    const values = clonedValues.filter((val) =>
      filteredNominals.every((nominal) =>
        nominal.values.includes(val[nominal.field]),
      ),
    );
    return { values };
  }

  private getAllCategories(encoding: EncodingSpec) {
    const nominalAxis = ['xOffset', 'color', 'x', 'y'].find(
      (axis) => encoding[axis]?.type === 'nominal',
    );
    if (!nominalAxis) return [];
    const axisKey = encoding[nominalAxis] as any;
    const values = (this.data as any).values;
    const categoryValues = values.map((val) => val[axisKey.field]);
    const uniqueCategoryValues = uniq(categoryValues);

    return uniqueCategoryValues;
  }

  private findFieldTitleInEncoding(encoding: EncodingSpec, field: string) {
    const axis = ['x', 'y', 'xOffset', 'color'].find(
      (axis) => encoding[axis]?.field === field && encoding[axis]?.title,
    ) as any;
    return encoding[axis]?.title || undefined;
  }

  private transformDataValues(
    data: DataSpec,
    encoding: {
      x?: { type?: string; field?: string };
      y?: { type?: string; field?: string };
    },
  ) {
    // If axis x is temporal
    if (encoding?.x?.type === 'temporal') {
      const transformedValues = data.values.map((val) => ({
        ...val,
        [encoding.x.field]: this.transformTemporalValue(val[encoding.x.field]),
      }));
      return { ...data, values: transformedValues };
    }
    // If axis y is temporal
    if (encoding?.y?.type === 'temporal') {
      const transformedValues = data.values.map((val) => ({
        ...val,
        [encoding.y.field]: this.transformTemporalValue(val[encoding.y.field]),
      }));
      return { ...data, values: transformedValues };
    }
    return data;
  }

  private transformTemporalValue(value: string | any) {
    if (value === null || value === undefined) {
      return value;
    }
    const strValue = typeof value === 'string' ? value : String(value);
    // Safari not support if containing "YYYY-MM-DD HH:mm:ss.SSS UTC+00:00"
    // so we remove the UTC+00:00 for compatibility
    if (strValue.includes('UTC')) {
      return strValue.replace(/\s+UTC([+-][0-9]+)?(:[0-9]+)?/, '');
    }
    return strValue;
  }
}

export const convertToChartType = (
  markType: string,
  encoding: EncodingSpec,
) => {
  if (markType === MarkType.BAR) {
    if (encoding?.xOffset) {
      return ChartType.GROUPED_BAR;
    } else if (
      !isNil((encoding?.y as any)?.stack) ||
      !isNil((encoding?.x as any)?.stack)
    ) {
      return ChartType.STACKED_BAR;
    }
    return ChartType.BAR;
  } else if (markType === MarkType.ARC) {
    return ChartType.PIE;
  } else if (markType === MarkType.POINT) {
    return ChartType.SCATTER;
  } else if (markType === MarkType.RECT) {
    return ChartType.HEATMAP;
  } else if (markType === MarkType.LINE) {
    if (encoding?.color) return ChartType.MULTI_LINE;
    return ChartType.LINE;
  } else if (markType === MarkType.AREA) {
    return ChartType.AREA;
  }
  return markType ? (markType.toUpperCase() as ChartType) : null;
};

export const getChartSpecOptionValues = (
  chartDetail: ThreadResponseChartDetail,
) => {
  const spec = chartDetail?.chartSchema;
  let chartType: string | null = chartDetail?.chartType || null;
  let xAxis: string | null = null;
  let yAxis: string | null = null;
  let color: string | null = null;
  let xOffset: string | null = null;
  let theta: string | null = null;

  if (spec && 'encoding' in spec) {
    const encoding = spec.encoding as EncodingSpec;
    xAxis = (encoding?.x as any)?.field || null;
    yAxis = (encoding?.y as any)?.field || null;
    color = (encoding?.color as any)?.field || null;
    xOffset = (encoding?.xOffset as any)?.field || null;
    theta = (encoding?.theta as any)?.field || null;
    if (chartType === null) {
      chartType = convertToChartType(
        typeof spec.mark === 'string' ? spec.mark : spec.mark.type,
        encoding,
      );
    }
  }
  return {
    chartType,
    xAxis,
    yAxis,
    color,
    xOffset,
    theta,
  };
};

export const getChartSpecFieldTitleMap = (encoding: EncodingSpec) => {
  if (!encoding) return {};
  const allFields = ['x', 'y', 'xOffset', 'color'].reduce((result, key) => {
    const axis = encoding[key] as any;
    if (axis?.field && axis?.title) {
      result[axis?.field] = axis?.title;
    }
    return result;
  }, {});
  return allFields;
};
