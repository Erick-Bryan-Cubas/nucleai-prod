import Image from 'next/image';
import { Alert, Typography, Form, Row, Col, Button } from 'antd';
import styled from 'styled-components';
import { DATA_SOURCES } from '@/utils/enum/dataSources';
import { getDataSource, getPostgresErrorMessage } from './utils';
import { useI18n } from '@/i18n/useI18n';

const StyledForm = styled(Form)`
  border: 1px var(--gray-4) solid;
  border-radius: 4px;
`;

const DataSource = styled.div`
  border: 1px var(--gray-4) solid;
  border-radius: 4px;
`;

interface Props {
  dataSource: DATA_SOURCES;
  onNext: (data: any) => void;
  onBack: () => void;
  submitting: boolean;
  connectError?: Record<string, any>;
}

export default function ConnectDataSource(props: Props) {
  const { connectError, dataSource, submitting, onNext, onBack } = props;
  const [form] = Form.useForm();
  const { t } = useI18n();
  const current = getDataSource(dataSource);

  const submit = () => {
    form
      .validateFields()
      .then((values) => {
        onNext && onNext({ properties: values });
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <>
      <Typography.Title level={1} className="mb-3">
        {t('connectDataSource.title')}
      </Typography.Title>
      <StyledForm form={form} layout="vertical" className="p-6 my-6">
        <Row align="middle" className="mb-6">
          <Col span={12}>
            <DataSource className="d-inline-block px-4 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--gray-3)' }}>
              <Image
                className="mr-2"
                src={current.logo}
                alt={dataSource}
                width="40"
                height="40"
              />
              {current.label}
            </DataSource>
          </Col>
          <Col className="text-right" span={12}>
            {t('connectDataSource.setupGuideText', { label: current.label })}{' '}
            <a href={current.guide} target="_blank" rel="noopener noreferrer">
              {t('common.learnMore')}
            </a>
          </Col>
        </Row>
        <current.component />
      </StyledForm>

      {connectError && (
        <Alert
          message={connectError.shortMessage}
          description={
            dataSource === DATA_SOURCES.POSTGRES
              ? getPostgresErrorMessage(connectError)
              : connectError.message
          }
          type="error"
          showIcon
          className="my-6"
        />
      )}

      <Row gutter={16} className="pt-6">
        <Col span={12}>
          <Button
            onClick={onBack}
            size="large"
            className="adm-onboarding-btn"
            disabled={submitting}
          >
            {t('common.back')}
          </Button>
        </Col>
        <Col className="text-right" span={12}>
          <Button
            type="primary"
            size="large"
            onClick={submit}
            loading={submitting}
            className="adm-onboarding-btn"
          >
            {t('common.next')}
          </Button>
        </Col>
      </Row>
    </>
  );
}
