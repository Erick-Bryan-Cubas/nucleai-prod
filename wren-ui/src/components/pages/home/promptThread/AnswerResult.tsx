import { useEffect, useMemo } from 'react';
import { isEmpty, debounce } from 'lodash';
import clsx from 'clsx';
import { Button, Typography, Tabs, Tag, Tooltip } from 'antd';
import styled from 'styled-components';
import CheckCircleFilled from '@ant-design/icons/CheckCircleFilled';
import CodeFilled from '@ant-design/icons/CodeFilled';
import PieChartFilled from '@ant-design/icons/PieChartFilled';
import MessageOutlined from '@ant-design/icons/MessageOutlined';
import ShareAltOutlined from '@ant-design/icons/ShareAltOutlined';
import { RobotSVG } from '@/utils/svgs';
import { ANSWER_TAB_KEYS } from '@/utils/enum';
import { canGenerateAnswer } from '@/hooks/useAskPrompt';
import usePromptThreadStore from './store';
import { RecommendedQuestionsProps } from '@/components/pages/home/promptThread';
import RecommendedQuestions, {
  getRecommendedQuestionProps,
} from '@/components/pages/home/RecommendedQuestions';
import ViewBlock from '@/components/pages/home/promptThread/ViewBlock';
import ViewSQLTabContent from '@/components/pages/home/promptThread/ViewSQLTabContent';
import TextBasedAnswer, {
  getAnswerIsFinished,
} from '@/components/pages/home/promptThread/TextBasedAnswer';
import ChartAnswer from '@/components/pages/home/promptThread/ChartAnswer';
import Preparation from '@/components/pages/home/preparation';
import {
  AskingTaskStatus,
  ThreadResponse,
  ThreadResponseAnswerDetail,
  ThreadResponseAnswerStatus,
  ThreadResponseAdjustment,
  ThreadResponseAdjustmentType,
} from '@/apollo/client/graphql/__types__';

const { Title, Text } = Typography;

const adjustmentType = {
  [ThreadResponseAdjustmentType.APPLY_SQL]: 'SQL fornecido pelo usuário aplicado',
  [ThreadResponseAdjustmentType.REASONING]: 'Etapas de raciocínio ajustadas',
};

const knowledgeTooltip = (
  <>
    Salve esta resposta como um par Pergunta-SQL para ajudar o Wren AI a melhorar
    a geração de SQL.
    <br />
    <Typography.Link
      className="gray-1 underline"
      href="https://docs.getwren.ai/oss/guide/knowledge/question-sql-pairs#save-to-knowledge"
      target="_blank"
      rel="noopener noreferrer"
    >
      Saiba mais
    </Typography.Link>
  </>
);

const StyledTabs = styled(Tabs)`
  .ant-tabs-nav {
    margin-bottom: 0;
  }

  .ant-tabs-tab {
    background: rgba(255, 255, 255, 0.03) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;

    .ant-typography {
      color: var(--gray-6);
    }

    [aria-label='check-circle'],
    [aria-label='code'],
    [aria-label='pie-chart'] {
      color: var(--gray-6);
    }

    &.ant-tabs-tab-active {
      background: rgba(60, 174, 130, 0.12) !important;
      border-color: rgba(60, 174, 130, 0.35) !important;
      border-bottom-color: transparent !important;

      .ant-typography {
        color: var(--gray-2);
      }

      [aria-label='check-circle'] {
        color: var(--green-5);
      }

      [aria-label='code'] {
        color: var(--geekblue-4);
      }

      [aria-label='pie-chart'] {
        color: var(--gold-6);
      }

      .adm-beta-tag {
        background-color: rgba(60, 174, 130, 0.25);
        color: var(--geekblue-3);
      }
    }

    .adm-beta-tag {
      padding: 0 4px;
      line-height: 18px;
      margin: 0 0 0 6px;
      border-radius: 2px;
      background-color: rgba(255, 255, 255, 0.1);
      color: var(--gray-5);
      border: none;
    }
  }

  .ant-tabs-content-holder {
    border-left: 1px solid rgba(60, 174, 130, 0.25);
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
  }

  .ant-tabs-nav-wrap::before,
  .ant-tabs-nav-wrap::after {
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
`;

