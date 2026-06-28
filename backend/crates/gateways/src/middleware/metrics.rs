//! HTTP request metrics middleware.

use std::time::Instant;

use axum::{extract::MatchedPath, extract::Request, middleware::Next, response::Response};

/// Fallback path label used when a request has no matched route template.
///
/// Raw URI paths must not be used as metric labels because unmatched/404
/// requests would create an unbounded number of Prometheus time-series.
const UNKNOWN_PATH: &str = "unknown";

/// Middleware that records request count and duration metrics.
///
/// Uses the matched route template as the `path` label to keep cardinality
/// bounded, falling back to `"unknown"` when no template is available.
pub async fn track(req: Request, next: Next) -> Response {
    let start = Instant::now();
    let path = req
        .extensions()
        .get::<MatchedPath>()
        .map(|p| p.as_str().to_owned())
        .unwrap_or_else(|| UNKNOWN_PATH.to_owned());
    let method = req.method().to_string();

    let response = next.run(req).await;

    let duration = start.elapsed().as_secs_f64();
    let status = response.status().as_u16().to_string();

    metrics::counter!(
        "http_requests_total",
        "method" => method.clone(),
        "path" => path.clone(),
        "status" => status.clone(),
    )
    .increment(1);
    metrics::histogram!(
        "http_request_duration_seconds",
        "method" => method,
        "path" => path,
        "status" => status,
    )
    .record(duration);

    response
}
