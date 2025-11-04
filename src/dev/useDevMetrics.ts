import { useRef, useCallback } from 'react';

interface UseDevMetricsReturn {
  startMonitoring: () => void;
  completeMonitoring: (responseText: string, modelInfo?: string) => void;
}

export const useDevMetrics = (isEnabled: boolean): UseDevMetricsReturn => {
  const devMetricsRef = useRef<{
    startRequestMonitoring: (() => void) | null;
    completeRequestMonitoring: ((responseText: string, modelInfo?: string) => void) | null;
  }>({ startRequestMonitoring: null, completeRequestMonitoring: null });

  const startMonitoring = useCallback(() => {
    if (isEnabled && devMetricsRef.current.startRequestMonitoring) {
      devMetricsRef.current.startRequestMonitoring();
    }
  }, [isEnabled]);

  const completeMonitoring = useCallback((responseText: string, modelInfo?: string) => {
    if (isEnabled && devMetricsRef.current.completeRequestMonitoring) {
      devMetricsRef.current.completeRequestMonitoring(responseText, modelInfo);
    }
  }, [isEnabled]);

  return {
    startMonitoring,
    completeMonitoring,
  };
};