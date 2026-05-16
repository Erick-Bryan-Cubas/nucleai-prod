import { useEffect, useMemo, useState } from 'react';
import { Modal, Layout, Button } from 'antd';
import styled from 'styled-components';
import { SETTINGS } from '@/utils/enum';
import { makeIterable } from '@/utils/iteration';
import { ModalAction } from '@/hooks/useModalAction';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import DataSourceSettings from './DataSourceSettings';
import ProjectSettings from './ProjectSettings';
import LLMSettings from './LLMSettings';
import { getSettingMenu } from './utils';
import {
  useGetSettingsLazyQuery,
  GetSettingsQuery,
} from '@/apollo/client/graphql/settings.generated';

const { Sider, Content } = Layout;

type Props = ModalAction<any, any> & {
  loading?: boolean;
};

const StyledSider = styled(Sider)`
  background: #171717 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06);

  .ant-layout-sider-children {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
`;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    overflow: hidden;
  }

  .ant-modal-body {
    background: #141414;
  }

  .adm-settings-content {
    .ant-btn {
      height: 36px;
      padding: 0 16px;
      border-radius: 10px;
      font-weight: 600;
      box-shadow: none;
      transition: all 0.18s ease;
    }

    .ant-btn:not(.ant-btn-primary):not(.ant-btn-link):not(.ant-btn-text) {
      background: #202020;
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--gray-3);

      &:hover,
      &:focus {
        background: #272727;
        border-color: rgba(255, 255, 255, 0.16);
        color: var(--gray-1);
      }
    }

    .ant-btn-link,
    .ant-btn-text {
      color: var(--gray-4);

      &:hover,
      &:focus {
        color: var(--gray-1);
      }
    }

    .ant-btn-primary {
      background: linear-gradient(180deg, #f7f7f7 0%, #e9e9e9 100%);
      border-color: #f0f0f0;
      color: #111;

      &:hover,
      &:focus {
        background: var(--gray-3);
        border-color: var(--gray-4);
        color: var(--gray-10);
      }
    }

    .ant-btn-primary.ant-btn-dangerous,
    .ant-btn-dangerous {
      background: linear-gradient(180deg, #ff6b6b 0%, #ef4444 100%);
      border-color: #ff6b6b;
      color: #fff;

      &:hover,
      &:focus {
        background: linear-gradient(180deg, #ff7b7b 0%, #f05252 100%);
        border-color: #ff8a8a;
        color: #fff;
      }
    }
  }

  .ant-modal-close-x {
    width: 48px;
    height: 48px;
    line-height: 48px;
  }
`;

const StyledButton = styled(Button)`
  display: flex;
  align-items: center;
  padding: 12px 8px;
  margin-bottom: 4px;
  border-radius: 10px;
  color: var(--gray-5);

  &:hover,
  &:focus {
    color: var(--gray-2) !important;
    background: #202020 !important;
  }
`;

const SidebarHeader = styled.div`
  color: var(--gray-2);
  font-weight: 600;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const SidebarMenu = styled.div`
  padding: 12px;
  flex-grow: 1;
`;

const SidebarFooter = styled.div`
  color: var(--gray-6);
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: #151515;
`;

const StyledContent = styled(Content)`
  background: #141414;
  display: flex;
  flex-direction: column;
`;

const ContentHeader = styled.div`
  display: flex;
  align-items: center;
  color: var(--gray-2);
  font-weight: 600;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: #161616;
`;

const ContentBody = styled.div`
  flex-grow: 1;
  overflow-y: auto;
`;

const DynamicComponent = ({
  menu,
  data,
  refetch,
  closeModal,
}: {
  menu: SETTINGS;
  data?: GetSettingsQuery['settings'];
  refetch: () => void;
  closeModal: () => void;
}) => {
  const { dataSource, language } = data || {};
  return (
    {
      [SETTINGS.DATA_SOURCE]: (
        <DataSourceSettings
          type={dataSource?.type}
          sampleDataset={dataSource?.sampleDataset}
          properties={dataSource?.properties}
          refetchSettings={refetch}
          closeModal={closeModal}
        />
      ),
      [SETTINGS.PROJECT]: <ProjectSettings data={{ language }} />,
      [SETTINGS.LLM]: <LLMSettings />,
    }[menu] || null
  );
};

const MenuTemplate = ({ currentMenu, value, onClick }) => {
  const current = getSettingMenu(value);
  const isActive = currentMenu === value;
  return (
    <StyledButton
      style={
        isActive
          ? {
              background: '#232323',
              color: 'var(--gray-2)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }
          : {
              background: 'transparent',
              border: '1px solid transparent',
            }
      }
      type="text"
      block
      onClick={() => onClick({ value })}
      icon={<current.icon />}
    >
      {current.label}
    </StyledButton>
  );
};

const MenuIterator = makeIterable(MenuTemplate);

export default function Settings(props: Props) {
  const { onClose, visible } = props;
  const [menu, setMenu] = useState<SETTINGS>(SETTINGS.DATA_SOURCE);
  const current = getSettingMenu(menu);
  const menuList = Object.keys(SETTINGS).map((key) => ({
    key,
    value: SETTINGS[key],
  }));
  const [fetchSettings, { data, refetch }] = useGetSettingsLazyQuery({
    fetchPolicy: 'cache-and-network',
  });

  const productVersion = useMemo(() => {
    return data?.settings?.productVersion;
  }, [data?.settings]);

  useEffect(() => {
    if (visible) fetchSettings();
  }, [visible]);

  const onMenuClick = ({ value }) => setMenu(value);

  return (
    <StyledModal
      width={950}
      bodyStyle={{ padding: 0, height: 700 }}
      visible={visible}
      footer={null}
      onCancel={onClose}
      destroyOnClose
      centered
    >
      <Layout style={{ height: '100%' }}>
        <StyledSider width={310}>
          <SidebarHeader>
            <SettingOutlined className="mr-2" />
            Configurações
          </SidebarHeader>
          <SidebarMenu>
            <MenuIterator
              data={menuList}
              currentMenu={menu}
              onClick={onMenuClick}
            />
          </SidebarMenu>
          {!!productVersion && (
            <SidebarFooter>
              <InfoCircleOutlined className="mr-2 text-sm" />
              Versão do Wren AI: {productVersion}
            </SidebarFooter>
          )}
        </StyledSider>
        <StyledContent className="adm-settings-content">
          <ContentHeader>
            <current.icon className="mr-2" />
            {current.label}
          </ContentHeader>
          <ContentBody>
            <DynamicComponent
              menu={menu}
              data={data?.settings}
              refetch={refetch}
              closeModal={onClose}
            />
          </ContentBody>
        </StyledContent>
      </Layout>
    </StyledModal>
  );
}
