import { Typography } from 'antd';

export default function FixedSQLFinished() {
  return (
    <>
      <Typography.Text style={{ color: 'var(--gray-4)' }}>
        SQL fornecido pelo usuário aplicado
      </Typography.Text>
      <div className="text-sm mt-1" style={{ color: 'var(--gray-6)' }}>
        O sistema encontrou um problema ao gerar SQL. A consulta enviada manualmente
        está sendo processada.
      </div>
    </>
  );
}
