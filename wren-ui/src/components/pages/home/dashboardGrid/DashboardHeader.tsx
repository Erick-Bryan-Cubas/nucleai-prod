import { Button, Tooltip } from 'antd';
import styled from 'styled-components';
import { MoreIcon } from '@/utils/icons';
import { MORE_ACTION } from '@/utils/enum';
import { getCompactTime } from '@/utils/time';
import { DashboardDropdown } from '@/components/diagram/CustomDropdown';
import {
  Schedule,
  getScheduleText,
} from '@/components/pages/home/dashboardGrid/CacheSettingsDrawer';

interface Props {
  isSupportCached: boolean;
  nextScheduleTime?: string;
  schedule?: Schedule;
  onCacheSettings?: () => void;
  onRefreshAll?: () => void;
}

const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 49px;
  padding: 8px 16px;
  background-color: #161b22;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

export default function DashboardHeader(props: Props) {
  const {
    isSupportCached,
    nextScheduleTime,
    schedule,
    onCacheSettings,
    onRefreshAll,
  } = props;

  const scheduleTime = getScheduleText(schedule);

  const onMoreClick = async (action: MORE_ACTION) => {
    if (action === MORE_ACTION.CACHE_SETTINGS) {
      onCacheSettings?.();
    } else if (action === MORE_ACTION.REFRESH) {
      onRefreshAll?.();
    }
  };

  return (
    <StyledHeader>
      <div />
      <div>
        {schedule && (
          <div className="d-flex align-center gx-2" style={{ color: 'var(--gray-6)' }}>
            {isSupportCached && (
              <>
                {nextScheduleTime ? (
                  <Tooltip
                    placement="bottom"
                    title={
                      <>
                        <div>
                          <span style={{ color: 'var(--gray-5)' }}>Próxima atualização:</span>{' '}
                          {getCompactTime(nextScheduleTime)}
                        </div>
                        {schedule.cron && (
                          <div>
                            <span style={{ color: 'var(--gray-5)' }}>Expressão Cron:</span>{' '}
                            {schedule.cron}
                          </div>
                        )}
                      </>
                    }
                  >
                    <span className="cursor-pointer">{scheduleTime}</span>
                  </Tooltip>
                ) : (
                  scheduleTime
                )}
              </>
            )}
            <DashboardDropdown
              onMoreClick={onMoreClick}
              isSupportCached={isSupportCached}
            >
              <Button type="text" icon={<MoreIcon style={{ color: 'var(--gray-5)' }} />} />
            </DashboardDropdown>
          </div>
        )}
      </div>
    </StyledHeader>
  );
}
