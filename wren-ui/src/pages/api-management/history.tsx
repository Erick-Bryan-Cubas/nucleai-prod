import Link from 'next/link';
import { useState } from 'react';
import {
  Table,
  TableColumnsType,
  Button,
  Tag,
  Typography,
  Modal,
  message,
} from 'antd';
import { getAbsoluteTime } from '@/utils/time';
import useDrawerAction from '@/hooks/useDrawerAction';
import { getColumnSearchProps } from '@/utils/table';
import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import ApiOutlined from '@ant-design/icons/ApiOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';
import SQLCodeBlock from '@/components/code/SQLCodeBlock';
import DetailsDrawer from '@/components/pages/apiManagement/DetailsDrawer';
import {
  useApiHistoryQuery,
  useDeleteApiHistoryMutation,
} from '@/apollo/client/graphql/apiManagement.generated';
import { ApiType, ApiHistoryResponse } from '@/apollo/client/graphql/__types__';

const PAGE_SIZE = 10;

export default function APIHistory() {
  const detailsDrawer = useDrawerAction();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data, loading, refetch } = useApiHistoryQuery({
    fetchPolicy: 'cache-and-network',
    variables: {
      pagination: {
        offset: (currentPage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      },
      filter: {
        apiType: filters['apiType']?.[0],
        statusCode: filters['statusCode']?.[0],
        threadId: filters['threadId']?.[0],
      },
    },
  });

  const [deleteApiHistory, { loading: deleting }] =
    useDeleteApiHistoryMutation();

  const onDeleteSelected = () => {
    const ids = selectedRowKeys.map(String);
    if (ids.length === 0) return;
    Modal.confirm({
      title: `Excluir ${ids.length} ${ids.length === 1 ? 'entrada' : 'entradas'}?`,
      icon: <ExclamationCircleOutlined />,
      content: 'Esta ação não pode ser desfeita.',
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const result = await deleteApiHistory({ variables: { ids } });
          const deleted = result.data?.deleteApiHistory ?? 0;
          message.success(
            `${deleted} ${deleted === 1 ? 'entrada removida' : 'entradas removidas'}`,
          );
          setSelectedRowKeys([]);
          await refetch();
        } catch (err: any) {
          message.error(err?.message || 'Falha ao remover entradas');
        }
      },
    });
  };

  const columns: TableColumnsType<ApiHistoryResponse> = [
    {
      title: 'Data/Hora',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (timestamp: string) => (
        <div style={{ color: 'var(--gray-6)' }}>{getAbsoluteTime(timestamp)}</div>
      ),
    },
    {
      title: 'Tipo de API',
      dataIndex: 'apiType',
      key: 'apiType',
      width: 180,
      render: (type: ApiHistoryResponse['apiType']) => (
        <Tag style={{ color: 'var(--gray-4)', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}>{type.toLowerCase()}</Tag>
      ),
      filters: Object.keys(ApiType).map((type) => ({
        text: type.toLowerCase(),
        value: type,
      })),
      filteredValue: filters['apiType'],
      filterMultiple: false,
    },
    {
      title: 'Estado',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 100,
      render: (status: number) => {
        const icon =
          status >= 200 && status < 300 ? (
            <CheckCircleOutlined />
          ) : (
            <CloseCircleOutlined />
          );
        const color = status >= 200 && status < 300 ? 'success' : 'error';
        return (
          <Tag icon={icon} color={color}>
            {status}
          </Tag>
        );
      },
      filters: [
        { text: 'Sucesso (código: 2xx)', value: 200 },
        { text: 'Erro do cliente (código: 4xx)', value: 400 },
        { text: 'Erro do servidor (código: 5xx)', value: 500 },
      ],
      filteredValue: filters['statusCode'],
      filterMultiple: false,
    },
    {
      title: 'Pergunta / SQL',
      dataIndex: 'requestPayload',
      key: 'requestPayload',
      render: (payload: Record<string, any>, record: ApiHistoryResponse) => {
        if (record.apiType === ApiType.RUN_SQL && payload.sql) {
          return (
            <div style={{ width: '100%' }}>
              <SQLCodeBlock code={payload.sql} maxHeight="130" />
            </div>
          );
        }
        return (
          <div style={{ color: 'var(--gray-4)' }}>
            {payload?.question || payload?.sql || '-'}
          </div>
        );
      },
    },
    {
      title: 'ID da Thread',
      dataIndex: 'threadId',
      key: 'threadId',
      width: 200,
      render: (threadId: string) => {
        if (!threadId) return <div style={{ color: 'var(--gray-6)' }}>-</div>;
        return (
          <Typography.Text
            ellipsis
            style={{ color: 'var(--gray-5)' }}
            copyable={{ text: threadId }}
          >
            {threadId}
          </Typography.Text>
        );
      },
      ...getColumnSearchProps({
        dataIndex: 'threadId',
        placeholder: 'ID da thread',
        filteredValue: filters['threadId'],
      }),
    },
    {
      title: 'Duração (ms)',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 124,
      render: (durationMs: number) => (
        <div className="text-right" style={{ color: 'var(--gray-6)' }}>{durationMs || '-'}</div>
      ),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 110,
      align: 'center',
      fixed: 'right',
      render: (record) => (
        <Button
          type="text"
          size="small"
          style={{ color: 'var(--gray-5)' }}
          onClick={() => detailsDrawer.openDrawer(record)}
        >
          <EyeOutlined /> Detalhes
        </Button>
      ),
    },
  ];

  return (
    <SiderLayout loading={false} sidebar={null}>
      <PageLayout
        title={
          <>
            <ApiOutlined className="mr-2" style={{ color: 'var(--geekblue-4)' }} />
            Histórico da API
          </>
        }
        description={
          <>
            <div>
              Aqui você pode visualizar o histórico completo das chamadas de API,
              incluindo entradas, respostas e detalhes de execução.{' '}
              <Link
                className="underline mr-2"
                style={{ color: 'var(--geekblue-4)' }}
                href="https://docs.getwren.ai/oss/guide/api-access/history"
                target="_blank"
                rel="noopener noreferrer"
              >
                Saiba mais.
              </Link>
            </div>
          </>
        }
      >
        <div className="d-flex justify-end mb-2">
          <Button
            danger
            disabled={selectedRowKeys.length === 0}
            loading={deleting}
            icon={<DeleteOutlined />}
            onClick={onDeleteSelected}
          >
            Excluir selecionados
            {selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
          </Button>
        </div>
        <Table
          className="ant-table-has-header"
          dataSource={data?.apiHistory.items || []}
          loading={loading}
          columns={columns}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          pagination={{
            hideOnSinglePage: true,
            pageSize: PAGE_SIZE,
            size: 'small',
            total: data?.apiHistory.total,
          }}
          scroll={{ x: 1200 }}
          onChange={(pagination, filters, _sorter) => {
            setCurrentPage(pagination.current);
            setFilters(filters);
          }}
        />
        <DetailsDrawer
          {...detailsDrawer.state}
          onClose={detailsDrawer.closeDrawer}
        />
      </PageLayout>
    </SiderLayout>
  );
}
