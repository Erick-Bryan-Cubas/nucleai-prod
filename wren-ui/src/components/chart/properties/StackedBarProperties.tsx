import { Form, Row, Col, Select } from 'antd';
import {
  PropertiesProps,
  getChartTypeOptions,
  getColumnOptions,
  ChartTypeProperty,
  AxisProperty,
} from './BasicProperties';

export default function StackedBarProperties(props: PropertiesProps) {
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
          <Form.Item className="mb-0" label="Grupos empilhados" name="color" preserve>
            <Select
              size="small"
              options={columnOptions}
              placeholder="Selecione os grupos"
            />
          </Form.Item>
        </Col>
      </Row>
      <AxisProperty options={columnOptions} />
    </>
  );
}
