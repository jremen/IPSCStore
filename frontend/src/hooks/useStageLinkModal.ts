//Hook for QR code generation stage link modal

import { useCallback, useEffect, useState } from "react";
import { StageLinkModalProps } from "../components/layout/StageLinkModal";
import { api } from "../services/api";


interface StageItem {
  id: string;
  name: string;
  stageNumber: number;
  matchName: string;
}

export interface MintedToken {
  stageId: string;
  stageName: string;
  stageNumber: number;
  url: string;
  expiresAt: string;
}

export default function useStageLinkModal({show, onClose, activeMatchId}:StageLinkModalProps) {

    const [stages, setStages] = useState<StageItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [mintedTokens, setMintedTokens] = useState<MintedToken[]>([]);
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [ttl, setTtl] = useState(5 * 60 * 60);
  
    // Fetch stages with passwords set
    useEffect(() => {
      if (!show) return;
      (async () => {
        setLoading(true);
        try {
          const result = await api.auth.getStages(activeMatchId || undefined);
          setStages(result);
        } catch {
          // Failed to fetch stages
        }
        setLoading(false);
      })();
    }, [show, activeMatchId]);
  
    // Fetch active tokens
    const fetchActiveTokens = useCallback(async () => {
      try {
        const tokens = await api.auth.getActiveStageLinkTokens(activeMatchId || undefined);
        setMintedTokens(tokens.map(t => ({
          stageId: t.stageId,
          stageName: t.stageName,
          stageNumber: t.stageNumber,
          url: t.url,
          expiresAt: t.expiresAt,
        })));
      } catch {
        // Failed to fetch active tokens
      }
    }, [activeMatchId]);
  
    useEffect(() => {
      if (show) fetchActiveTokens();
    }, [show, fetchActiveTokens]);
  
    const handleGenerate = async (stageId: string) => {
      try {
        const result = await api.auth.createStageLinkToken(stageId, ttl);
        setMintedTokens(prev => {
          const filtered = prev.filter(t => t.stageId !== stageId);
          return [...filtered, {
            stageId: result.stageId,
            stageName: result.stageName,
            stageNumber: stages.find(s => s.id === stageId)?.stageNumber || 0,
            url: result.url,
            expiresAt: result.expiresAt,
          }];
        });
        setSelectedStageId(stageId);
      } catch (err) {
        console.error('Failed to generate token:', err);
      }
    };
  
    const handleGenerateAll = async () => {
      for (const stage of stages) {
        await handleGenerate(stage.id);
      }
      if (stages.length > 0) {
        setSelectedStageId(stages[0].id);
      }
    };
  
    const handleRevokeAll = async () => {
      try {
        await api.auth.revokeStageLinkTokens(activeMatchId || undefined);
        setMintedTokens([]);
        setSelectedStageId(null);
      } catch (err) {
        console.error('Failed to revoke tokens:', err);
      }
    };
  
    const handleClose = () => {
      setSelectedStageId(null);
      onClose();
    };
  
    // Navigation helpers
    const navigatePrev = useCallback(() => {
      if (mintedTokens.length < 2) return;
      const idx = mintedTokens.findIndex(t => t.stageId === selectedStageId);
      const prevIdx = (idx - 1 + mintedTokens.length) % mintedTokens.length;
      setSelectedStageId(mintedTokens[prevIdx].stageId);
    }, [mintedTokens, selectedStageId]);
  
    const navigateNext = useCallback(() => {
      if (mintedTokens.length < 2) return;
      const idx = mintedTokens.findIndex(t => t.stageId === selectedStageId);
      const nextIdx = (idx + 1) % mintedTokens.length;
      setSelectedStageId(mintedTokens[nextIdx].stageId);
    }, [mintedTokens, selectedStageId]);
  
    // Keyboard navigation
    useEffect(() => {
      if (!show || mintedTokens.length < 2 || !selectedStageId) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); navigatePrev(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); navigateNext(); }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [show, mintedTokens, selectedStageId, navigatePrev, navigateNext]);
  
    const currentMinted = selectedStageId ? mintedTokens.find(t => t.stageId === selectedStageId) : null;

    return {
      currentMinted,
      stages,
      mintedTokens,
      handleGenerate,
      handleGenerateAll,
      handleRevokeAll,
      selectedStageId,
      setSelectedStageId,
      loading,
      ttl,
      setTtl,
      navigatePrev,
      navigateNext,
      handleClose
    };
}
