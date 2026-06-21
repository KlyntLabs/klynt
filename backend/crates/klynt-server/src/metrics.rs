//! Prometheus metrics registry and `/metrics` endpoint.

use std::sync::OnceLock;
use std::time::Instant;

use axum::{
    body::Body,
    extract::Request,
    http::{Response, StatusCode},
    middleware::Next,
    response::IntoResponse,
};
use prometheus::{Encoder, HistogramVec, IntCounterVec, IntGauge, Opts, Registry, TextEncoder};

/// Global metrics registry. Initialized once at startup.
static REGISTRY: OnceLock<Registry> = OnceLock::new();

struct AppMetrics {
    http_requests_total: IntCounterVec,
    http_request_duration: HistogramVec,
    active_requests: IntGauge,
}

static METRICS: OnceLock<AppMetrics> = OnceLock::new();

/// Get the global registry (panics if not initialized — call init_metrics first).
pub fn registry() -> &'static Registry {
    REGISTRY.get().expect("metrics not initialized")
}

/// Initialize the global metrics registry. Call once at startup.
pub fn init_metrics() {
    let r = Registry::new();

    let http_requests_total = IntCounterVec::new(
        Opts::new("http_requests_total", "Total HTTP requests"),
        &["method", "path", "status"],
    )
    .unwrap();
    r.register(Box::new(http_requests_total.clone())).unwrap();

    let http_request_duration = HistogramVec::new(
        prometheus::HistogramOpts::new(
            "http_request_duration_seconds",
            "HTTP request duration in seconds",
        )
        .buckets(vec![
            0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
        ]),
        &["method", "path"],
    )
    .unwrap();
    r.register(Box::new(http_request_duration.clone())).unwrap();

    let active_requests =
        IntGauge::new("active_requests", "Active in-flight HTTP requests").unwrap();
    r.register(Box::new(active_requests.clone())).unwrap();

    METRICS.get_or_init(|| AppMetrics {
        http_requests_total,
        http_request_duration,
        active_requests,
    });
    REGISTRY.set(r).ok(); // Ignore if already set (tests).
}

/// Normalize a path to reduce Prometheus label cardinality.
/// `/api/v1/users/550e8400-...` → `/api/v1/users/:id`
/// UUIDs and numeric IDs are replaced with `:id`.
pub fn normalize_path(path: &str) -> String {
    let segments: Vec<&str> = path.split('/').collect();
    let normalized: Vec<String> = segments
        .iter()
        .map(|seg| {
            if seg.is_empty() {
                String::new()
            } else if is_dynamic_segment(seg) {
                ":id".to_string()
            } else {
                seg.to_string()
            }
        })
        .collect();
    normalized.join("/")
}

/// A segment is "dynamic" if it's a UUID or a pure number.
fn is_dynamic_segment(seg: &str) -> bool {
    // UUID (v4): 8-4-4-4-12 hex chars with hyphens.
    if seg.len() == 36 && seg.matches('-').count() == 4 {
        return uuid::Uuid::parse_str(seg).is_ok();
    }
    // Pure number.
    seg.chars().all(|c| c.is_ascii_digit()) && !seg.is_empty()
}

/// Axum middleware: record request count, duration, and in-flight gauge.
pub async fn metrics_middleware(req: Request, next: Next) -> Response<Body> {
    let metrics = METRICS.get().expect("metrics not initialized");
    let method = req.method().to_string();
    let raw_path = req.uri().path().to_string();
    let path = normalize_path(&raw_path);

    let mut timer = RequestTimer {
        start: Instant::now(),
        method: method.clone(),
        path: path.clone(),
        metrics,
        status: None,
    };
    metrics.active_requests.inc();

    let response = next.run(req).await;
    timer.status = Some(response.status().as_u16() as u32);
    response
}

/// Zero-boilerplate duration recorder — records on Drop.
struct RequestTimer<'a> {
    start: Instant,
    method: String,
    path: String,
    metrics: &'a AppMetrics,
    status: Option<u32>,
}

