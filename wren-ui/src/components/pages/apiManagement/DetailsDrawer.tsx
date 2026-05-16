import styled from 'styled-components';
import { Drawer, Typography, Row, Col, Tag } from 'antd';
import { getAbsoluteTime } from '@/utils/time';
import { DrawerAction } from '@/hooks/useDrawerAction';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import JsonCodeBlock from '@/components/code/JsonCodeBlock';
import { ApiHistoryResponse } from '@/apollo/client/graphql/__types__';

const Label = styled(Typography.Text)`
  display: block;
  color: var(--gray-6) !important;
  font-size: 12px;
  margin-bottom: 6px;
`;

const Value = styled.div`
  color: var(--gray-4);
  font-size: 13px;
`;

type Props = DrawerAction<ApiHistoryResponse> & {
  loading?: boolean;
};

export default function DetailsDrawer(props: Props) {
  const { visible, onClose, defaultValue } = props;

  const {
    threadId,
    apiType,
    createdAt,
    durationMs,
    statusCode,
    headers,
    requestPayload,
    responsePayload,
  } = defaultValue || {};

  const getStatusTag = (status: number) => {
    const isSuccess = status >= 200 && status < 300;
    return (
      <Tag
        icon={isSuccess ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
        color={isSuccess ? 'success' : 'error'}
      >
        {status}
      </Tag>
    );
  };

  return (
    <Drawer
      visible={visible}
      title="Detalhes da API"
      width={760}
      closable
      destroyOnClose
      onClose={onClose}
      footer={null}
    >
      <Row className="mb-6">
        <Col span={12}>
          <Label>Tipo da API</Label>
          <Value>
            <Tag style={{ color: 'var(--gray-4)', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}>
              {apiType?.toLowerCase()}
            </Tag>
          </Value>
        </Col>
        <Col span={12}>
          <Label>ID da thread</Label>
          <Value>{threadId || '-'}</Value>
        </Col>
      </Row>
      <Row className="mb-6">
        <Col span={12}>
          <Label>Criado em</Label>
          <Value>{getAbsoluteTime(createdAt)}</Value>
        </Col>
        <Col span={12}>
          <Label>Duração</Label>
          <Value>{durationMs} ms</Value>
        </Col>
      </Row>
      <Row className="mb-6">
        <Col span={12}>
          <Label>Código de status</Label>
          <Value>{getStatusTag(statusCode)}</Value>
        </Col>
      </Row>

      <div className="mb-6">
        <Label>Cabeçalhos</Label>
        <JsonCodeBlock code={headers} maxHeight="400" copyable />
      </div>

      <div className="mb-6">
        <Label>Corpo da requisição</Label>
        <JsonCodeBlock code={requestPayload} maxHeight="400" copyable />
      </div>

      <div className="mb-6">
        <Label>Corpo da resposta</Label>
        <JsonCodeBlock code={responsePayload} maxHeight="400" copyable />
      </div>
    </Drawer>
  );
}
