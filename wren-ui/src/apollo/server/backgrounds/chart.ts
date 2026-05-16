import { ChartAdjustmentOption, ChartStatus } from '@server/models/adaptor';
import { IWrenAIAdaptor } from '@server/adaptors/wrenAIAdaptor';
import {
  IThreadResponseRepository,
  ThreadResponse,
} from '@server/repositories';
import { getLogger } from '@server/utils/logger';
import {
  PostHogTelemetry,
  TelemetryEvent,
  WrenService,
} from '@server/telemetry/telemetry';

const logger = getLogger('ChartBackgroundTracker');
logger.level = 'debug';

const isFinalized = (status: ChartStatus) => {
  return (
    status === ChartStatus.FINISHED ||
    status === ChartStatus.FAILED ||
    status === ChartStatus.STOPPED
  );
};

// NucleAI: map ChartType (uppercase enum) to Vega-Lite mark type
const CHART_TYPE_TO_MARK: Record<string, string> = {
  BAR: 'bar',
  GROUPED_BAR: 'bar',
  STACKED_BAR: 'bar',
  LINE: 'line',
  MULTI_LINE: 'line',
  AREA: 'area',
  PIE: 'arc',
  SCATTER: 'point',
  HEATMAP: 'rect',
};

/**
 * NucleAI: enforce the user's requested chart type on the AI-generated schema.
 *
 * The WrenAI prompt allows the LLM to override the user's choice if it "doesn't
 * make sense" for the data. That defeats the purpose of the Adjust button —
 * users expect their selection to win. We rewrite mark.type and reshape the
 * encoding so the requested chart actually renders.
 */
const applyAdjustmentOverride = (
  chartSchema: any,
  adjustmentOption: ChartAdjustmentOption,
): any => {
  if (!chartSchema || !adjustmentOption?.chartType) return chartSchema;

  // GraphQL enum values arrive uppercase ("LINE"); the server-side enum is
  // lowercase. Normalize once so we can compare against canonical keys.
  const requestedType = String(adjustmentOption.chartType).toUpperCase();
  const targetMark = CHART_TYPE_TO_MARK[requestedType];
  if (!targetMark) return chartSchema;

  const schema = JSON.parse(JSON.stringify(chartSchema));

  // Rewrite mark with type-appropriate options so the chart actually renders.
  // For line/area we need the line itself plus visible points so single
  // categories still show up. arc needs a donut inner radius.
  const buildMark = (type: string): any => {
    if (type === 'line') {
      return { type: 'line', point: true, tooltip: true, interpolate: 'monotone' };
    }
    if (type === 'area') {
      return { type: 'area', tooltip: true, interpolate: 'monotone', line: { strokeWidth: 2 } };
    }
    if (type === 'arc') {
      return { type: 'arc', innerRadius: 60, tooltip: true };
    }
    if (type === 'point') {
      return { type: 'point', filled: true, size: 80, opacity: 0.85, tooltip: true };
    }
    if (type === 'rect') {
      return { type: 'rect', tooltip: true };
    }
    return { type, tooltip: true };
  };
  schema.mark = buildMark(targetMark);

  // Reshape encoding based on the requested fields
  schema.encoding = schema.encoding || {};
  const encoding = schema.encoding;

  // Vega-Lite only draws line/area segments when the X axis has an order.
  // If the user forces LINE/AREA but X is nominal, promote it to ordinal so
  // the points actually get connected across categories.
  if ((targetMark === 'line' || targetMark === 'area') && encoding.x) {
    if (encoding.x.type === 'nominal') {
      encoding.x.type = 'ordinal';
    }
    // For LINE/AREA without an explicit color group, drop any per-category
    // color encoding — otherwise vega splits the data into 1-point series
    // and nothing connects. Single-series line is what the user expects.
    if (!adjustmentOption.color && encoding.color) {
      delete encoding.color;
    }
  }

  if (adjustmentOption.xAxis && encoding.x) {
    encoding.x.field = adjustmentOption.xAxis;
  }
  if (adjustmentOption.yAxis && encoding.y) {
    encoding.y.field = adjustmentOption.yAxis;
  }
  if (adjustmentOption.color) {
    encoding.color = {
      ...(encoding.color || {}),
      field: adjustmentOption.color,
      type: encoding.color?.type || 'nominal',
    };
  } else if (requestedType === 'LINE' && encoding.color) {
    // single-line: drop color grouping
    delete encoding.color;
  }
  if (adjustmentOption.xOffset) {
    encoding.xOffset = {
      ...(encoding.xOffset || {}),
      field: adjustmentOption.xOffset,
      type: 'nominal',
    };
  } else if (requestedType !== 'GROUPED_BAR' && encoding.xOffset) {
    delete encoding.xOffset;
  }
  if (adjustmentOption.theta && requestedType === 'PIE') {
    encoding.theta = {
      ...(encoding.theta || {}),
      field: adjustmentOption.theta,
      type: 'quantitative',
    };
  }

  // Stacked bar requires y.stack
  if (requestedType === 'STACKED_BAR' && encoding.y) {
    encoding.y.stack = 'zero';
  } else if (encoding.y?.stack && requestedType !== 'STACKED_BAR') {
    delete encoding.y.stack;
  }

  return schema;
};

