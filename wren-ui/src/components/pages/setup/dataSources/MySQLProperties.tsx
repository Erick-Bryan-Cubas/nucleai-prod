import { Form, Input, Switch } from 'antd';
import { ERROR_TEXTS } from '@/utils/error';
import { FORM_MODE } from '@/utils/enum';
import { hostValidator } from '@/utils/validator';

interface Props {
  mode?: FORM_MODE;
}

export default function MySQLProperties(props: Props) {
  const { mode } = props;
  const isEditMode = mode === FORM_MODE.EDIT;
  return (
    <>
      <Form.Item
        label="Nome de exibição"
        name="displayName"
        required
        rules={[
          {
            required: true,
            message: ERROR_TEXTS.CONNECTION.DISPLAY_NAME.REQUIRED,
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Host"
        name="host"
        required
        rules={[
          {
            required: true,
            validator: hostValidator,
          },
        ]}
      >
        <Input placeholder="10.1.1.1" disabled={isEditMode} />
      </Form.Item>
      <Form.Item
        label="Porta"
        name="port"
        required
        rules={[
          {
            required: true,
            message: ERROR_TEXTS.CONNECTION.PORT.REQUIRED,
          },
        ]}
      >
        <Input placeholder="3306" disabled={isEditMode} />
      </Form.Item>
      <Form.Item
        label="Usuário"
        name="user"
        rules={[
          {
            required: true,
            message: ERROR_TEXTS.CONNECTION.USERNAME.REQUIRED,
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="Senha" name="password">
        <Input.Password placeholder="Digite a senha" />
      </Form.Item>
      <Form.Item
        label="Nome do banco de dados"
        name="database"
        required
        rules={[
          {
            required: true,
            message: ERROR_TEXTS.CONNECTION.DATABASE.REQUIRED,
          },
        ]}
      >
        <Input placeholder="Nome do banco MySQL" disabled={isEditMode} />
      </Form.Item>
      <Form.Item label="Usar SSL" name="ssl" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );
}
