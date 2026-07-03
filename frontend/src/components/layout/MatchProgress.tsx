import { memo, useEffect } from "react";
import { useMatchStore } from "../../stores/matchStore";
import { useUIStore } from "../../stores/uiStore";
import { Progress } from "flowbite-react";
import { useMatchProgress } from "../../hooks/useMatchProgress";
import { useSSEStore } from "../../stores/sseStore";

const POLL_INTERVAL_MS = 60000;
const SSE_FALLBACK_INTERVAL_MS = 300000;

const MatchProgress = () => {
const runningMatchId = useMatchStore((s) => s.runningMatch?.id);
const activeMatchId = useUIStore((s) => s.activeMatchId);
const effectiveMatchId = runningMatchId ?? activeMatchId;
const sseConnected = useSSEStore((s) => s.connected);
const {scoredLength, stagesLength, registrationsLength, fetchRegistrations, fetchScoringProgress, fetchStages} = useMatchProgress();

  // fetch + polling (ONLY side effects)
  useEffect(() => {
    if (!effectiveMatchId) return;

    fetchRegistrations(effectiveMatchId);
    fetchStages(effectiveMatchId);
    fetchScoringProgress(effectiveMatchId);

    const interval = setInterval(() => {
      fetchScoringProgress(effectiveMatchId);
    }, sseConnected ? SSE_FALLBACK_INTERVAL_MS : POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [effectiveMatchId, sseConnected]);

  // ✅ ALWAYS derived during render (NO useEffect)
  const full = stagesLength * registrationsLength;

  const progressValue =
    full > 0
      ? Math.min(100, Number(((scoredLength / full) * 100).toFixed(2)))
      : 0;

  return (
    <div className="ml-auto mr-4">
      <Progress
        className="flex-1 w-48 eink:border eink:border-black! eink:text-white!"
        color="blue"
        size="lg"
        progress={progressValue}
        labelProgress
      />
    </div>
  );
};

export default memo(MatchProgress);
