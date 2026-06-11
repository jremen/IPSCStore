import { useEffect } from 'react';
import { Button, Badge, Card } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { useUIStore } from '../../stores/uiStore';
import { formatDate } from '../../utils/constants';

export default function MatchDetail() {
  const { currentMatch, fetchMatch } = useMatchStore();
  const { activeMatchId, setActiveMatch } = useUIStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (activeMatchId) fetchMatch(activeMatchId);
  }, [activeMatchId, fetchMatch]);

  if (!currentMatch) return <p className="p-4 text-gray-500">{t('common.loading')}</p>;

  const { summary } = currentMatch;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button size="sm" color="gray" onClick={() => setActiveMatch(null)}>{t('matchDetail.back')}</Button>
        <h2 className="text-xl font-bold dark:text-white">{currentMatch.name}</h2>
        <Badge color={currentMatch.organization === 'IPSC' ? 'info' : 'purple'}>{currentMatch.organization}</Badge>
        <Badge color="gray">{currentMatch.firearm_type}</Badge>
      </div>

      <p className="text-sm text-gray-500 mb-4">{formatDate(currentMatch.date)} • {currentMatch.shooter_count} {t('matches.shooters').toLowerCase()}</p>

      {/* Match Summary */}
      <Card className="mb-4">
        <h3 className="font-semibold mb-2 dark:text-white">{t('matchDetail.summary')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 dark:text-white text-xs text-center">
          <div><div className="text-2xl font-bold text-blue-600">{summary.total_shots}</div><div>{t('matchDetail.totalShots')}</div></div>
          <div><div className="text-2xl font-bold text-green-600">{summary.total_points}</div><div>{t('matchDetail.maxPoints')}</div></div>
          <div><div className="text-2xl font-bold text-orange-600">{summary.total_paper}</div><div>{t('matchDetail.paperTargets')}</div></div>
          <div><div className="text-2xl font-bold text-purple-600">{summary.total_steel}</div><div>{t('matchDetail.steelTargets')}</div></div>
        </div>
      </Card>

      {/* Stages list */}
      <h3 className="font-semibold mb-2 dark:text-white">{t('stages.title')} ({currentMatch.stages.length})</h3>
      <div className="space-y-2">
        {currentMatch.stages.map((stage) => (
          <Card key={stage.id}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-blue-600 mr-2">#{stage.stage_number}</span>
                <span className="font-medium dark:text-white">{stage.name}</span>
                <Badge color="indigo" className="ml-2">{stage.scoring_type}</Badge>
              </div>
              <div className="text-sm dark:text-white">
                {stage.paper_targets}&nbsp;P / {stage.steel_targets}&nbsp;S / {stage.no_shoot_targets > 0 ? '✓' : '—'}&nbsp;NS{stage.npm_targets > 0 ? ` / ${stage.npm_targets} NPM` : ''} • {stage.min_rounds} rnds • {stage.max_points} pts
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
