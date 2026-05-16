import { capitalize } from 'lodash';
import { Form, Row, Col, Select } from 'antd';
import { ChartType } from '@/apollo/client/graphql/__types__';

export const getChartTypeOptions = () => {
  return Object.entries(ChartType).map(([key, value]) => ({
    label: capitalize(value.replace('_', ' ')),
    value: key,
  }));
};

export const getColumnOptions = (
  columns: { name: string; type: string }[],
  titleMap?: Record<string, string>,
) => {
  return (columns || []).map((column) => ({
    label: titleMap?.[column.name] || column.name,
    value: column.name,
  }));
};

export function ChartTypeProperty(props: {
  options: { label: string; value: string }[];
}) {
  const { options } = props;
  return (
    <Form.Item className="mb-0" label="Tipo de gráfico" name="chartType" preserve>
      <Select size="small" options={options} placeholder="Selecione o tipo de gráfico" />
    </Form.Item>
  );
}

export function AxisProperty(props: {
  options: { label: string; value: string }[];
}) {
  const { options } = props;
  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item className="mb-0" label="Eixo X" name="xAxis" preserve>
          <Select size="small" options={options} placeholder="Selecione o eixo X" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item className="mb-0" label="Eixo Y" name="yAxis" preserve>
          <Select size="small" options={options} placeholder="Selecione o eixo Y" />
        </Form.Item>
      </Col>
    </Row>
  );
}

export interface PropertiesProps {
  columns: { name: string; type: string }[];
  titleMap: Record<string, string>;
  onChartTypeChange: (chartType: ChartType) => void;
}

export default function BasicProperties(props: PropertiesProps) {
  const { columns, titleMap } = props;
  const chartTypeOptions = getChartTypeOptions();
  const columnOptions = getColumnOptions(columns, titleMap);
  return (
    <>
      <Row className="mb-2" gutter={16}>
        <Col span={12}>
          <ChartTypeProperty options={chartTypeOptions} />
        </Col>
        <Col span={12}></Col>
      </Row>
      <AxisProperty options={columnOptions} />
    </>
  );
}
