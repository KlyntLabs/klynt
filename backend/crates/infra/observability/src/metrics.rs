//! Prometheus metrics recorder.

use std::sync::LazyLock;

pub use metrics_exporter_prometheus::PrometheusHandle;
use metrics_exporter_prometheus::{Matcher, PrometheusBuilder};

static PROMETHEUS_HANDLE: LazyLock<PrometheusHandle> = LazyLock::new(|| {
    PrometheusBuilder::new()
        .set_buckets_for_metric(
            Matcher::Full("http_request_duration_seconds".to_string()),
            &[
                0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
            ],
        )
        .expect("http_request_duration_seconds buckets should be valid")
        .install_recorder()
        .expect("prometheus recorder should install exactly once")
});

/// Install the global Prometheus recorder and return a handle for rendering.
///
/// The recorder is installed lazily and exactly once across the process
/// lifetime. Subsequent calls return a clone of the same handle.
pub fn install_recorder() -> PrometheusHandle {
    PROMETHEUS_HANDLE.clone()
}
