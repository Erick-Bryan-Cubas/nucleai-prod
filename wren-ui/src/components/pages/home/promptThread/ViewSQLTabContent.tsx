import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect } from 'react';
import styled from 'styled-components';
import {
  Alert,
  Button,
  Divider,
  Empty,
  message,
  Space,
  Switch,
  Typography,
} from 'antd';
import CheckOutlined from '@ant-design/icons/CheckOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import CodeFilled from '@ant-design/icons/CodeFilled';
import { BinocularsIcon } from '@/utils/icons';
import { nextTick } from '@/utils/time';
import useNativeSQL from '@/hooks/useNativeSQL';
import { DATA_SOURCE_OPTIONS } from '@/components/pages/setup/utils';
import { Logo } from '@/components/Logo';
import { Props as AnswerResultProps } from '@/components/pages/home/promptThread/AnswerResult';
import usePromptThreadStore from '@/components/pages/home/promptThread/store';
import PreviewData from '@/components/dataPreview/PreviewData';
import { usePreviewDataMutation } from '@/apollo/client/graphql/home.generated';

const SQLCodeBlock = dynamic(() => import('@/components/code/SQLCodeBlock'), {
  ssr: false,
});

const { Text } = Typography;

const StyledPre = styled.pre`
  .adm_code-block {
    border-top: none;
    border-radius: 0px 0px 4px 4px;
  }
`;

const StyledToolBar = styled.div`
  background-color: rgba(255, 255, 255, 0.04);
  height: 32px;
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px 4px 0px 0px;
`;

export default function ViewSQLTabContent(props: AnswerResultProps) {
  const { isLastThreadResponse, onInitPreviewDone, threadResponse } = props;

  const { onOpenAdjustSQLModal } = usePromptThreadStore();
  const { fetchNativeSQL, nativeSQLResult } = useNativeSQL();
  const [previewData, previewDataResult] = usePreviewDataMutation({
    onError: (error) => console.error(error),
  });

  const onPreviewData = async () => {
    await previewData({ variables: { where: { responseId: id } } });
  };

  const autoTriggerPreviewDataButton = async () => {
    await nextTick();
    await onPreviewData();
    await nextTick();
    onInitPreviewDone();
  };

  // when is the last step of the last thread response, auto trigger preview data button
  useEffect(() => {
    if (isLastThreadResponse) {
      autoTriggerPreviewDataButton();
    }
  }, [isLastThreadResponse]);

  const { id, sql } = threadResponse;

  const { hasNativeSQL, dataSourceType } = nativeSQLResult;
  const showNativeSQL = hasNativeSQL;

  const sqls =
    nativeSQLResult.nativeSQLMode && nativeSQLResult.loading === false
      ? nativeSQLResult.data
      : sql;

  const onChangeNativeSQL = async (checked: boolean) => {
    nativeSQLResult.setNativeSQLMode(checked);
    checked && fetchNativeSQL({ variables: { responseId: id } });
  };

  const onCopy = () => {
    if (!nativeSQLResult.nativeSQLMode) {
      message.success(
        <>
          Você copiou o Wren SQL. Este dialeto é para o Wren Engine e pode não
          executar diretamente no seu banco de dados.
          {hasNativeSQL && (
            <>
              {' '}
              Clique em “<b>Mostrar SQL original</b>” para obter a versão executável.
            </>
          )}
        </>,
      );
    }
  };

  return (
    <div className="text-md p-6 pb-4" style={{ color: 'var(--gray-3)' }}>
      <Alert
        banner
        className="mb-3 adm-alert-info"
        message={
          <>
            Você está visualizando o Wren SQL por padrão. Se quiser executar esta consulta no
            seu próprio banco de dados, clique em “Mostrar SQL original” para obter a sintaxe exata.
            <Typography.Link
              className="underline ml-1"
              href="https://docs.getwren.ai/oss/guide/home/wren_sql"
              target="_blank"
              rel="noopener noreferrer"
            >
              Saiba mais sobre o Wren SQL
            </Typography.Link>
          </>
        }
        type="info"
      />
      <StyledPre className="p-0 mb-3">
        <StyledToolBar className="d-flex align-center justify-space-between text-family-base">
          <div>
            {nativeSQLResult.nativeSQLMode ? (
              <>
                <Image
                  className="mr-2"
                  src={DATA_SOURCE_OPTIONS[dataSourceType].logo}
                  alt={DATA_SOURCE_OPTIONS[dataSourceType].label}
                  width="22"
                  height="22"
                />
                <Text className="text-medium text-sm" style={{ color: 'var(--gray-4)' }}>
                  {DATA_SOURCE_OPTIONS[dataSourceType].label}
                </Text>
              </>
            ) : (
              <span className="d-flex align-center gx-2">
                <Logo size={18} />
                <Text className="text-medium text-sm" style={{ color: 'var(--gray-4)' }}>Wren SQL</Text>
              </span>
            )}
          </div>
          <Space split={<Divider type="vertical" className="m-0" />}>
            {showNativeSQL && (
              <div
                className="d-flex align-center cursor-pointer"
                onClick={() =>
                  onChangeNativeSQL(!nativeSQLResult.nativeSQLMode)
                }
              >
                <Switch
                  checkedChildren={<CheckOutlined />}
                  unCheckedChildren={<CloseOutlined />}
                  className="mr-2"
                  size="small"
                  checked={nativeSQLResult.nativeSQLMode}
                  loading={nativeSQLResult.loading}
                />
                <Text className="text-medium text-base" style={{ color: 'var(--gray-4)' }}>
                  Mostrar SQL original
                </Text>
              </div>
            )}
            <Button
              type="link"
              data-ph-capture="true"
              data-ph-capture-attribute-name="view_sql_copy_sql"
              icon={<CodeFilled />}
              size="small"
              onClick={() => onOpenAdjustSQLModal({ sql, responseId: id })}
            >
              Ajustar SQL
            </Button>
          </Space>
        </StyledToolBar>
        <SQLCodeBlock
          code={sqls}
          showLineNumbers
          maxHeight="300"
          loading={nativeSQLResult.loading}
          copyable
          onCopy={onCopy}
        />
      </StyledPre>
      <div className="mt-6">
        <Button
          size="small"
          icon={
            <BinocularsIcon
              style={{
                paddingBottom: 2,
                marginRight: 8,
              }}
            />
          }
          loading={previewDataResult.loading}
          onClick={onPreviewData}
          data-ph-capture="true"
          data-ph-capture-attribute-name="view_sql_preview_data"
        >
          Ver resultados
        </Button>
        {previewDataResult?.data?.previewData && (
          <div className="mt-2 mb-3">
            <PreviewData
              error={previewDataResult.error}
              loading={previewDataResult.loading}
              previewData={previewDataResult?.data?.previewData}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Desculpe, não encontramos nenhum registro que corresponda aos seus critérios de busca."
                  />
                ),
              }}
            />
            <div className="text-right">
              <Text className="text-base gray-6">Exibindo até 500 linhas</Text>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
