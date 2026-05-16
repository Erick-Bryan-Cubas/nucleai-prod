import { Drawer, Tag, Typography } from 'antd';
import { getCompactTime } from '@/utils/time';
import QuestionOutlined from '@ant-design/icons/QuestionOutlined';
import { DrawerAction } from '@/hooks/useDrawerAction';
import GlobalLabel from '@/components/pages/knowledge/GlobalLabel';
import { Instruction } from '@/apollo/client/graphql/__types__';

const { Text } = Typography;

type Props = DrawerAction<Instruction>;

export default function InstructionDrawer(props: Props) {
  const { visible, defaultValue, onClose } = props;

  return (
    <Drawer
      closable
      destroyOnClose
      onClose={onClose}
      title="Ver instrução"
      visible={visible}
      width={760}
    >
      <div className="mb-6">
        <Typography.Text className="gray-7 mb-2">
          Detalhes da instrução
        </Typography.Text>
        <div>{defaultValue?.instruction || '-'}</div>
      </div>
      <div className="mb-6">
        <Typography.Text className="gray-7 mb-2">
          Perguntas correspondentes
        </Typography.Text>
        <div>
          {defaultValue?.isDefault ? (
            <>
              <GlobalLabel />
              <Text className="gray-7 ml-2" type="secondary">
                (aplica-se a todas as perguntas)
              </Text>
            </>
          ) : (
            defaultValue?.questions.map((question, index) => (
              <div key={`${question}-${index}`} className="my-2">
                <Tag className="bg-gray-1 border-gray-5">
                  <QuestionOutlined className="geekblue-6" />
                  <Text className="gray-9">{question}</Text>
                </Tag>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="mb-6">
        <Typography.Text className="gray-7 mb-2">Data de criação</Typography.Text>
        <div>
          {defaultValue?.createdAt
            ? getCompactTime(defaultValue.createdAt)
            : '-'}
        </div>
      </div>
    </Drawer>
  );
}
