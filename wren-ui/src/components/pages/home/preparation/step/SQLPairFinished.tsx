import { Typography } from 'antd';

export default function SQLPairFinished() {
  return (
    <>
      <Typography.Text style={{ color: 'var(--gray-4)' }}>
        Usando par Pergunta-SQL
      </Typography.Text>
      <div className="text-sm mt-1" style={{ color: 'var(--gray-6)' }}>
        <div>
          Par Pergunta-SQL correspondente encontrado. Retornando resultados instantaneamente.
        </div>
      </div>
    </>
  );
}
