import { Typography } from 'antd';
import { Spinner } from '@/components/PageLoading';

interface Props {
  generating?: boolean;
  correcting?: boolean;
  loading?: boolean;
}

export default function Generating(props: Props) {
  const { loading, generating, correcting } = props;

  return (
    <>
      <Typography.Text style={{ color: 'var(--gray-4)' }}>
        Gerando instrução SQL
      </Typography.Text>
      <div className="text-sm mt-1" style={{ color: 'var(--gray-6)' }}>
        {generating || correcting ? (
          <div className="d-flex align-center gx-2">
            {correcting ? 'Corrigindo instrução SQL' : 'Gerando'}
            <Spinner className="gray-6" size={12} />
          </div>
        ) : (
          <>
            <div>Instrução SQL gerada com sucesso</div>
            {loading && (
              <div className="d-flex align-center gx-2 mt-1">
                Finalizando <Spinner className="gray-6" size={16} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
