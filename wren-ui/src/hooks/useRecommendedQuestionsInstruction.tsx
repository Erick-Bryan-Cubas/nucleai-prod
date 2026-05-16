import { useMemo, useState, useEffect } from 'react';
import { groupBy, orderBy, flatMap } from 'lodash';
import { message } from 'antd';
import Icon from '@/import/icon';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import { CopilotSVG } from '@/utils/svgs';
import { isRecommendedFinished } from '@/hooks/useAskPrompt';
import {
  ResultQuestion,
  RecommendedQuestionsTaskStatus,
} from '@/apollo/client/graphql/__types__';
import {
  useGetProjectRecommendationQuestionsLazyQuery,
  useGenerateProjectRecommendationQuestionsMutation,
} from '@/apollo/client/graphql/home.generated';

export interface GroupedQuestion {
  category: string;
  question: string;
  sql: string;
}

const getGroupedQuestions = (
  questions: ResultQuestion[],
): GroupedQuestion[] => {
  const groupedData = groupBy(questions, 'category');
  return orderBy(
    flatMap(groupedData),
    (item) => groupedData[item.category].length, // Sort by number of questions in each category
    'desc',
  );
};

// Fallback shown while the LLM hasn't generated suggestions yet, so the user
// always has a guided demo entry-point. Categories map to the three parquet
// files loaded in DuckDB (boletos, sacados/cedentes, scores de risco).
const NUCLEAI_FALLBACK_QUESTIONS: GroupedQuestion[] = [
  {
    category: 'Boletos',
    question: 'Quantos boletos foram pagos no último mês?',
    sql: '',
  },
  {
    category: 'Boletos',
    question: 'Qual o valor total emitido por tipo de espécie?',
    sql: '',
  },
  {
    category: 'Boletos',
    question: 'Quais os 10 maiores boletos por valor nominal?',
    sql: '',
  },
  {
    category: 'Inadimplência',
    question: 'Qual o tempo médio de atraso por CNPJ?',
    sql: '',
  },
  {
    category: 'Inadimplência',
    question: 'Quais CNPJs têm maior share de inadimplência entre 6 e 15 dias?',
    sql: '',
  },
  {
    category: 'Risco',
    question: 'Qual a distribuição do score de quantidade por UF?',
    sql: '',
  },
  {
    category: 'Risco',
    question: 'Quais setores (CNAE) têm pior índice de liquidez 1 mês?',
    sql: '',
  },
  {
    category: 'Risco',
    question: 'Top 5 CNPJs com melhor score de materialidade evolução',
    sql: '',
  },
];

export default function useRecommendedQuestionsInstruction() {
  const [showRetry, setShowRetry] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [isRegenerate, setIsRegenerate] = useState<boolean>(false);
  const [
    showRecommendedQuestionsPromptMode,
    setShowRecommendedQuestionsPromptMode,
  ] = useState<boolean>(false);
  const [recommendedQuestions, setRecommendedQuestions] = useState<
    GroupedQuestion[]
  >([]);

  const [fetchRecommendationQuestions, recommendationQuestionsResult] =
    useGetProjectRecommendationQuestionsLazyQuery({
      pollInterval: 2000,
    });

  // Handle errors via try/catch blocks rather than onError callback
  const [generateProjectRecommendationQuestions] =
    useGenerateProjectRecommendationQuestionsMutation();

  const recommendedQuestionsTask = useMemo(
    () =>
      recommendationQuestionsResult.data?.getProjectRecommendationQuestions ||
      null,
    [recommendationQuestionsResult.data],
  );

  useEffect(() => {
    const fetchRecommendationQuestionsData = async () => {
      const result = await fetchRecommendationQuestions();
      const data = result.data?.getProjectRecommendationQuestions;

      // for existing projects that do not have to generate recommended questions yet
      if (isRecommendedFinished(data.status)) {
        if (data.questions.length > 0) {
          // for regenerate then leave and go back to the home page
          setRecommendedQuestions(getGroupedQuestions(data.questions));

          setShowRecommendedQuestionsPromptMode(true);
        }
      }
    };

    fetchRecommendationQuestionsData();
  }, []);

  useEffect(() => {
    if (isRecommendedFinished(recommendedQuestionsTask?.status)) {
      recommendationQuestionsResult.stopPolling();

      if (recommendedQuestionsTask.questions.length === 0) {
        isRegenerate && setShowRetry(true);

        if (
          showRecommendedQuestionsPromptMode &&
          recommendedQuestionsTask.status ===
            RecommendedQuestionsTaskStatus.FAILED
        ) {
          message.error(
            `Não conseguimos regenerar as perguntas agora. Tente novamente mais tarde.`,
          );
        }
      } else {
        setIsRegenerate(true);

        // update to recommendedQuestions
        setRecommendedQuestions(
          getGroupedQuestions(recommendedQuestionsTask.questions),
        );
        setShowRecommendedQuestionsPromptMode(true);
      }

      setGenerating(false);
    }
  }, [recommendedQuestionsTask]);

  const onGetRecommendationQuestions = async () => {
    setGenerating(true);
    setIsRegenerate(true);
    try {
      await generateProjectRecommendationQuestions();
      fetchRecommendationQuestions();
    } catch (error) {
      console.error(error);
    }
  };

  const buttonProps = useMemo(() => {
    const baseProps = {
      loading: generating,
      onClick: onGetRecommendationQuestions,
    };

    if (showRecommendedQuestionsPromptMode && isRegenerate) {
      return {
        ...baseProps,
        icon: <ReloadOutlined />,
        children: 'Gerar novas perguntas',
      };
    }

    return {
      ...baseProps,
      icon: showRetry ? (
        <ReloadOutlined />
      ) : (
        <Icon component={CopilotSVG} className="geekblue-6" />
      ),
      children: generating
        ? 'Gerando perguntas...'
        : showRetry
          ? 'Tentar novamente'
          : 'O que posso perguntar?',
    };
  }, [generating, isRegenerate, showRetry, showRecommendedQuestionsPromptMode]);

  // When the LLM hasn't produced suggestions yet, surface a curated set so the
  // demo always has actionable starting points (instead of an empty button).
  const effectiveQuestions =
    recommendedQuestions.length > 0
      ? recommendedQuestions
      : NUCLEAI_FALLBACK_QUESTIONS;
  const effectivePromptMode =
    showRecommendedQuestionsPromptMode || recommendedQuestions.length === 0;

  return {
    recommendedQuestions: effectiveQuestions,
    generating,
    showRetry,
    showRecommendedQuestionsPromptMode: effectivePromptMode,
    buttonProps,
  };
}
