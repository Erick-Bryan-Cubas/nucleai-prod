import { useMemo } from 'react';
import {
  Modal,
  Button,
  Table,
  Typography,
  Collapse,
  Alert,
  Tag,
  Popconfirm,
} from 'antd';
import styled from 'styled-components';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import PlusSquareOutlined from '@ant-design/icons/PlusSquareOutlined';
import LineOutlined from '@ant-design/icons/LineOutlined';
import FileDoneOutlined from '@ant-design/icons/FileDoneOutlined';
import { ModalAction } from '@/hooks/useModalAction';
import EllipsisWrapper from '@/components/EllipsisWrapper';
import {
  DetailedChangeTable,
  DetailedAffectedCalculatedFields,
  DetailedAffectedRelationships,
  NodeType,
  SchemaChange,
  SchemaChangeType,
} from '@/apollo/client/graphql/__types__';

const StyledCollapse = styled(Collapse)`
  border: none;
  background-color: transparent;
  .ant-collapse-item:last-child,
  .ant-collapse-item:last-child > .ant-collapse-header {
    border-radius: 0;
  }
  .ant-collapse-item,
  .ant-collapse-content {
    border-color: rgba(255, 255, 255, 0.08);
  }
  .ant-collapse-header {
    color: var(--gray-3) !important;
    background-color: rgba(255, 255, 255, 0.03);
  }
  .ant-collapse-content {
    background-color: transparent;
  }
  .ant-collapse-content-box {
    padding: 0;
  }
`;

const StyledTable = styled(Table)`
  padding-left: 36px;
  .ant-table {
    border: none;
    border-radius: 0;

    .non-expandable {
      .ant-table-row-expand-icon {
        display: none;
      }
    }

    .ant-table-expanded-row {
      .ant-table-cell {
        background-color: rgba(255, 255, 255, 0.02);
      }
    }
  }
`;

type Props = ModalAction<SchemaChange> & {
  loading?: boolean;
  payload?: {
    onResolveSchemaChange?: (type: SchemaChangeType) => void;
    isResolving?: boolean;
  };
};

const nestedColumns = [
  {
    title: 'Recurso Afetado',
    dataIndex: 'resourceType',
    width: 200,
    render: (resourceType: NodeType) => {
      if (resourceType === NodeType.CALCULATED_FIELD) {
        return <Tag className="ant-tag--geekblue">Campo Calculado</Tag>;
      }

      if (resourceType === NodeType.RELATION) {
        return <Tag className="ant-tag--citrus">Relacionamento</Tag>;
      }

      return null;
    },
  },
  {
    title: 'Nome',
    dataIndex: 'displayName',
  },
];

const checkIsExpandable = (record: DetailedChangeTable) =>
  record.calculatedFields.length + record.relationships.length > 0
    ? ''
    : 'non-expandable';

const PanelHeader = (props) => {
  const { title, count, onResolve, isResolving } = props;
  const resolve = (event) => {
    event.stopPropagation();
    onResolve();
  };
  return (
    <div
      className="d-flex align-center flex-grow-1"
      style={{ userSelect: 'none' }}
    >
      <b className="text-medium">{title}</b>
      <span className="flex-grow-1 text-right d-flex justify-end">
        <Typography.Text style={{ color: 'var(--gray-6)' }}>
          {count} tabela(s) afetada(s)
        </Typography.Text>
        <div style={{ width: 150 }}>
          {!!onResolve && (
            <Popconfirm
              title="Tem certeza?"
              okText="Confirmar"
              okButtonProps={{ danger: true }}
              onConfirm={resolve}
              onCancel={(event) => event.stopPropagation()}
            >
              <Button
                type="text"
                size="small"
                className="red-5"
                onClick={(event) => event.stopPropagation()}
                loading={isResolving}
                icon={<FileDoneOutlined />}
              >
                Resolver
              </Button>
            </Popconfirm>
          )}
        </div>
      </span>
    </div>
  );
};

interface ExpandedRowsProps {
  record: DetailedChangeTable & {
    resources: Array<
      DetailedAffectedCalculatedFields | DetailedAffectedRelationships
    >;
  };
  tipMessage: string;
}

const ExpandedRows = ({ record, tipMessage }: ExpandedRowsProps) => {
  if (record.resources.length === 0) return null;

  return (
    <div className="pl-12">
      <Alert
        showIcon
        icon={<WarningOutlined className="orange-5" />}
        className="ml-2 pl-0"
        style={{ border: 'none', background: 'rgba(255,255,255,0.03)', color: 'var(--gray-5)' }}
        message={tipMessage}
      />
      <Table
        columns={nestedColumns}
        dataSource={record.resources || []}
        pagination={{
          hideOnSinglePage: true,
          size: 'small',
          pageSize: 10,
        }}
        rowKey="rowKey"
        size="small"
        className="adm-nested-table"
      />
    </div>
  );
};

