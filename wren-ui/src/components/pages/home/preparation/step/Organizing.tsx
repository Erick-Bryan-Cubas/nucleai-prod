import { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import MarkdownBlock from '@/components/editor/MarkdownBlock';
import { Spinner } from '@/components/PageLoading';

interface Props {
  stream: string;
  loading?: boolean;
  isAdjustment?: boolean;
}

export default function Organizing(props: Props) {
  const $wrapper = useRef<HTMLDivElement>(null);
  const { stream, loading, isAdjustment } = props;

  const isDone = stream && !loading;

  const scrollBottom = () => {
    if ($wrapper.current) {
      $wrapper.current.scrollTo({
        top: $wrapper.current.scrollHeight,
      });
    }
  };

  useEffect(() => {
    scrollBottom();
  }, [stream]);

  useEffect(() => {
    if (isDone) scrollBottom();
  }, [isDone]);

  const title = isAdjustment
    ? 'Etapas de raciocínio fornecidas pelo usuário aplicadas'
    : 'Organizando raciocínio';

  return (
    <>
      <Typography.Text style={{ color: 'var(--gray-4)' }}>{title}</Typography.Text>
      <div
        ref={$wrapper}
        className="text-sm mt-2"
        style={{ color: 'var(--gray-6)', maxHeight: 'calc(100vh - 550px)', overflowY: 'auto' }}
      >
        {loading && !stream ? (
          <div className="d-flex align-center gx-2">
            Pensando
            <Spinner className="gray-6" size={12} />
          </div>
        ) : (
          <MarkdownBlock content={stream} />
        )}
      </div>
    </>
  );
}