export interface Props {
  motion: boolean;
  threadResponse: ThreadResponse;
  isLastThreadResponse: boolean;
  isOpeningQuestion: boolean;
  onInitPreviewDone: () => void;
}

const QuestionTitle = (props) => {
  const { question, className } = props;
  return (
    <Title
      className={clsx('d-flex rounded mt-0', className)}
      level={4}
      style={{
        background: 'rgba(60, 174, 130, 0.1)',
        border: '1px solid rgba(60, 174, 130, 0.25)',
      }}
    >
      <MessageOutlined style={{ color: 'var(--geekblue-4)' }} className="mt-1 mr-3" />
      <Text style={{ color: 'var(--gray-2)' }} className="text-medium">{question}</Text>
    </Title>
  );
};

const renderRecommendedQuestions = (
  isLastThreadResponse: boolean,
  recommendedQuestionProps,
  onSelect: RecommendedQuestionsProps['onSelect'],
) => {
  if (!isLastThreadResponse || !recommendedQuestionProps.show) return null;

  return (
    <RecommendedQuestions
      className="mt-5 mb-4"
      {...recommendedQuestionProps.state}
      onSelect={onSelect}
    />
  );
};

const AdjustmentInformation = (props: {
  adjustment: ThreadResponseAdjustment;
}) => {
  const { adjustment } = props;

  return (
    <div className="rounded py-2 px-3 mb-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="d-flex align-center gx-2">
        <ShareAltOutlined style={{ color: 'var(--gray-5)' }} />
        <div className="flex-grow-1" style={{ color: 'var(--gray-5)' }}>
          Resposta ajustada
          <Tag className="ml-3 text-medium" style={{ color: 'var(--gray-5)', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)' }}>
            {adjustmentType[adjustment.type]}
          </Tag>
        </div>
      </div>
    </div>
  );
};

const isNeedGenerateAnswer = (answerDetail: ThreadResponseAnswerDetail) => {
  const isFinished = getAnswerIsFinished(answerDetail?.status);
  // it means the background task has not started yet, but answer is pending for generating
  const isProcessing = [
    ThreadResponseAnswerStatus.NOT_STARTED,
    ThreadResponseAnswerStatus.PREPROCESSING,
    ThreadResponseAnswerStatus.FETCHING_DATA,
  ].includes(answerDetail?.status);
  return answerDetail?.queryId === null && !isFinished && !isProcessing;
};

export default function AnswerResult(props: Props) {
  const { threadResponse, isLastThreadResponse, isOpeningQuestion } = props;

  const {
    onOpenSaveAsViewModal,
    onGenerateThreadRecommendedQuestions,
    onGenerateTextBasedAnswer,
    onGenerateChartAnswer,
    onOpenSaveToKnowledgeModal,
    // recommend questions
    recommendedQuestions,
    showRecommendedQuestions,
    onSelectRecommendedQuestion,
    preparation,
  } = usePromptThreadStore();

  const {
    askingTask,
    adjustmentTask,
    answerDetail,
    breakdownDetail,
    id,
    question,
    sql,
    view,
    adjustment,
  } = threadResponse;

  const resultStyle = isLastThreadResponse
    ? { minHeight: 'calc(100vh - (194px))' }
    : null;

  const isAdjustment = !!adjustment;

  const recommendedQuestionProps = getRecommendedQuestionProps(
    recommendedQuestions,
    showRecommendedQuestions,
  );

  const isAnswerPrepared = !!answerDetail?.queryId || !!answerDetail?.status;
  const isBreakdownOnly = useMemo(() => {
    // we support rendering different types of answers now, so we need to check if it's old data.
    // existing thread response's answerDetail is null.
    return answerDetail === null && !isEmpty(breakdownDetail);
  }, [answerDetail, breakdownDetail]);

  // initialize generate answer
  useEffect(() => {
    if (isBreakdownOnly) return;
    if (
      canGenerateAnswer(askingTask, adjustmentTask) &&
      isNeedGenerateAnswer(answerDetail)
    ) {
      const debouncedGenerateAnswer = debounce(
        () => {
          onGenerateTextBasedAnswer(id);
          onGenerateThreadRecommendedQuestions();
        },
        250,
        { leading: false, trailing: true },
      );
      debouncedGenerateAnswer();

      return () => {
        debouncedGenerateAnswer.cancel();
      };
    }
  }, [
    isBreakdownOnly,
    askingTask?.status,
    adjustmentTask?.status,
    answerDetail?.status,
  ]);

  const onTabClick = (activeKey: string) => {
    if (activeKey === ANSWER_TAB_KEYS.CHART && !threadResponse.chartDetail) {
      onGenerateChartAnswer(id);
    }
  };

  const showAnswerTabs =
    askingTask?.status === AskingTaskStatus.FINISHED ||
    isAnswerPrepared ||
    isBreakdownOnly;

  const rephrasedQuestion =
    threadResponse?.askingTask?.rephrasedQuestion || question;

  const questionForSaveAsView = useMemo(() => {
    // use rephrased question for follow-up questions, otherwise use the original question

    if (isOpeningQuestion) return question;

    return rephrasedQuestion;
  }, [rephrasedQuestion, question, isOpeningQuestion]);

  return (
    <div style={resultStyle} data-jsid="answerResult">
      {isAdjustment && <AdjustmentInformation adjustment={adjustment} />}
      <QuestionTitle className="mb-4" question={question} />
      <Preparation
        className="mb-3"
        {...preparation}
        data={threadResponse}
        minimized={isAnswerPrepared}
      />
      {showAnswerTabs && (
        <>
          <StyledTabs type="card" size="small" onTabClick={onTabClick}>
            {!isBreakdownOnly && (
              <Tabs.TabPane
                key={ANSWER_TAB_KEYS.ANSWER}
                tab={
                  <div className="select-none">
                    <CheckCircleFilled className="mr-2" />
                    <Text>Resposta</Text>
                  </div>
                }
              >
                <TextBasedAnswer {...props} />
              </Tabs.TabPane>
            )}
            <Tabs.TabPane
              key={ANSWER_TAB_KEYS.VIEW_SQL}
              tab={
                <div className="select-none">
                  <CodeFilled className="mr-2" />
                  <Text>Ver SQL</Text>
                </div>
              }
            >
              <ViewSQLTabContent {...props} />
            </Tabs.TabPane>
            <Tabs.TabPane
              key="chart"
              tab={
                <div className="select-none">
                  <PieChartFilled className="mr-2" />
                  <Text>
                    Gráfico<Tag className="adm-beta-tag">Beta</Tag>
                  </Text>
                </div>
              }
            >
              <ChartAnswer {...props} />
            </Tabs.TabPane>
          </StyledTabs>
          <div className="mt-2 d-flex align-center">
            <Tooltip
              overlayInnerStyle={{ width: 'max-content' }}
              placement="topLeft"
              title={knowledgeTooltip}
            >
              <Button
                type="link"
                size="small"
                className="mr-2"
                onClick={() =>
                  onOpenSaveToKnowledgeModal(
                    {
                      question: rephrasedQuestion,
                      sql,
                    },
                    { isCreateMode: true },
                  )
                }
                data-guideid="save-to-knowledge"
              >
                <div className="d-flex align-center">
                  <RobotSVG className="mr-2" />
                  Salvar no conhecimento
                </div>
              </Button>
            </Tooltip>
            <ViewBlock
              view={view}
              onClick={() =>
                onOpenSaveAsViewModal(
                  { sql, responseId: id },
                  {
                    rephrasedQuestion: questionForSaveAsView,
                  },
                )
              }
            />
          </div>
          {renderRecommendedQuestions(
            isLastThreadResponse,
            recommendedQuestionProps,
            onSelectRecommendedQuestion,
          )}
        </>
      )}
    </div>
  );
}
