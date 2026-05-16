import styled from 'styled-components';
import { Card, Steps } from 'antd';

const Container = styled.div<{ maxWidth?: number }>`
  max-width: ${(props) => props.maxWidth || 960}px;
  margin: 68px auto;
`;

interface Props {
  step: number;
  children: React.ReactNode;
  maxWidth?: number;
}

const StyledCard = styled(Card)`
  background-color: #16171b;
  border-color: #2b2e38;
  box-shadow: 0 20px 40px rgba(0,0,0,0.6);
  border-radius: 8px;
  
  .ant-typography,
  .ant-steps-item-title,
  .ant-form-item-label > label {
    color: var(--gray-4) !important;
  }
  
  .ant-steps-item-process .ant-steps-item-title {
    color: var(--gray-1) !important;
  }

  /* Make inactive steps less bright */
  .ant-steps-item-wait .ant-steps-item-icon {
    background-color: rgba(255, 255, 255, 0.05) !important;
    border-color: #2b2e38 !important;
  }
  .ant-steps-item-wait .ant-steps-item-icon > .ant-steps-icon {
    color: var(--gray-5) !important;
  }

  /* Emphasize active step */
  .ant-steps-item-process .ant-steps-item-icon {
    background-color: var(--geekblue-6) !important;
    border-color: var(--geekblue-6) !important;
    box-shadow: 0 0 10px rgba(24, 144, 255, 0.5);
  }
`;

export default function ContainerCard(props: Props) {
  const { step, maxWidth } = props;

  return (
    <Container maxWidth={maxWidth}>
      <StyledCard>
        <Steps current={step} className="mb-12">
          <Steps.Step title="Conectar" />
          <Steps.Step title="Selecionar tabelas" />
          <Steps.Step title="Definir relacionamentos" />
        </Steps>
        <div className="px-12 pb-6">{props.children}</div>
      </StyledCard>
    </Container>
  );
}
