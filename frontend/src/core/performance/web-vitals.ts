import { type Metric, onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

interface WebVitalsReport {
  name: Metric["name"];
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta?: number;
  id: string;
  navigationType?: Metric["navigationType"];
}

function sendToAnalytics(report: WebVitalsReport) {
  // In production, replace this with a real analytics endpoint.
  if (import.meta.env.PROD) {
    // Example: navigator.sendBeacon('/api/analytics/vitals', JSON.stringify(report));
    // eslint-disable-next-line no-console
    console.log("[web-vitals]", report);
  } else {
    // eslint-disable-next-line no-console
    console.log("[web-vitals]", report);
  }
}

function reportMetric(metric: Metric) {
  sendToAnalytics({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  });
}

export function reportWebVitals() {
  onCLS(reportMetric);
  onINP(reportMetric);
  onFCP(reportMetric);
  onLCP(reportMetric);
  onTTFB(reportMetric);
}
