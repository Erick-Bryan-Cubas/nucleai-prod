import { Layout } from 'antd';
import dynamic from 'next/dynamic';
import styled, { css } from 'styled-components';
import SimpleLayout from '@/components/layouts/SimpleLayout';
import Settings from '@/components/settings';
import useModalAction from '@/hooks/useModalAction';

const Sidebar = dynamic(() => import('@/components/sidebar'), { ssr: false });

const { Sider } = Layout;

const basicStyle = css`
  height: calc(100vh - 48px);
  overflow: auto;
`;

const StyledContentLayout = styled(Layout)<{ color?: string }>`
  position: relative;
  ${basicStyle}
  background-color: #0f1117;
  color: var(--gray-4);
  ${(props) => props.color && `background-color: var(--${props.color});`}
`;

const StyledSider = styled(Sider)`
  ${basicStyle}
`;

type Props = React.ComponentProps<typeof SimpleLayout> & {
  sidebar?: React.ComponentProps<typeof Sidebar>;
  color?: string;
};

export default function SiderLayout(props: Props) {
  const { sidebar, loading, color } = props;
  const settings = useModalAction();

  return (
    <SimpleLayout loading={loading}>
      <Layout className="adm-layout">
        <StyledSider width={280}>
          <Sidebar {...sidebar} onOpenSettings={settings.openModal} />
        </StyledSider>
        <StyledContentLayout color={color}>
          {props.children}
        </StyledContentLayout>
      </Layout>
      <Settings {...settings.state} onClose={settings.closeModal} />
    </SimpleLayout>
  );
}
