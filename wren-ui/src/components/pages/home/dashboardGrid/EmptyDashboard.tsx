import Link from 'next/link';
import Image from 'next/image';
import { Row, Col } from 'antd';
import { Logo } from '@/components/Logo';
import { makeIterable } from '@/utils/iteration';
import { useI18n } from '@/i18n/useI18n';

const StepTemplate = (props: { title: string; image: string }) => {
  return (
    <Col>
      <div
        className="p-3 rounded"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div className="mb-2">
          <span
            className="d-inline-block rounded-pill text-sm px-2"
            style={{
              lineHeight: '22px',
              background: 'rgba(60, 174, 130, 0.2)',
              color: 'var(--geekblue-3)',
              border: '1px solid rgba(60, 174, 130, 0.4)',
            }}
          >
            {props.title}
          </span>
        </div>
        <Image
          className="rounded"
          style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}
          src={props.image}
          width={160}
          height={80}
          alt={props.title}
        />
      </div>
    </Col>
  );
};

const StepIterator = makeIterable(StepTemplate);

const EmptyDashboard = (props: {
  show: boolean;
  children: React.ReactNode;
}) => {
  const { show, children } = props;
  const { t } = useI18n();

  if (show) {
    return (
      <div
        className="d-flex align-center justify-center flex-column -mt-8"
        style={{ height: '100%' }}
      >
        <Logo size={150} color="var(--geekblue-4)" />
        <div className="text-lg text-medium text-center mt-3" style={{ color: 'var(--gray-2)' }}>
          {t('emptyDashboard.noCharts')}
        </div>
        <div style={{ color: 'var(--gray-6)' }}>
          {t('emptyDashboard.stepsDescription')}{' '}
          <Link
            style={{ color: 'var(--geekblue-4)', textDecoration: 'underline' }}
            href="https://docs.getwren.ai/oss/guide/home/dashboard"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t('common.learnMore')}
          </Link>
        </div>
        <Row className="mt-4" gutter={[16, 16]}>
          <StepIterator
            data={[
              {
                title: t('emptyDashboard.step1'),
                image: '/images/dashboard/s1.jpg',
              },
              {
                title: t('emptyDashboard.step2'),
                image: '/images/dashboard/s2.jpg',
              },
              {
                title: t('emptyDashboard.step3'),
                image: '/images/dashboard/s3.jpg',
              },
            ]}
          />
        </Row>
      </div>
    );
  }
  return <>{children}</>;
};

export default EmptyDashboard;
