import Link from 'next/link';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { Path, MENU_KEY } from '@/utils/enum';
import ApiOutlined from '@ant-design/icons/ApiOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import SidebarMenu from '@/components/sidebar/SidebarMenu';

const Layout = styled.div`
  padding: 16px 0;
  position: absolute;
  z-index: 1;
  left: 0;
  top: 0;
  width: 100%;
  background-color: #161b22;
  overflow: hidden;
`;

const MENU_KEY_MAP = {
  [Path.APIManagementHistory]: MENU_KEY.API_HISTORY,
  [Path.APIManagementSettings]: MENU_KEY.API_SETTINGS,
};

const linkStyle = { color: 'inherit', transition: 'none' };

export default function APIManagement() {
  const router = useRouter();

  const menuItems = [
    {
      'data-guideid': 'api-history',
      label: (
        <Link style={linkStyle} href={Path.APIManagementHistory}>
          Histórico da API
        </Link>
      ),
      icon: <ApiOutlined />,
      key: MENU_KEY.API_HISTORY,
      className: 'pl-4',
    },
    {
      label: (
        <Link style={linkStyle} href={Path.APIManagementSettings}>
          Configurações de IA
        </Link>
      ),
      icon: <SettingOutlined />,
      key: MENU_KEY.API_SETTINGS,
      className: 'pl-4',
    },
  ];

  return (
    <Layout>
      <SidebarMenu
        items={menuItems}
        selectedKeys={MENU_KEY_MAP[router.pathname]}
      />
    </Layout>
  );
}
