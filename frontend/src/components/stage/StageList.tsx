import { useEffect, useState } from 'react';
import { Button, Card, Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useStageStore } from '../../stores/stageStore';
import { useUIStore } from '../../stores/uiStore';
import { SCORING_TYPES } from '../../utils/constants';
import StageImageUpload from './StageImageUpload';
import StageFormModal from './StageFormModal';
import PrintScoreSheetButton from './PrintScoreSheetButton';
import type { Stage } from '../../types/stage';

function getScoringTypeLabel(type: string): string {
  const found = SCORING_TYPES.find(s => s.value === type);
  return found ? found.label : type;
}

export default function StageList() {
  const { stages, loading, fetchStages, deleteStage } = useStageStore();
  const { activeMatchId, addToast } = useUIStore();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);

  useEffect(() => {
    if (activeMatchId) fetchStages(activeMatchId);
  }, [activeMatchId, fetchStages]);

  const handleDelete = async (stageId: string) => {
    if (!activeMatchId) return;
    await deleteStage(stageId);
    addToast(t('stages.deleted'), 'success');
  };

  const openEdit = (stage: any) => {
    setEditStage(stage);
  };

  const handleCloseModal = () => {
    setShowCreate(false);
    setEditStage(null);
  };

  if (!activeMatchId) {
    return <p className="p-4 text-gray-500 text-center">{t('stages.noMatch')}</p>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold dark:text-white">{t('stages.title')}</h2>
        <div className="flex gap-2">
          <PrintScoreSheetButton stages={stages} />
          <Button size="sm" color="green" onClick={() => setShowCreate(true)}>{t('stages.addStage')}</Button>
        </div>
      </div>

      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      <div className="space-y-3">
        {stages.map((stage: any) => (
          <Card key={stage.id}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-blue-600 text-lg">#{stage.stage_number}</span>
                  <span className="font-semibold dark:text-white">{stage.name}</span>
                  <Badge color="indigo">{getScoringTypeLabel(stage.scoring_type)}</Badge>
                  {stage.par_time && <Badge color="yellow">Par {stage.par_time}s</Badge>}
                </div>
                <div className="text-sm text-gray-500 space-x-3">
                  {stage.paper_targets > 0 && <span>{t('stages.paper')}: {stage.paper_targets}</span>}
                  {stage.steel_targets > 0 && <span>{t('stages.steel')}: {stage.steel_targets}</span>}
                  {stage.no_shoot_targets > 0 && <span>{t('stages.noShoot')}: {stage.no_shoot_targets}</span>}
                  {stage.npm_targets > 0 && <span>NPM: {stage.npm_targets}</span>}
                  {stage.hits_per_paper > 0 && stage.paper_targets > 0 && <span>{t('stages.hitsPerPaperShort')}: {stage.hits_per_paper}</span>}
                  <span>{t('stages.minRoundsShort')}: {stage.min_rounds}</span>
                  <span>{t('stages.maxPointsShort')}: {stage.max_points}</span>
                  {stage.config && Object.keys(stage.config).length > 0 && (
                    <span className="text-xs text-gray-400">
                      {stage.config.number_of_strings && `${t('stages.configNumberOfStrings')}: ${stage.config.number_of_strings}`}
                      {stage.config.num_targets && ` ${t('stages.configNumTargets')}: ${stage.config.num_targets}`}
                      {stage.config.shots_per_string && ` • ${stage.config.shots_per_string} shots`}
                      {stage.config.fire_type && ` • ${stage.config.fire_type} fire`}
                      {stage.config.variant && ` • ${stage.config.variant}`}
                      {stage.config.arrows_per_end && ` • ${stage.config.arrows_per_end} arrows/end`}
                      {stage.config.point_value && ` • ${stage.config.point_value}pts/hit`}
                    </span>
                  )}
                </div>
                {stage.image_path && (
                  <img
                    src={`/api/uploads/${stage.image_path.split('/').pop()}`}
                    alt={`Stage ${stage.stage_number} plan`}
                    className="mt-2 max-h-40 rounded"
                  />
                )}
              </div>
              <div className="flex gap-2 ml-2">
                <StageImageUpload stageId={stage.id} />
                <Button size="xs" color="blue" onClick={() => openEdit(stage)}>{t('common.edit')}</Button>
                <Button size="xs" color="red" onClick={() => handleDelete(stage.id)}>{t('common.delete')}</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!loading && stages.length === 0 && (
        <p className="text-center text-gray-500 mt-8">{t('stages.empty')}</p>
      )}

      <StageFormModal show={showCreate} onClose={handleCloseModal} matchId={activeMatchId!} />
      <StageFormModal show={!!editStage} onClose={handleCloseModal} editStage={editStage} matchId={activeMatchId!} />
    </div>
  );
}
