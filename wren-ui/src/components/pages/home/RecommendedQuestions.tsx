import clsx from 'clsx';
import styled from 'styled-components';
import { useMemo, useState } from 'react';
import { Skeleton } from 'antd';
import BulbOutlined from '@ant-design/icons/BulbOutlined';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import { makeIterable } from '@/utils/iteration';
import {
  RecommendedQuestionsTask,
  RecommendedQuestionsTaskStatus,
} from '@/apollo/client/graphql/__types__';

export interface SelectQuestionProps {
  question: string;
  sql: string;
}

interface Props {
  items: { question: string; sql: string }[];
  loading?: boolean;
  error?: {
    shortMessage?: string;
    code?: string;
    message?: string;
    stacktrace?: string[];
  };
  className?: string;
  onSelect: ({ question, sql }: SelectQuestionProps) => void | Promise<void>;
}

const StyledSkeleton = styled(Skeleton)`
  padding: 4px 0;
  .ant-skeleton-paragraph {
    margin-bottom: 0;
    li {
      height: 14px;
      + li {
        margin-top: 12px;
      }
    }
  }
`;

export const getRecommendedQuestionProps = (
  data: RecommendedQuestionsTask,
  show = true,
) => {
  if (!data || !show) return { show: false };
  const questions = (data?.questions || []).slice(0, 3).map((item) => ({
    question: item.question,
    sql: item.sql,
  }));
  const loading = data?.status === RecommendedQuestionsTaskStatus.GENERATING;
  return {
    show: loading || questions.length > 0,
    state: {
      items: questions,
      loading,
      error: data?.error,
    },
  };
};

const QuestionItem = (props: {
  index: number;
  question: string;
  sql: string;
  selectedQuestion: string;
  isPending: boolean;
  onSelect: ({ question, sql }: SelectQuestionProps) => void | Promise<void>;
}) => {
  const { index, question, sql, selectedQuestion, isPending, onSelect } = props;
  const isSelected = selectedQuestion === question;
  const isDisabled = isPending && !isSelected;

  return (
    <div className={clsx(index > 0 && 'mt-1')}>
      <span
        className={clsx(
          'cursor-pointer hover:text d-inline-flex align-center',
        )}
        style={
          isDisabled
            ? { cursor: 'not-allowed', color: 'var(--gray-7)' }
            : undefined
        }
        onClick={() => {
          if (isPending) return;
          onSelect({ question, sql });
        }}
      >
        {question}
        {isSelected && isPending && (
          <LoadingOutlined className="ml-2 geekblue-5" spin />
        )}
      </span>
    </div>
  );
};
const QuestionList = makeIterable(QuestionItem);

export default function RecommendedQuestions(props: Props) {
  const { items, loading, className, onSelect } = props;
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [isPending, setIsPending] = useState<boolean>(false);

  const data = useMemo(
    () => items.map(({ question, sql }) => ({ question, sql })),
    [items],
  );

  const handleSelect = async (payload: SelectQuestionProps) => {
    setSelectedQuestion(payload.question);
    setIsPending(true);
    try {
      await onSelect(payload);
    } finally {
      // Reset the spinner after the parent had time to navigate / re-render.
      // The component will usually unmount before this fires, but resetting
      // protects against the parent swallowing the click without unmounting.
      setTimeout(() => setIsPending(false), 1500);
    }
  };

  return (
    <div className={clsx('bg-gray-9 rounded p-3', className)}>
      <div className="mb-2">
        <BulbOutlined className="mr-1 gray-6" />
        <b className="text-semi-bold text-sm gray-5">Perguntas recomendadas</b>
      </div>
      <div className="pl-1 gray-4">
        <StyledSkeleton
          active
          loading={loading}
          paragraph={{ rows: 3 }}
          title={false}
        >
          <QuestionList
            data={data}
            onSelect={handleSelect}
            selectedQuestion={selectedQuestion}
            isPending={isPending}
          />
        </StyledSkeleton>
      </div>
    </div>
  );
}
