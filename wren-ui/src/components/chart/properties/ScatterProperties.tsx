import { Form, Row, Col, Select } from 'antd';
import {
  PropertiesProps,
  getChartTypeOptions,
  getColumnOptions,
  ChartTypeProperty,
} from './BasicProperties';

export default function ScatterProperties(props: PropertiesProps) {
  const { columns, titleMap } = props;
  const chartTypeOptions = getChartTypeOptions();
  const columnOptions = getColumnOptions(columns, titleMap);
  return (
    <>
      <Row className="mb-2" gutter={16}>
        <Col span={12}>
          <ChartTypeProperty options={chartTypeOptions} />
        </Col>
        <Col span={12}>
          <Form.Item className="mb-0" label="Cor / Categoria" name="color" preserve>
            <Select
              size="small"
              options={columnOptions}
              placeholder="Selecione a categoria"
              allowClear
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item className="mb-0" label="Eixo X" name="xAxis" preserve>
            <Select size="small" options={columnOptions} placeholder="Selecione o eixo X" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item className="mb-0" label="Eixo Y" name="yAxis" preserve>
            <Select size="small" options={columnOptions} placeholder="Selecione o eixo Y" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