export default function SchemaChangeModal(props: Props) {
  const { visible, onClose, defaultValue: schemaChange, payload } = props;
  const { onResolveSchemaChange, isResolving } = payload || {};

  const { deletedTables, deletedColumns, modifiedColumns } = useMemo(() => {
    const { deletedTables, deletedColumns, modifiedColumns } =
      schemaChange || {};

    if (!schemaChange)
      return {
        deletedTables,
        deletedColumns,
        modifiedColumns,
      };

    // transform data to render UI
    const transformData = (tables: DetailedChangeTable) => ({
      ...tables,
      resources: [
        ...tables.calculatedFields.map(
          (
            calculatedField: DetailedAffectedCalculatedFields,
            index: number,
          ) => ({
            ...calculatedField,
            resourceType: NodeType.CALCULATED_FIELD,
            rowKey: `${tables.sourceTableName}-${calculatedField.referenceName}-${index}`,
          }),
        ),
        ...tables.relationships.map(
          (relationship: DetailedAffectedRelationships, index: number) => ({
            ...relationship,
            resourceType: NodeType.RELATION,
            rowKey: `${tables.sourceTableName}-${relationship.referenceName}-${index}`,
          }),
        ),
      ],
      rowKey: tables.sourceTableName,
    });

    return {
      deletedTables: deletedTables?.map(transformData),
      deletedColumns: deletedColumns?.map(transformData),
      modifiedColumns: modifiedColumns?.map(transformData),
    };
  }, [schemaChange]);

  const columnsOfDeleteTables = [
    { title: 'Modelo afetado', width: 200, dataIndex: 'displayName' },
    { title: 'Nome da tabela de origem', dataIndex: 'sourceTableName' },
  ];

  const columnsOfDeletedColumns = [
    { title: 'Modelo afetado', width: 200, dataIndex: 'displayName' },
    {
      title: 'Colunas excluídas',
      dataIndex: 'columns',
      render: (columns) => {
        return (
          <EllipsisWrapper showMoreCount>
            {columns.map((column) => (
              <Tag className="ant-tag--geekblue" key={column.sourceColumnName}>
                {column.displayName}
              </Tag>
            ))}
          </EllipsisWrapper>
        );
      },
    },
  ];

  const columnsOfModifiedColumns = [
    { title: 'Modelo afetado', width: 200, dataIndex: 'displayName' },
    {
      title: 'Colunas afetadas',
      dataIndex: 'columns',
      render: (columns) => {
        return (
          <EllipsisWrapper showMoreCount>
            {columns.map((column) => (
              <Tag className="ant-tag--geekblue" key={column.sourceColumnName}>
                {column.displayName}
              </Tag>
            ))}
          </EllipsisWrapper>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <>
          <WarningOutlined className="orange-5 mr-2" />
          Alterações no Esquema
        </>
      }
      width={750}
      visible={visible}
      onCancel={onClose}
      destroyOnClose
      footer={null}
    >
      <Typography.Paragraph style={{ color: 'var(--gray-5)' }} className="mb-4">
        Detectamos alterações no esquema da sua fonte de dados conectada. Revise
        os impactos dessas alterações.
      </Typography.Paragraph>
      <Alert
        showIcon
        type="warning"
        className="mb-6"
        message={`Atenção: clicar em "Resolver" pode excluir automaticamente todos os modelos, relacionamentos e campos calculados afetados.`}
      />
      <StyledCollapse
        expandIcon={(panelProps) =>
          panelProps.isActive ? <LineOutlined /> : <PlusSquareOutlined />
        }
      >
        {deletedTables && (
          <Collapse.Panel
            header={
              <PanelHeader
                title="Tabela de origem excluída"
                count={deletedTables.length}
                onResolve={() =>
                  onResolveSchemaChange(SchemaChangeType.DELETED_TABLES)
                }
                isResolving={isResolving}
              ></PanelHeader>
            }
            key="deleteTables"
          >
            <StyledTable
              rowKey="rowKey"
              columns={columnsOfDeleteTables}
              dataSource={deletedTables}
              size="small"
              pagination={{
                hideOnSinglePage: true,
                size: 'small',
                pageSize: 10,
              }}
              rowClassName={checkIsExpandable}
              expandable={{
                expandedRowRender: (record: ExpandedRowsProps['record']) => (
                  <ExpandedRows
                    record={record}
                    tipMessage="A tabela abaixo mostra os recursos afetados por este modelo que serão excluídos ao resolver."
                  />
                ),
              }}
            />
          </Collapse.Panel>
        )}
        {deletedColumns && (
          <Collapse.Panel
            header={
              <PanelHeader
                title="Coluna de origem excluída"
                count={deletedColumns.length}
                onResolve={() =>
                  onResolveSchemaChange(SchemaChangeType.DELETED_COLUMNS)
                }
                isResolving={isResolving}
              ></PanelHeader>
            }
            key="deleteColumns"
          >
            <StyledTable
              rowKey="rowKey"
              columns={columnsOfDeletedColumns}
              dataSource={deletedColumns}
              size="small"
              pagination={{
                hideOnSinglePage: true,
                size: 'small',
                pageSize: 10,
              }}
              rowClassName={checkIsExpandable}
              expandable={{
                expandedRowRender: (record: ExpandedRowsProps['record']) => (
                  <ExpandedRows
                    record={record}
                    tipMessage="A tabela abaixo mostra os recursos afetados por esta coluna do modelo que serão excluídos ao resolver."
                  />
                ),
              }}
            />
          </Collapse.Panel>
        )}
        {modifiedColumns && (
          <Collapse.Panel
            header={
              <PanelHeader
                title="Tipo de coluna de origem alterado"
                count={modifiedColumns.length}
              ></PanelHeader>
            }
            key="modifiedColumns"
          >
            <StyledTable
              rowKey="rowKey"
              columns={columnsOfModifiedColumns}
              dataSource={modifiedColumns}
              size="small"
              pagination={{
                hideOnSinglePage: true,
                size: 'small',
                pageSize: 10,
              }}
              rowClassName={checkIsExpandable}
              expandable={{
                expandedRowRender: (record: ExpandedRowsProps['record']) => (
                  <ExpandedRows
                    record={record}
                    tipMessage="A tabela abaixo mostra os recursos que utilizam esta coluna do modelo. Revise cada recurso e atualize manualmente os relevantes se necessário."
                  />
                ),
              }}
            />
          </Collapse.Panel>
        )}
      </StyledCollapse>
    </Modal>
  );
}
