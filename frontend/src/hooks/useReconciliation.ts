import { useCallback, useEffect, useState } from "react";
import { useTimelineTrackStore } from "../stores/TimelineTrackStore";
import { useCueSceneStore } from "../stores/CueSceneStore";
import { useConsoleExecutionStore } from "../stores/ConsoleExecutionStore";
import { useReconciliationStore } from "../stores/ReconciliationStore";
import { RECONCILIATION_CONFIG } from "../config";

export function useReconciliation() {
  const tracks = useTimelineTrackStore((state) => state.rows);
  const loadTracks = useTimelineTrackStore((state) => state.load);
  const scenes = useCueSceneStore((state) => state.rows);
  const loadScenes = useCueSceneStore((state) => state.load);
  const consoleRecords = useConsoleExecutionStore((state) => state.rows);
  const consoleLoading = useConsoleExecutionStore((state) => state.loading);
  const fallbackCount = useConsoleExecutionStore((state) => state.fallbackCount);
  const loadConsole = useConsoleExecutionStore((state) => state.load);
  const importConsoleText = useConsoleExecutionStore((state) => state.importText);
  const clearConsole = useConsoleExecutionStore((state) => state.clear);

  const reconciliation = useReconciliationStore((state) => state.current);
  const results = useReconciliationStore((state) => state.results);
  const phase = useReconciliationStore((state) => state.phase);
  const error = useReconciliationStore((state) => state.error);
  const fingerprint = useReconciliationStore((state) => state.fingerprint);
  const loadOrchestration = useReconciliationStore((state) => state.loadOrchestration);
  const startReconciliation = useReconciliationStore((state) => state.start);
  const retryReconciliation = useReconciliationStore((state) => state.retry);
  const resetReconciliation = useReconciliationStore((state) => state.reset);

  const [showStartConsoleMs, setShowStartConsoleMs] = useState(RECONCILIATION_CONFIG.clockAlignDefaultMs);

  useEffect(() => {
    loadTracks();
    loadScenes();
    loadConsole();
  }, [loadTracks, loadScenes, loadConsole]);

  useEffect(() => {
    if (tracks.length > 0 || scenes.length > 0) {
      loadOrchestration(tracks, scenes);
    }
  }, [tracks, scenes, loadOrchestration]);

  const importRecords = useCallback(async (text: string) => {
    return importConsoleText(text, scenes);
  }, [importConsoleText, scenes]);

  const start = useCallback(async () => {
    await startReconciliation(consoleRecords, showStartConsoleMs);
  }, [startReconciliation, consoleRecords, showStartConsoleMs]);

  const retry = useCallback(async () => {
    await retryReconciliation(consoleRecords, showStartConsoleMs);
  }, [retryReconciliation, consoleRecords, showStartConsoleMs]);

  return {
    tracks,
    scenes,
    consoleRecords,
    consoleLoading,
    fallbackCount,
    reconciliation,
    results,
    phase,
    error,
    fingerprint,
    showStartConsoleMs,
    setShowStartConsoleMs,
    importRecords,
    clearConsole,
    start,
    retry,
    reset: resetReconciliation
  };
}
