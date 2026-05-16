import { Typography, Tag } from 'antd';
import { makeIterable } from '@/utils/iteration';
import { Spinner } from '@/components/PageLoading';

interface Props {
  tables: string[];
  loading?: boolean;
  isAdjustment?: boolean;
}

const TagTemplate = ({ name }: { name: string }) => {
  return <Tag className="mb-2" style={{ color: 'var(--gray-5)', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}>{name}</Tag>;
};

const TagIterator = makeIterable(TagTemplate);

export default function Retrieving(props: Props) {
  const { tables, loading, isAdjustment } = props;

  const data = tables.map((table) => ({ name: table }));

  const title = isAdjustment
    ? 'Modelos selecionados pelo usuário aplicados'
    : 'Recuperando os 10 principais modelos candidatos';

  const modelDescription = isAdjustment ? (
    <>{tables.length} modelos aplicados</>
  ) : (
    <>Top {tables.length} modelos candidatos identificados</>
  );

  return (
    <>
      <Typography.Text style={{ color: 'var(--gray-4)' }}>{title}</Typography.Text>
      <div className="text-sm mt-1" style={{ color: 'var(--gray-6)' }}>
        {loading ? (
          <div className="d-flex align-center gx-2">
            Buscando
            <Spinner className="gray-6" size={12} />
          </div>
        ) : (
          <>
            <div className="mb-1">{modelDescription}</div>
            <TagIterator data={data} />
          </>
        )}
      </div>
    </>
  );
}
