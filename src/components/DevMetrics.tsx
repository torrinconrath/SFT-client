import React from "react";
import type { MetricsData } from "../hooks/useDevMetrics";

interface DevMetricsProps {
  isEnabled: boolean;
  metrics: MetricsData[];
  clearMetrics: () => void;
}

const DevMetrics: React.FC<DevMetricsProps> = ({ isEnabled, metrics, clearMetrics }) => {
  if (!isEnabled) return null;

  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const avgTotal = avg(metrics.map((m) => m.totalTime));
  const avgInference = avg(metrics.map((m) => m.inferenceTime));
  const avgLatency = avg(metrics.map((m) => m.latency));

  return (
    <div className="dev-metrics-panel">
      <div className="metrics-header">
        <h3>Dev Metrics</h3>
        <button className="metrics-button clear-button" onClick={clearMetrics}>
          🗑️ Clear
        </button>
      </div>

      <div className="metrics-summary">
        <div>🕓 Avg Total Time: {avgTotal} ms</div>
        <div>⚙️ Avg Inference: {avgInference} ms</div>
        <div>🌐 Avg Latency: {avgLatency} ms</div>
        <div>📦 Total Samples: {metrics.length}</div>
      </div>

      <div className="metrics-details">
        <h4>Recent</h4>
        <ul>
          {metrics.slice(0, 10).map((m, i) => (
            <li key={i}>
              [{new Date(m.timestamp).toLocaleTimeString()}] 🕓 {m.totalTime.toFixed(0)}ms | ⚙️{" "}
              {m.inferenceTime.toFixed(0)}ms | 🌐 {m.latency.toFixed(0)}ms
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DevMetrics;
