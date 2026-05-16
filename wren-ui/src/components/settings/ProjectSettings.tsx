import { Button, Modal, Select, Row, Col, Form, message } from 'antd';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import { Path } from '@/utils/enum';
import {
  useResetCurrentProjectMutation,
  useUpdateCurrentProjectMutation,
} from '@/apollo/client/graphql/settings.generated';
import { getLanguageText } from '@/utils/language';
import { ProjectLanguage } from '@/apollo/client/graphql/__types__';

interface Props {
  data: { language: string };
}

const DangerSection = styled.div`
  margin-top: 28px;
`;

const DangerTitle = styled.div`
  color: var(--gray-6);
  margin-bottom: 10px;
`;

const DangerButton = styled(Button)`
  min-width: 112px;
  height: 40px !important;
  padding: 0 18px !important;
  border-radius: 12px !important;
`;

const DangerText = styled.div`
  color: var(--gray-6);
  margin-top: 10px;
  max-width: 720px;
  line-height: 1.6;
`;

export default function ProjectSettings(props: Props) {
  const { data } = props;
  const router = useRouter();
  const [form] = Form.useForm();
  const [resetCurrentProject, { client }] = useResetCurrentProjectMutation({
    onError: (error) => console.error(error),
  });
  const languageOptions = Object.keys(ProjectLanguage).map((key) => {
    return { label: getLanguageText(key as ProjectLanguage), value: key };
  });

  const [updateCurrentProject, { loading }] = useUpdateCurrentProjectMutation({
    refetchQueries: ['GetSettings'],
    onError: (error) => console.error(error),
    onCompleted: () => {
      message.success('Idioma do projeto atualizado com sucesso.');
    },
  });

  const reset = () => {
    Modal.confirm({
      title: 'Tem certeza que deseja redefinir o projeto?',
      okButtonProps: { danger: true },
      okText: 'Redefinir',
      onOk: async () => {
        await resetCurrentProject();
        client.clearStore();
        router.push(Path.OnboardingConnection);
      },
    });
  };

  const submit = () => {
    form
      .validateFields()
      .then((values) => {
        updateCurrentProject({ variables: { data: values } });
      })
      .catch((error) => console.error(error));
  };

  return (
    <div className="py-3 px-4">
      <Form
        form={form}
        layout="vertical"
        initialValues={{ language: data.language }}
      >
        <Form.Item
          label="Idioma do projeto"
          extra="Esta configuração afeta o idioma em que a IA responde a você."
        >
          <Row gutter={16} wrap={false}>
            <Col className="flex-grow-1">
              <Form.Item name="language" noStyle>
                <Select
                  placeholder="Selecione um idioma"
                  showSearch
                  options={languageOptions}
                />
              </Form.Item>
            </Col>
            <Col>
              <Button
                type="primary"
                style={{ width: 70 }}
                onClick={submit}
                loading={loading}
              >
                Salvar
              </Button>
            </Col>
          </Row>
        </Form.Item>
      </Form>
      <DangerSection>
        <DangerTitle>Redefinir projeto</DangerTitle>
        <DangerButton type="primary" danger onClick={reset}>
          Redefinir
        </DangerButton>
        <DangerText>
          Atenção: a redefinição excluirá todas as configurações e registros
          atuais, incluindo os da Página de Modelagem e threads da Página
          Inicial.
        </DangerText>
      </DangerSection>
    </div>
  );
}
