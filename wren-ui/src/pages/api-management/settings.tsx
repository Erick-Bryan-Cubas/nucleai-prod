import SiderLayout from '@/components/layouts/SiderLayout';
import PageLayout from '@/components/layouts/PageLayout';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import LLMSettings from '@/components/settings/LLMSettings';

export default function APISettings() {
  return (
    <SiderLayout loading={false} sidebar={null}>
      <PageLayout
        title={
          <>
            <SettingOutlined className="mr-2" style={{ color: 'var(--geekblue-4)' }} />
            Configurações de IA
          </>
        }
        description="Configure os provedores de LLM e embeddings utilizados pelo NucleAI."
      >
        <div style={{ maxWidth: 640 }}>
          <LLMSettings />
        </div>
      </PageLayout>
    </SiderLayout>
  );
}