export class ChartBackgroundTracker {
  private tasks: Record<number, ThreadResponse> = {};
  private intervalTime: number;
  private wrenAIAdaptor: IWrenAIAdaptor;
  private threadResponseRepository: IThreadResponseRepository;
  private runningJobs = new Set();
  private telemetry: PostHogTelemetry;

  constructor({
    telemetry,
    wrenAIAdaptor,
    threadResponseRepository,
  }: {
    telemetry: PostHogTelemetry;
    wrenAIAdaptor: IWrenAIAdaptor;
    threadResponseRepository: IThreadResponseRepository;
  }) {
    this.telemetry = telemetry;
    this.wrenAIAdaptor = wrenAIAdaptor;
    this.threadResponseRepository = threadResponseRepository;
    this.intervalTime = 1000;
    this.start();
  }

  private start() {
    logger.info('Chart background tracker started');
    setInterval(() => {
      const jobs = Object.values(this.tasks).map(
        (threadResponse) => async () => {
          // check if same job is running
          if (this.runningJobs.has(threadResponse.id)) {
            return;
          }

          // mark the job as running
          this.runningJobs.add(threadResponse.id);

          // get the chart detail
          const chartDetail = threadResponse.chartDetail;

          // get the latest result from AI service
          const result = await this.wrenAIAdaptor.getChartResult(
            chartDetail.queryId,
          );

          // check if status change
          if (chartDetail.status === result.status) {
            // mark the job as finished
            logger.debug(
              `Job ${threadResponse.id} chart status not changed, finished`,
            );
            this.runningJobs.delete(threadResponse.id);
            return;
          }

          // update database
          const updatedChartDetail = {
            queryId: chartDetail.queryId,
            status: result?.status,
            error: result?.error,
            description: result?.response?.reasoning,
            chartType: result?.response?.chartType?.toUpperCase() || null,
            chartSchema: result?.response?.chartSchema,
          };
          logger.debug(
            `Job ${threadResponse.id} chart status changed, updating`,
          );
          await this.threadResponseRepository.updateOne(threadResponse.id, {
            chartDetail: updatedChartDetail,
          });

          // remove the task from tracker if it is finalized
          if (isFinalized(result.status)) {
            const eventProperties = {
              question: threadResponse.question,
              error: result.error,
            };
            if (result.status === ChartStatus.FINISHED) {
              this.telemetry.sendEvent(
                TelemetryEvent.HOME_ANSWER_CHART,
                eventProperties,
              );
            } else {
              this.telemetry.sendEvent(
                TelemetryEvent.HOME_ANSWER_CHART,
                eventProperties,
                WrenService.AI,
                false,
              );
            }
            logger.debug(
              `Job ${threadResponse.id} chart is finalized, removing`,
            );
            delete this.tasks[threadResponse.id];
          }

          // mark the job as finished
          this.runningJobs.delete(threadResponse.id);
        },
      );

      // run the jobs
      Promise.allSettled(jobs.map((job) => job())).then((results) => {
        // show reason of rejection
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            logger.error(`Job ${index} failed: ${result.reason}`);
          }
        });
      });
    }, this.intervalTime);
  }

  public addTask(threadResponse: ThreadResponse) {
    this.tasks[threadResponse.id] = threadResponse;
  }

  public getTasks() {
    return this.tasks;
  }
}

