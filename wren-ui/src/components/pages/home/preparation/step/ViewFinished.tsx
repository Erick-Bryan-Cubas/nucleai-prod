import { Typography } from 'antd';

export default function ViewFinished() {
  return (
    <>
      <Typography.Text style={{ color: 'var(--gray-4)' }}>Usando view salva</Typography.Text>
      <div className="text-sm mt-1" style={{ color: 'var(--gray-6)' }}>
        <div>View salva correspondente encontrada. Retornando resultados instantaneamente.</div>
      </div>
    </>
  );
}