impl<'a> Drop for RequestTimer<'a> {
    fn drop(&mut self) {
        self.metrics.active_requests.dec();
        if let Some(status) = self.status {
            self.metrics
                .http_requests_total
                .with_label_values(&[&self.method, &self.path, &status.to_string()])
                .inc();
            let elapsed = self.start.elapsed().as_secs_f64();
            self.metrics
                .http_request_duration
                .with_label_values(&[&self.method, &self.path])
                .observe(elapsed);
        }
    }
}

/// Handler for `GET /metrics` — returns Prometheus text format.
pub async fn metrics_handler() -> impl IntoResponse {
    let registry = registry();
    let mut buffer = Vec::new();
    let encoder = TextEncoder::new();
    encoder.encode(&registry.gather(), &mut buffer).unwrap();

    match String::from_utf8(buffer) {
        Ok(text) => (
            StatusCode::OK,
            [("Content-Type", encoder.format_type())],
            text,
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "failed to encode metrics",
        )
            .into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::routing::get;
    use axum::Router;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    async fn ok_handler() -> impl IntoResponse {
        (StatusCode::OK, "ok")
    }

    #[tokio::test]
    async fn middleware_records_request_metrics() {
        init_metrics();

        let app = Router::new()
            .route("/", get(ok_handler))
            .route("/users/{id}", get(ok_handler))
            .layer(axum::middleware::from_fn(metrics_middleware));

        let response = app
            .clone()
            .oneshot(axum::http::Request::get("/").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // Scrape /metrics and verify the request was recorded.
        let metrics_response = app
            .route("/metrics", get(metrics_handler))
            .oneshot(
                axum::http::Request::get("/metrics")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(metrics_response.status(), StatusCode::OK);
        let body = metrics_response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes();
        let text = String::from_utf8(body.to_vec()).unwrap();

        assert!(text.contains("http_requests_total{method=\"GET\",path=\"/\",status=\"200\"}"));
        assert!(text.contains("http_request_duration_seconds_count{method=\"GET\",path=\"/\"}"));
        assert!(text.contains("active_requests 0"));
    }

    #[tokio::test]
    async fn middleware_normalizes_path_for_route_params() {
        init_metrics();

        let app = Router::new()
            .route("/users/{id}", get(ok_handler))
            .layer(axum::middleware::from_fn(metrics_middleware));

        let response = app
            .clone()
            .oneshot(
                axum::http::Request::get("/users/550e8400-e29b-41d4-a716-446655440000")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let metrics_response = app
            .route("/metrics", get(metrics_handler))
            .oneshot(
                axum::http::Request::get("/metrics")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let body = metrics_response
            .into_body()
            .collect()
            .await
            .unwrap()
            .to_bytes();
        let text = String::from_utf8(body.to_vec()).unwrap();

        assert!(
            text.contains("http_requests_total{method=\"GET\",path=\"/users/:id\",status=\"200\"}")
        );
    }

    #[test]
    fn normalize_path_replaces_uuid() {
        let path = "/api/v1/users/550e8400-e29b-41d4-a716-446655440000";
        assert_eq!(normalize_path(path), "/api/v1/users/:id");
    }

    #[test]
    fn normalize_path_replaces_numeric_id() {
        assert_eq!(normalize_path("/api/v1/posts/42"), "/api/v1/posts/:id");
    }

    #[test]
    fn normalize_path_preserves_static_segments() {
        assert_eq!(
            normalize_path("/api/v1/auth/register"),
            "/api/v1/auth/register"
        );
    }

    #[test]
    fn normalize_path_preserves_health() {
        assert_eq!(normalize_path("/api/v1/health/live"), "/api/v1/health/live");
    }

    #[test]
    fn is_dynamic_detects_uuid() {
        assert!(is_dynamic_segment("550e8400-e29b-41d4-a716-446655440000"));
    }

    #[test]
    fn is_dynamic_detects_number() {
        assert!(is_dynamic_segment("12345"));
        assert!(!is_dynamic_segment("abc"));
    }
}
