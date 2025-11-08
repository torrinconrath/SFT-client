import React, { useState, useRef } from 'react';

export interface MetricsData {
  responseLatency: number; // in milliseconds
  inferenceSpeed: number; // in tokens/second (estimated)
  timestamp: string;
  messageLength: number;
  modelInfo?: string;
}

interface DevMetricsProps {
  isEnabled: boolean;
  onMetricsUpdate?: (metrics: MetricsData) => void;
  // Callback ref to expose internal functions
  onFunctionsReady?: (functions: {
    startRequestMonitoring: () => void;
    completeRequestMonitoring: (responseText: string, modelInfo?: string) => void;
  }) => void;
}

const DevMetrics: React.FC<DevMetricsProps> = ({ 
  isEnabled, 
  onMetricsUpdate,
  onFunctionsReady 
}) => {
  const [metrics, setMetrics] = useState<MetricsData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const requestStartTime = useRef<number>(0);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simulate model inference speed based on response length and latency
  const calculateInferenceSpeed = (latency: number, textLength: number): number => {
    // Rough estimation: assume average English word = 1.3 tokens, average chars per word = 5
    const estimatedTokens = (textLength / 5) * 1.3;
    const speed = (estimatedTokens / (latency / 1000)); // tokens per second
    return Math.round(speed * 100) / 100;
  };

  // Start monitoring a new request
  const startRequestMonitoring = () => {
    if (!isEnabled) return;
    
    requestStartTime.current = Date.now();
    setIsMonitoring(true);
    
    // Clear any existing timer
    if (requestTimer.current) {
      clearTimeout(requestTimer.current);
    }
  };

  // Complete monitoring and record metrics
  const completeRequestMonitoring = (responseText: string, modelInfo?: string) => {
    if (!isEnabled || !isMonitoring) return;

    const endTime = Date.now();
    const latency = endTime - requestStartTime.current;
    const inferenceSpeed = calculateInferenceSpeed(latency, responseText.length);

    const newMetric: MetricsData = {
      responseLatency: latency,
      inferenceSpeed,
      timestamp: new Date().toISOString(),
      messageLength: responseText.length,
      modelInfo
    };

    setMetrics(prev => {
      const updated = [newMetric, ...prev].slice(0, 50); // Keep last 50 metrics
      return updated;
    });

    onMetricsUpdate?.(newMetric);
    setIsMonitoring(false);
    
    if (requestTimer.current) {
      clearTimeout(requestTimer.current);
      requestTimer.current = null;
    }
  };

  // Export metrics data
  const exportMetrics = () => {
    const dataStr = JSON.stringify(metrics, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chatbot-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Clear all metrics
  const clearMetrics = () => {
    setMetrics([]);
  };

  // Expose functions to parent component
  React.useEffect(() => {
    if (isEnabled && onFunctionsReady) {
      onFunctionsReady({
        startRequestMonitoring,
        completeRequestMonitoring
      });
    }
  }, [isEnabled, onFunctionsReady]);

  // Calculate averages
  const averageLatency = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + m.responseLatency, 0) / metrics.length)
    : 0;

  const averageInferenceSpeed = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.inferenceSpeed, 0) / metrics.length * 100) / 100
    : 0;

  if (!isEnabled) return null;

  return (
    <div className="dev-metrics-panel">
      <div className="metrics-header">
        <h3>Dev Metrics</h3>
        <div className="metrics-controls">
          <button 
            className="metrics-button export-button"
            onClick={exportMetrics}
            disabled={metrics.length === 0}
          >
            📊 Export
          </button>
          <button 
            className="metrics-button clear-button"
            onClick={clearMetrics}
            disabled={metrics.length === 0}
          >
            🗑️ Clear
          </button>
          <div className="monitoring-indicator">
            {isMonitoring ? '🔴 Monitoring...' : '🟢 Ready'}
          </div>
        </div>
      </div>

      <div className="metrics-summary">
        <div className="summary-item">
          <span className="label">Total Requests:</span>
          <span className="value">{metrics.length}</span>
        </div>
        <div className="summary-item">
          <span className="label">Avg Latency:</span>
          <span className="value">{averageLatency}ms</span>
        </div>
        <div className="summary-item">
          <span className="label">Avg Inference Speed:</span>
          <span className="value">{averageInferenceSpeed} t/s</span>
        </div>
      </div>

      <div className="metrics-details">
        <h4>Recent Requests ({metrics.length})</h4>
        <div className="metrics-list">
          {metrics.slice(0, 10).map((metric, index) => (
            <div key={index} className="metric-item">
              <div className="metric-time">
                {new Date(metric.timestamp).toLocaleTimeString()}
              </div>
              <div className="metric-data">
                <span className="latency">📡 {metric.responseLatency}ms</span>
                <span className="speed">⚡ {metric.inferenceSpeed} t/s</span>
                <span className="length">📝 {metric.messageLength} chars</span>
              </div>
            </div>
          ))}
          {metrics.length === 0 && (
            <div className="no-metrics">No metrics recorded yet. Send a message to start monitoring.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevMetrics;