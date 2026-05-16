import { ReactNode } from 'react';
import { ButtonProps, Modal, ModalProps } from 'antd';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';

type DeleteModalProps = {
  disabled?: boolean;
  modalProps?: ModalProps;
  onConfirm: () => void;
  style?: any;
} & Partial<ButtonProps>;

type Config = {
  icon?: ReactNode;
  itemName?: string;
  content?: string;
};

export const makeDeleteModal =
  (Component, config?: Config) => (props: DeleteModalProps) => {
    const { title, content, modalProps = {}, onConfirm, ...restProps } = props;

    return (
      <Component
        icon={config.icon}
        onClick={() =>
          Modal.confirm({
            autoFocusButton: null,
            cancelText: 'Cancelar',
            content:
              config?.content ||
              'Este item será excluído permanentemente. Confirme que deseja excluí-lo.',
            icon: <ExclamationCircleOutlined />,
            okText: 'Excluir',
            onOk: onConfirm,
            title: `Tem certeza que deseja excluir este(a) ${config?.itemName}?`,
            width: 464,
            ...modalProps,
            okButtonProps: {
              ...modalProps.okButtonProps,
              danger: true,
            },
          })
        }
        {...restProps}
      />
    );
  };

const DefaultDeleteButton = (props) => {
  const { icon = null, disabled, ...restProps } = props;
  return (
    <a className={disabled ? '' : 'red-5'} {...restProps}>
      {icon}Excluir
    </a>
  );
};

export default makeDeleteModal(DefaultDeleteButton);

// Customize delete modal
export const DeleteThreadModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="mr-2" />,
  itemName: 'thread',
  content:
    'Todo o histórico de resultados desta thread será excluído permanentemente. Confirme que deseja excluí-lo.',
});

export const DeleteViewModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="mr-2" />,
  itemName: 'view',
  content:
    'Este item será excluído permanentemente. Confirme que deseja excluí-lo.',
});

export const DeleteModelModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="mr-2" />,
  itemName: 'modelo',
  content:
    'Este item será excluído permanentemente. Confirme que deseja excluí-lo.',
});

export const DeleteCalculatedFieldModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="mr-2" />,
  itemName: 'campo calculado',
  content:
    'Este item será excluído permanentemente. Confirme que deseja excluí-lo.',
});

export const DeleteRelationshipModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="mr-2" />,
  itemName: 'relacionamento',
  content:
    'Este item será excluído permanentemente. Confirme que deseja excluí-lo.',
});

export const DeleteDashboardItemModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="mr-2" />,
  itemName: 'item do dashboard',
  content:
    'Este item será excluído permanentemente. Confirme que deseja excluí-lo.',
});

export const DeleteQuestionSQLPairModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="mr-2" />,
  itemName: 'par Pergunta-SQL',
  content:
    'Esta ação é permanente e não pode ser desfeita. Deseja continuar?',
});

export const DeleteInstructionModal = makeDeleteModal(DefaultDeleteButton, {
  icon: <DeleteOutlined className="mr-2" />,
  itemName: 'instrução',
  content:
    'Esta ação é permanente e não pode ser desfeita. Deseja continuar?',
});
