import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, Form, Input, Radio, Upload, UploadProps, message } from 'antd';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import { ERROR_TEXTS } from '@/utils/error';
import { FORM_MODE } from '@/utils/enum';
import { readFileContent, extractPrivateKeyString } from '@/utils/file';

const TAB_KEY = {
  PASSWORD_AUTHENTICATION: 'password_authentication',
  KEY_PAIR_AUTHENTICATION: 'key_pair_authentication',
};

interface Props {
  mode?: FORM_MODE;
}

const UploadPrivateKey = (props: {
  onChange?: (value: string) => void;
  value?: string;
}) => {
  const { onChange, value } = props;
  const [fileList, setFileList] = useState<UploadProps['fileList']>([]);

  useEffect(() => {
    if (!value) setFileList([]);
  }, [value]);

  const onUploadChange = async (info) => {
    const { file, fileList } = info;
    if (fileList.length) {
      const uploadFile = fileList[0];

      try {
        const result = await readFileContent(file.originFileObj);
        const extractedPrivateKey = extractPrivateKeyString(result);
        onChange && onChange(extractedPrivateKey);
        setFileList([uploadFile]);
      } catch (error) {
        console.error('Falha ao processar o arquivo', error);
        message.error(
          'Falha ao processar o arquivo. Envie um arquivo de chave privada válido.',
        );
      }
    }
  };

  const onRemove = () => {
    setFileList([]);
    onChange && onChange(undefined);
  };

  return (
    <Upload
      accept=".pem,.key,.p8"
      fileList={fileList}
      onChange={onUploadChange}
      onRemove={onRemove}
      maxCount={1}
    >
      <Button icon={<UploadOutlined />}>Enviar chave privada</Button>
    </Upload>
  );
};

export default function SnowflakeProperties(props: Props) {
  const { mode } = props;
  const isEditMode = mode === FORM_MODE.EDIT;
  const [tabKey, setTabKey] = useState(TAB_KEY.PASSWORD_AUTHENTICATION);

  const changeTabKey = (e) => {
    setTabKey(e.target.value);
  };

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
        label="Conta"
        name="account"
        required
        rules={[
          {
            required: true,
            message: ERROR_TEXTS.CONNECTION.ACCOUNT.REQUIRED,
          },
        ]}
      >
        <Input
          placeholder="<snowflake_org_id>-<snowflake_user_id>"
          disabled={isEditMode}
        />
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
        <Input placeholder="Nome do banco Snowflake" disabled={isEditMode} />
      </Form.Item>
      <Form.Item
        label="Schema"
        name="schema"
        required
        rules={[
          {
            required: true,
            message: ERROR_TEXTS.CONNECTION.SCHEMA.REQUIRED,
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Warehouse"
        name="warehouse"
        extra={
          <span className="gray-6">
            Define o warehouse virtual para execução das consultas. Se ficar em
            branco, será usado o warehouse padrão da conta, se houver.
          </span>
        }
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Usuário"
        name="user"
        rules={[
          {
            required: true,
            message: ERROR_TEXTS.CONNECTION.USER.REQUIRED,
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label={
          <div>
            Método de autenticação
            <div className="gray-6">
              A autenticação por usuário e senha será{' '}
              <span className="gray-7">descontinuada em novembro de 2025</span>.
              Recomendamos migrar para autenticação com par de chaves.{' '}
              <Link
                className="gray-7 underline"
                href="https://www.snowflake.com/en/blog/blocking-single-factor-password-authentification"
                target="_blank"
                rel="noreferrer noopener"
              >
                Saiba mais
              </Link>
            </div>
          </div>
        }
      >
        <Radio.Group value={tabKey} onChange={changeTabKey} buttonStyle="solid">
          <Radio.Button value={TAB_KEY.PASSWORD_AUTHENTICATION}>
            Autenticação por senha
          </Radio.Button>
          <Radio.Button value={TAB_KEY.KEY_PAIR_AUTHENTICATION}>
            Autenticação com par de chaves
          </Radio.Button>
        </Radio.Group>
      </Form.Item>

      <div>
        {tabKey === TAB_KEY.PASSWORD_AUTHENTICATION && (
          <Form.Item
            label="Senha"
            name="password"
            required
            rules={[
              {
                required: true,
                message: ERROR_TEXTS.CONNECTION.PASSWORD.REQUIRED,
              },
            ]}
          >
            <Input.Password placeholder="Digite a senha" />
          </Form.Item>
        )}
        {tabKey === TAB_KEY.KEY_PAIR_AUTHENTICATION && (
          <Form.Item
            label="Arquivo de chave privada"
            name="privateKey"
            required
            rules={[
              {
                required: !isEditMode,
                message: ERROR_TEXTS.CONNECTION.PRIVATE_KEY_FILE.REQUIRED,
              },
            ]}
            extra={
              <div className="gray-6">
                Envie seu arquivo de chave privada para autenticação com par de chaves.
              </div>
            }
          >
            <UploadPrivateKey />
          </Form.Item>
        )}
      </div>
    </>
  );
}
