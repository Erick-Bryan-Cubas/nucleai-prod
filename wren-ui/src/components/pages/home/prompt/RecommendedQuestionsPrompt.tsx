import { useState, useMemo } from 'react';
import clsx from 'clsx';
import styled from 'styled-components';
import { Button, Row, Col } from 'antd';
import ColumnHeightOutlined from '@ant-design/icons/ColumnHeightOutlined';
import MinusOutlined from '@ant-design/icons/MinusOutlined';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import { Logo } from '@/components/Logo';
import { makeIterable } from '@/utils/iteration';
import { GroupedQuestion } from '@/hooks/useRecommendedQuestionsInstruction';
import { useI18n } from '@/i18n/useI18n';
import { groupBy } from 'lodash';

const MAX_EXPANDED_QUESTIONS = 9;

const Wrapper = styled.div`
  width: 720px;
  padding: 0 0 24px 0;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 28px;
`;

const HeaderTitle = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-2);
  margin-top: 4px;
`;

const HeaderSubtitle = styled.span`
  font-size: 13px;
  color: var(--gray-5);
`;

const CategoryLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--gray-5);
  margin-bottom: 10px;
`;

const CategorySection = styled.div`
  margin-bottom: 20px;
`;

const QuestionBlock = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 14px;
  height: 100%;
  min-height: 80px;
  transition: border-color 0.18s ease, background 0.18s ease;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 10px;

  &:hover:not(.is-disabled) {
    border-color: var(--geekblue-5);
    background: rgba(60, 174, 130, 0.08);
  }

  &.is-active {
    border-color: var(--geekblue-5);
    background: rgba(60, 174, 130, 0.1);
  }

  &.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const QuestionText = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--gray-2);
  flex: 1;
`;

const SpinnerWrapper = styled.div`
  flex-shrink: 0;
  color: var(--geekblue-5);
  margin-top: 2px;
`;

interface Props {
  onSelect: (payload: { sql: string; question: string }) => void;
  recommendedQuestions: GroupedQuestion[];
  loading: boolean;
}

const QuestionCard = ({
  category,
  sql,
  question,
  onSelect,
  loading,
  selectedQuestion,
}) => {
  const isSelected = selectedQuestion === question;
  const isDisabled = loading && !isSelected;

  const onClick = () => {
    if (loading) return;
    onSelect({ sql, question });
  };

  return (
    <Col span={12}>
      <QuestionBlock
        className={clsx({
          'is-active': isSelected,
          'is-disabled': isDisabled,
        })}
        onClick={onClick}
        title={question}
      >
        <QuestionText>{question}</QuestionText>
        {isSelected && loading && (
          <SpinnerWrapper>
            <LoadingOutlined />
          </SpinnerWrapper>
        )}
      </QuestionBlock>
    </Col>
  );
};

const QuestionCardIterator = makeIterable(QuestionCard);

export default function RecommendedQuestionsPrompt(props: Props) {
  const { onSelect, recommendedQuestions, loading } = props;
  const { t } = useI18n();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');

  const questionList = useMemo(
    () => recommendedQuestions.slice(0, isExpanded ? undefined : MAX_EXPANDED_QUESTIONS),
    [recommendedQuestions, isExpanded],
  );

  const grouped = useMemo(
    () => groupBy(questionList, 'category'),
    [questionList],
  );

  const showExpandButton = recommendedQuestions.length > MAX_EXPANDED_QUESTIONS;

  const onSelectQuestion = (payload: { sql: string; question: string }) => {
    onSelect(payload);
    setSelectedQuestion(payload.question);
  };

  return (
    <Wrapper>
      <Header>
        <Logo size={120} color="var(--geekblue-4)" />
        <HeaderTitle>{t('recommendedQuestions.title')}</HeaderTitle>
        <HeaderSubtitle>{t('recommendedQuestions.subtitle')}</HeaderSubtitle>
      </Header>

      {Object.entries(grouped).map(([category, questions]) => (
        <CategorySection key={category}>
          <CategoryLabel>{category}</CategoryLabel>
          <Row gutter={[12, 12]}>
            <QuestionCardIterator
              data={questions}
              onSelect={onSelectQuestion}
              loading={loading}
              selectedQuestion={selectedQuestion}
            />
          </Row>
        </CategorySection>
      ))}

      {showExpandButton && (
        <div className="text-right" style={{ marginTop: 4 }}>
          <Button
            onClick={() => setIsExpanded((prev) => !prev)}
            type="text"
            size="small"
            style={{ color: 'var(--gray-5)' }}
            icon={isExpanded ? <MinusOutlined /> : <ColumnHeightOutlined />}
          >
            {isExpanded
              ? t('recommendedQuestions.collapse')
              : t('recommendedQuestions.expandAll')}
          </Button>
        </div>
      )}
    </Wrapper>
  );
}
