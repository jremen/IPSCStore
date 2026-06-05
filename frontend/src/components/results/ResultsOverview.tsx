import { useEffect } from 'react';
import { Tabs, TabItem } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useResultsStore } from '../../stores/resultsStore';
import { divisionLabel, categoryLabel } from '../../utils/constants';
import ExportButtons from './ExportButtons';
import ResultsTable from './ResultsTable';
import type { DqShooter } from '../../stores/resultsStore';

function DqTable({ dqShooters, showDivision = true }: { dqShooters: DqShooter[]; showDivision?: boolean }) {
  const { t } = useTranslation();

  if (dqShooters.length === 0) return null;

  return (
    <div className="mb-6 border border-red-300 rounded-lg overflow-hidden dq-print-section">
      <h3 className="font-semibold text-lg mb-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 dark:text-red-300 text-red-700">
        ⛔ {t('results.disqualified')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Shooter</th>
              {showDivision && <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Division</th>}
              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('results.dqReason')}</th>
            </tr>
          </thead>
          <tbody>
            {dqShooters.map((s: DqShooter) => (
              <tr key={s.registration_id} className="bg-red-50 dark:bg-red-900/10">
                <td className="px-4 py-2 dark:text-white">{s.first_name} {s.last_name}</td>
                {showDivision && <td className="px-4 py-2 dark:text-white">{divisionLabel(s.division)}</td>}
                <td className="px-4 py-2 text-red-600 dark:text-red-400">{s.dq_reason || 'DQ'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ResultsOverview() {
  const { activeMatchId } = useUIStore();
  const { matches } = useMatchStore();
  const { overallResults, dqOverall, divisionResults, dqDivisions, stageResults, categoryResults, dqCategories, tagResults, dqTags, loading,
          fetchOverall, fetchByDivision, fetchByStage, fetchByCategory, fetchByTag } = useResultsStore();
  const { t } = useTranslation();

  const activeMatch = matches?.find((m: any) => m.id === activeMatchId);

  useEffect(() => {
    if (activeMatchId) {
      fetchOverall(activeMatchId);
      fetchByDivision(activeMatchId);
      fetchByStage(activeMatchId);
      fetchByCategory(activeMatchId);
      fetchByTag(activeMatchId);
    }
  }, [activeMatchId]);

  if (!activeMatchId) {
    return <p className="p-4 text-gray-500 text-center">{t('results.noMatch')}</p>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Print-only match header */}
      <div className="print-match-header print-only hidden">
        <h1>{activeMatch?.name || 'Match'}</h1>
        {activeMatch?.date && (
          <p>{activeMatch.organization} • {new Date(activeMatch.date).toLocaleDateString(document.documentElement.lang || 'en', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        )}
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold dark:text-white">{t('results.title')}</h2>
        <ExportButtons />
      </div>

      <Tabs>
        <TabItem title={t('results.byDivision')} active>
          <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byDivision')}</h2>
          {Object.keys(divisionResults).length === 0 && !loading && (
            <p className="text-gray-500 text-center mt-4">{t('results.empty')}</p>
          )}
          {Object.entries(divisionResults)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([division, results]) => (
              <div key={division} className="division-results-section mb-6">
                <h3 className="font-semibold text-lg mb-2 dark:text-white">{divisionLabel(division)}</h3>
                <ResultsTable results={results as any[]} columns={['position', 'shooter', 'matchPercent', 'matchPoints']} />
              </div>
            ))}
          <DqTable dqShooters={dqDivisions} />
        </TabItem>

        <TabItem title={t('results.overall')}>
          <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.overall')}</h2>
          <ResultsTable results={overallResults as any[]} columns={['position', 'shooter', 'division', 'matchPercent', 'matchPoints']} />
          <DqTable dqShooters={dqOverall} />
        </TabItem>

        <TabItem title={t('results.byStage')}>
          <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byStage')}</h2>
          {stageResults.map((stage: any) => (
            <div key={stage.stage_id} className="mb-6 division-results-section">
              <h3 className="font-semibold mb-2 dark:text-white">{t('scoring.stage', { number: stage.stage_number })}: {stage.stage_name}</h3>
              {stage.divisions && Object.keys(stage.divisions).length > 0 ? (
                Object.entries(stage.divisions as Record<string, any[]>)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([division, scores]) => (
                    <div key={division} className="division-results-section mb-4 ml-2">
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">{divisionLabel(division)}</h4>
                      <ResultsTable results={scores as any[]} columns={['position', 'shooter', 'stagePercent', 'stagePoints']} />
                    </div>
                  ))
              ) : (
                <ResultsTable results={stage.scores as any[]} columns={['position', 'shooter', 'division', 'stagePercent', 'stagePoints']} />
              )}
              {stage.dq_scores && stage.dq_scores.length > 0 && (
                <div className="mt-2 border border-red-300 rounded-lg overflow-hidden">
                  <h4 className="font-semibold text-sm px-3 py-1 bg-red-50 dark:bg-red-900/20 dark:text-red-300 text-red-700">
                    ⛔ {t('results.disqualified')}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-1 text-left dark:text-gray-300">Shooter</th>
                          <th className="px-3 py-1 text-left dark:text-gray-300">Division</th>
                          <th className="px-3 py-1 text-right dark:text-gray-300">HF</th>
                          <th className="px-3 py-1 text-right dark:text-gray-300">Net Pts</th>
                          <th className="px-3 py-1 text-left dark:text-gray-300">{t('results.dqReason')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stage.dq_scores.map((s: any) => (
                          <tr key={s.registration_id} className="bg-red-50 dark:bg-red-900/10">
                            <td className="px-3 py-1 dark:text-white">{s.first_name} {s.last_name}</td>
                            <td className="px-3 py-1 dark:text-white">{divisionLabel(s.division)}</td>
                            <td className="px-3 py-1 text-right dark:text-white">{s.hit_factor?.toFixed(4)}</td>
                            <td className="px-3 py-1 text-right dark:text-white">{s.net_points?.toFixed(2)}</td>
                            <td className="px-3 py-1 text-red-600 dark:text-red-400">{s.dq_reason || 'DQ'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </TabItem>

        <TabItem title={t('results.byCategory')}>
          <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byCategory')}</h2>
          {Object.entries(categoryResults).map(([cat, results]) => (
            <div key={cat} className="mb-4 division-results-section">
              <h3 className="font-semibold mb-2 dark:text-white">{categoryLabel(cat)}</h3>
              <ResultsTable results={results as any[]} columns={['position', 'shooter', 'division', 'matchPercent', 'matchPoints']} />
            </div>
          ))}
          <DqTable dqShooters={dqCategories} />
        </TabItem>

        <TabItem title={t('results.byTag')}>
          <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byTag')}</h2>
          {Object.entries(tagResults).map(([tag, results]) => (
            <div key={tag} className="mb-4 division-results-section">
              <h3 className="font-semibold mb-2 dark:text-white">{t('results.tag', { tag })}</h3>
              <ResultsTable results={results as any[]} columns={['position', 'shooter', 'division', 'matchPercent', 'matchPoints']} />
            </div>
          ))}
          {Object.keys(tagResults).length === 0 && <p className="text-gray-500 text-center">{t('results.noTags')}</p>}
          <DqTable dqShooters={dqTags} />
        </TabItem>
      </Tabs>

      {loading && <p className="text-gray-500 text-center mt-4">{t('results.loading')}</p>}
    </div>
  );
}