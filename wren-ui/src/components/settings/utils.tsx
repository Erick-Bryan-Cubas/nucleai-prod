import { SETTINGS } from '@/utils/enum';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import ProjectOutlined from '@ant-design/icons/ProjectOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';

export const getSettingMenu = (menu: SETTINGS) =>
  ({
    [SETTINGS.DATA_SOURCE]: {
      icon: DatabaseOutlined,
      label: 'Fonte de dados',
    },
    [SETTINGS.PROJECT]: {
      icon: ProjectOutlined,
      label: 'Configurações do projeto',
    },
    [SETTINGS.LLM]: {
      icon: ThunderboltOutlined,
      label: 'LLM e embeddings',
    },
  })[menu] || null;
