import { Button, Form, Input, Modal, Typography } from 'antd';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import { ModalAction } from '@/hooks/useModalAction';
import { createViewNameValidator } from '@/utils/validator';
import SQLCodeBlock from '@/components/code/SQLCodeBlock';
import { useValidateViewMutation } from '@/apollo/client/graphql/view.generated';

const { Text } = Typography;

type Props = ModalAction<{ sql: string }> & {
  loading?: boolean;
  defaultValue: { sql: string; responseId: number };
  payload: { rephrasedQuestion: string };
};

export default function SaveAsViewModal(props: Props) {
  const { visible, loading, onSubmit, onClose, defaultValue, payload } = props;
  const [form] = Form.useForm();
  const [validateViewMutation] = useValidateViewMutation({
    fetchPolicy: 'no-cache',
  });

  const submit = () => {
    form
      .validateFields()
      .then(async (values) => {
        await onSubmit({
          responseId: defaultValue.responseId,
          ...payload,
          ...values,
        });
        onClose();
      })
      .catch(console.error);
  };

  const sql = defaultValue ? defaultValue.sql : '';

  return (
    <Modal
      title="Salvar como View"
      centered
      closable
      destroyOnClose
      onCancel={onClose}
      maskClosable={false}
      visible={visible}
      width={600}
      afterClose={() => form.resetFields()}
      footer={
        <div className="d-flex justify-space-between align-center">
          <div
            className="d-flex justify-space-between align-center ml-2"
            style={{ width: 300 }}
          >
            <InfoCircleOutlined className="mr-2 text-sm" style={{ color: 'var(--gray-6)' }} />
            <Text className="text-sm text-left" style={{ color: 'var(--gray-6)' }}>
              Após salvar, acesse a "Página de Modelagem" para publicar todas as
              views salvas.
            </Text>
          </div>
          <div>
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="primary" onClick={submit} loading={loading}>
              Salvar
            </Button>
          </div>
        </div>
      }
    >
      <Form form={form} preserve={false} layout="vertical">
        <Form.Item
          label="Nome"
          name="name"
          required
          rules={[
            {
              required: true,
              validator: createViewNameValidator(validateViewMutation),
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Instrução SQL">
          <SQLCodeBlock code={sql} showLineNumbers maxHeight="300" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