export class ChartAdjustmentBackgroundTracker {
  private tasks: Record<number, ThreadResponse> = {};
  // NucleAI: keep the user's requested adjustment so we can force it
  // onto the AI response even when the LLM tries to override it.
  private pendingAdjustments: Record<number, ChartAdjustmentOption> = {};
  private intervalTime: number;
  private wrenAIAdaptor: IWrenAIAdaptor;
  private threadResponseRepository: IThreadResponseRepository;
  private runningJobs = new Set();
  private telemetry: PostHogTelemetry;

  constructor({
    telemetry,
    wrenAIAdaptor,
    threadResponseRepository,
  }: {
    telemetry: PostHogTelemetry;
    wrenAIAdaptor: IWrenAIAdaptor;
    threadResponseRepository: IThreadResponseRepository;
  }) {
    this.telemetry = telemetry;
    this.wrenAIAdaptor = wrenAIAdaptor;
    this.threadResponseRepository = threadResponseRepository;
    this.intervalTime = 1000;
    this.start();
  }

  private start() {
    logger.info('Chart adjustment background tracker started');
    setInterval(() => {
      const jobs = Object.values(this.tasks).map(
        (threadResponse) => async () => {
          // check if same job is running
          if (this.runningJobs.has(threadResponse.id)) {
            return;
          }

          // mark the job as running
          this.runningJobs.add(threadResponse.id);

          // get the chart detail
          const chartDetail = threadResponse.chartDetail;

          // get the latest result from AI service
          const result = await this.wrenAIAdaptor.getChartAdjustmentResult(
            chartDetail.queryId,
          );

          // check if status change
          if (chartDetail.status === result.status) {
            // mark the job as finished
            logger.debug(
              `Job ${threadResponse.id} chart status not changed, finished`,
            );
            this.runningJobs.delete(threadResponse.id);
            return;
          }

          // NucleAI: force the user's requested chart type onto the AI
          // response. The LLM frequently ignores the Adjust selection and
          // returns the original chart with a justification — we override
          // mark.type/encoding so the user's choice actually takes effect.
          const requested = this.pendingAdjustments[threadResponse.id];
          const forcedChartType =
            requested?.chartType?.toUpperCase() ||
            result?.response?.chartType?.toUpperCase() ||
            null;
          const forcedSchema = requested
            ? applyAdjustmentOverride(result?.response?.chartSchema, requested)
            : result?.response?.chartSchema;

          // update database
          const updatedChartDetail = {
            queryId: chartDetail.queryId,
            status: result?.status,
            error: result?.error,
            description: result?.response?.reasoning,
            chartType: forcedChartType,
            chartSchema: forcedSchema,
            adjustment: true,
          };
          logger.debug(
            `Job ${threadResponse.id} chart status changed, updating`,
          );
          await this.threadResponseRepository.updateOne(threadResponse.id, {
            chartDetail: updatedChartDetail,
          });

          // remove the task from tracker if it is finalized
          if (isFinalized(result.status)) {
            const eventProperties = {
              question: threadResponse.question,
              error: result.error,
            };
            if (result.status === ChartStatus.FINISHED) {
              this.telemetry.sendEvent(
                TelemetryEvent.HOME_ANSWER_ADJUST_CHART,
                eventProperties,
              );
            } else {
              this.telemetry.sendEvent(
                TelemetryEvent.HOME_ANSWER_ADJUST_CHART,
                eventProperties,
                WrenService.AI,
                false,
              );
            }
            logger.debug(
              `Job ${threadResponse.id} chart is finalized, removing`,
            );
            delete this.tasks[threadResponse.id];
            delete this.pendingAdjustments[threadResponse.id];
          }

          // mark the job as finished
          this.runningJobs.delete(threadResponse.id);
        },
      );

      // run the jobs
      Promise.allSettled(jobs.map((job) => job())).then((results) => {
        // show reason of rejection
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            logger.error(`Job ${index} failed: ${result.reason}`);
          }
        });
      });
    }, this.intervalTime);
  }

  public addTask(
    threadResponse: ThreadResponse,
    adjustmentOption?: ChartAdjustmentOption,
  ) {
    this.tasks[threadResponse.id] = threadResponse;
    if (adjustmentOption) {
      this.pendingAdjustments[threadResponse.id] = adjustmentOption;
    }
  }

  public getTasks() {
    return this.tasks;
  }
}
