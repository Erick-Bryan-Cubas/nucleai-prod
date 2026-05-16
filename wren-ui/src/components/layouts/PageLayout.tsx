import { Typography } from 'antd';

interface PageLayoutProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  children: React.ReactNode;
  titleExtra?: string | React.ReactNode;
}

export default function PageLayout(props: PageLayoutProps) {
  const { title, titleExtra, description, children } = props;
  return (
    <div className="px-6 py-4">
      <div className="d-flex align-center justify-space-between mb-3">
        <Typography.Title
          level={4}
          className="text-medium mb-0"
          style={{ color: 'var(--gray-3)' }}
        >
          {title}
        </Typography.Title>
        {titleExtra}
      </div>
      {description && (
        <Typography.Text style={{ color: 'var(--gray-6)' }}>
          {description}
        </Typography.Text>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}
