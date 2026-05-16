import Link from 'next/link';
import { Button } from 'antd';
import FileDoneOutlined from '@ant-design/icons/FileDoneOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import { Path } from '@/utils/enum';
import { ViewInfo } from '@/apollo/client/graphql/__types__';

interface Props {
  view?: ViewInfo;
  onClick: () => void;
}

export default function ViewBlock({ view, onClick }: Props) {
  const isViewSaved = !!view;

  if (isViewSaved) {
    return (
      <div className="text-medium" style={{ color: 'var(--gray-5)' }}>
        <FileDoneOutlined className="mr-2" />
        Gerada a partir da view salva{' '}
        <Link
          className="gray-7"
          href={`${Path.Modeling}?viewId=${view.id}&openMetadata=true`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {view.displayName}
        </Link>
      </div>
    );
  }

  return (
    <Button
      type="text"
      size="small"
      style={{ color: 'var(--gray-5)' }}
      icon={<SaveOutlined />}
      onClick={onClick}
    >
      Salvar como View
    </Button>
  );
}
