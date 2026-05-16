import { Row, Col } from 'antd';
import styled from 'styled-components';
import { makeIterable } from '@/utils/iteration';
import EllipsisWrapper from '@/components/EllipsisWrapper';
import { useI18n } from '@/i18n/useI18n';

const DemoBlock = styled.div`
  user-select: none;
  height: 150px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 10px !important;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(60, 174, 130, 0.12);
    border-color: var(--geekblue-5) !important;
    box-shadow: 0 0 0 1px var(--geekblue-5), 0 4px 20px rgba(60, 174, 130, 0.2);
    transform: translateY(-2px);
  }
`;

const CategoryLabel = styled.div`
  background: rgba(60, 174, 130, 0.2);
  border: 1px solid var(--geekblue-5);
  color: var(--geekblue-3);
  border-radius: 999px;
  padding: 0 8px;
  font-size: 12px;
`;

const QuestionText = styled.div`
  color: var(--gray-3);
  font-size: 13px;
  line-height: 1.5;
`;

interface Props {
  demo: any[];
  onSelect: (data: { label: string; question: string }) => void;
}

const DemoTemplate = ({ label, question, onSelect }) => {
  return (
    <Col span={8}>
      <DemoBlock
        className="px-3 pt-3 pb-4 cursor-pointer"
        onClick={() => onSelect({ label, question })}
      >
        <div className="d-flex justify-space-between align-center text-sm mb-3">
          <CategoryLabel>{label}</CategoryLabel>
        </div>
        <QuestionText>
          <EllipsisWrapper multipleLine={4} text={question} />
        </QuestionText>
      </DemoBlock>
    </Col>
  );
};

const DemoColumnIterator = makeIterable(DemoTemplate);

export default function DemoPrompt(props: Props) {
  const { demo, onSelect } = props;
  const { t } = useI18n();
  return (
    <div style={{ width: 620 }}>
      <div
        className="text-center mt-3 mb-2"
        style={{ color: 'var(--gray-6)', fontSize: '13px' }}
      >
        {t('demoPrompt.tryAsking')}
      </div>
      <Row gutter={16}>
        <DemoColumnIterator data={demo} onSelect={onSelect} />
      </Row>
    </div>
  );
}
