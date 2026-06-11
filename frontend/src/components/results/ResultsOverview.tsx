import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useResultsStore } from '../../stores/resultsStore';
import { divisionLabel, categoryLabel } from '../../utils/constants';
import ExportButtons from './ExportButtons';
import ResultsTable from './ResultsTable';
import type { DqShooter } from '../../stores/resultsStore';
import { twMerge } from "tailwind-merge";

type ResultTab = 'byDivision' | 'overall' | 'byStage' | 'byCategory' | 'byTag';

const TABS: { key: ResultTab; labelKey: string }[] = [
  { key: 'byDivision', labelKey: 'results.byDivision' },
  { key: 'overall', labelKey: 'results.overall' },
  { key: 'byStage', labelKey: 'results.byStage' },
  { key: 'byCategory', labelKey: 'results.byCategory' },
  { key: 'byTag', labelKey: 'results.byTag' },
];

function DqTable({ dqShooters, showDivision = true }: { dqShooters: DqShooter[]; showDivision?: boolean }) {
  const { t } = useTranslation();

  if (dqShooters.length === 0) return null;

  return (
    <div className="mb-6 border border-red-300 rounded-lg overflow-hidden dq-print-section">
      <h3 className="font-semibold text-lg mb-0 px-4 py-2 bg-red-50 dark:bg-red-900/20 dark:text-red-300 text-red-700">
        ⛔ {t('results.disqualified')}
      </h3>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('results.shooter')}</th>
              {showDivision && <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">{t('results.division')}</th>}
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
      {/* Mobile cards */}
      <div className="sm:hidden divide-y dark:divide-gray-700">
        {dqShooters.map((s: DqShooter) => (
          <div key={s.registration_id} className="px-3 py-2.5 bg-red-50 dark:bg-red-900/10">
            <div className="font-medium dark:text-white">{s.first_name} {s.last_name}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm">
              {showDivision && (
                <span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.division')}</span>{' '}
                  <span className="dark:text-white">{divisionLabel(s.division)}</span>
                </span>
              )}
              <span>
                <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.dqReason')}</span>{' '}
                <span className="text-red-600 dark:text-red-400">{s.dq_reason || 'DQ'}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DivisionContent({ divisionResults, dqDivisions, loading }: {
  divisionResults: Record<string, any[]>;
  dqDivisions: DqShooter[];
  loading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
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
    </>
  );
}

function OverallContent({ overallResults, dqOverall }: {
  overallResults: any[];
  dqOverall: DqShooter[];
}) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.overall')}</h2>
      <ResultsTable results={overallResults as any[]} columns={['position', 'shooter', 'division', 'matchPercent', 'matchPoints']} />
      <DqTable dqShooters={dqOverall} />
    </>
  );
}

function StageContent({ stageResults }: { stageResults: any[] }) {
  const { t } = useTranslation();

  return (
    <>
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
                  <ResultsTable results={scores as any[]} columns={['position', 'shooter', 'stagePercent', 'stagePoints', 'hitFactor', 'netPoints', 'time']} />
                </div>
              ))
          ) : (
            <ResultsTable results={stage.scores as any[]} columns={['position', 'shooter', 'division', 'stagePercent', 'stagePoints', 'hitFactor', 'netPoints', 'time']} />
          )}
          {stage.dq_scores && stage.dq_scores.length > 0 && (
            <div className="mt-2 border border-red-300 rounded-lg overflow-hidden">
              <h4 className="font-semibold text-sm px-3 py-1 bg-red-50 dark:bg-red-900/20 dark:text-red-300 text-red-700">
                ⛔ {t('results.disqualified')}
              </h4>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-1 text-left dark:text-gray-300">{t('results.shooter')}</th>
                      <th className="px-3 py-1 text-left dark:text-gray-300">{t('results.division')}</th>
                      <th className="px-3 py-1 text-right dark:text-gray-300">HF</th>
                      <th className="px-3 py-1 text-right dark:text-gray-300">{t('results.netPoints')}</th>
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
              {/* Mobile cards */}
              <div className="sm:hidden divide-y dark:divide-gray-700">
                {stage.dq_scores.map((s: any) => (
                  <div key={s.registration_id} className="px-3 py-2.5 bg-red-50 dark:bg-red-900/10">
                    <div className="font-medium dark:text-white">{s.first_name} {s.last_name}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-sm">
                      <span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.division')}</span>{' '}
                        <span className="dark:text-white">{divisionLabel(s.division)}</span>
                      </span>
                      <span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">HF</span>{' '}
                        <span className="font-mono dark:text-white">{s.hit_factor?.toFixed(4)}</span>
                      </span>
                      <span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.netPoints')}</span>{' '}
                        <span className="font-mono dark:text-white">{s.net_points?.toFixed(2)}</span>
                      </span>
                      <span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{t('results.dqReason')}</span>{' '}
                        <span className="text-red-600 dark:text-red-400">{s.dq_reason || 'DQ'}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function CategoryContent({ categoryResults, dqCategories }: {
  categoryResults: Record<string, any>;
  dqCategories: DqShooter[];
}) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byCategory')}</h2>
      {Object.entries(categoryResults).map(([cat, divisions]) => (
        <div key={cat} className="mb-6 division-results-section">
          <h3 className="font-semibold text-lg mb-2 dark:text-white">{categoryLabel(cat)}</h3>
          {Object.entries(divisions as Record<string, any[]>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([division, results]) => (
              <div key={division} className="mb-4 ml-2">
                <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">{divisionLabel(division)}</h4>
                <ResultsTable results={results as any[]} columns={['position', 'shooter', 'matchPercent', 'matchPoints']} />
              </div>
            ))}
        </div>
      ))}
      <DqTable dqShooters={dqCategories} />
    </>
  );
}

function TagContent({ tagResults, dqTags }: {
  tagResults: Record<string, any>;
  dqTags: DqShooter[];
}) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="print-only hidden text-lg font-bold mb-2">{t('results.byTag')}</h2>
      {Object.entries(tagResults).map(([tag, divisions]) => (
        <div key={tag} className="mb-6 division-results-section">
          <h3 className="font-semibold text-lg mb-2 dark:text-white">{t('results.tag', { tag })}</h3>
          {Object.entries(divisions as Record<string, any[]>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([division, results]) => (
              <div key={division} className="mb-4 ml-2">
                <h4 className="font-medium text-sm text-gray-600 dark:bg-gray-400 mb-1">{divisionLabel(division)}</h4>
                <ResultsTable results={results as any[]} columns={['position', 'shooter', 'matchPercent', 'matchPoints']} />
              </div>
            ))}
        </div>
      ))}
      {Object.keys(tagResults).length === 0 && <p className="text-gray-500 text-center">{t('results.noTags')}</p>}
      <DqTable dqShooters={dqTags} />
    </>
  );
}

export default function ResultsOverview({isPublic}:{isPublic?:true}) {
  const { activeMatchId } = useUIStore();
  const { matches } = useMatchStore();
  const { overallResults, dqOverall, divisionResults, dqDivisions, stageResults, categoryResults, dqCategories, tagResults, dqTags, loading,
          fetchOverall, fetchByDivision, fetchByStage, fetchByCategory, fetchByTag } = useResultsStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ResultTab>('byDivision');

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

      {/* Sticky header + tab bar */}
      <div className={twMerge("sticky before:bg-gray-200 pb-3 dark:before:bg-gray-900 before:absolute before:h-4 before:-top-4 before:w-full  bg-gray-200 dark:bg-gray-900 z-100", isPublic ? "top-19.5" : "top-4")}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">{t('results.title')}</h2>
          <ExportButtons activeTab={activeTab} />
        </div>

        {/* Tab bar (replaces Flowbite Tabs for sticky layout) */}
        <div className="flex flex-wrap gap-x-1 border-b border-gray-200 dark:border-gray-700 -mb-px" role="tablist">
          {TABS.map(({ key, labelKey }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                  : 'cursor-pointer border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content (scrolls normally) */}
      <div className="mt-4">
        {activeTab === 'byDivision' && (
          <DivisionContent divisionResults={divisionResults} dqDivisions={dqDivisions} loading={loading} />
        )}
        {activeTab === 'overall' && (
          <OverallContent overallResults={overallResults} dqOverall={dqOverall} />
        )}
        {activeTab === 'byStage' && (
          <StageContent stageResults={stageResults} />
        )}
        {activeTab === 'byCategory' && (
          <CategoryContent categoryResults={categoryResults} dqCategories={dqCategories} />
        )}
        {activeTab === 'byTag' && (
          <TagContent tagResults={tagResults} dqTags={dqTags} />
        )}
      </div>

      {loading && <p className="text-gray-500 text-center mt-4">{t('results.loading')}</p>}
    </div>
  );
}
