use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    extract::{ConnectInfo, Request, State},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

use klynt_domain::ports::{RateLimitDecision, RateLimiter};

use crate::error::{AppError, AppErrorKind};
use crate::request_context::RequestId;

/// Build the `AppError` returned when a request is rate-limited.
fn rate_limit_error(decision: RateLimitDecision, request_id: Uuid) -> Option<AppError> {
    if !decision.allowed {
        let kind = AppErrorKind::RateLimited {
            retry_after_seconds: decision.retry_after_seconds,
        };
        Some(AppError::new(kind, request_id))
    } else {
        None
    }
}

/// Axum middleware that rejects requests once the client IP exceeds the rate limit.
pub async fn rate_limit(
    State(rate_limiter): State<Arc<dyn RateLimiter>>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let request_id = request
        .extensions()
        .get::<RequestId>()
        .map(|r| r.0)
        .unwrap_or_else(Uuid::new_v4);

    let decision = match request.extensions().get::<ConnectInfo<SocketAddr>>() {
        Some(ConnectInfo(addr)) => rate_limiter.check(addr.ip()).await,
        None => RateLimitDecision::allowed(),
    };

    if let Some(err) = rate_limit_error(decision, request_id) {
        return Err(err);
    }

    Ok(next.run(request).await)
}

#[cfg(test)]
mod tests {
    use std::net::{IpAddr, Ipv4Addr, SocketAddr};

    use axum::body::Body;
    use axum::http::StatusCode;
    use tower::{Layer, ServiceExt};

    use super::*;
    use crate::error::ServiceError;

    #[derive(Clone)]
    struct MockLimiter {
        decision: RateLimitDecision,
    }

    #[async_trait::async_trait]
    impl RateLimiter for MockLimiter {
        async fn check(&self, _ip: IpAddr) -> RateLimitDecision {
            self.decision.clone()
        }
    }

    fn request_with_connect_info(addr: SocketAddr) -> Request {
        let mut req = Request::new(Body::empty());
        req.extensions_mut().insert(ConnectInfo(addr));
        req
    }

    #[test]
    fn allowed_decision_returns_no_error() {
        let err = rate_limit_error(RateLimitDecision::allowed(), Uuid::nil());
        assert!(err.is_none());
    }

    #[test]
    fn denied_decision_returns_rate_limited_error_with_retry_after() {
        let err = rate_limit_error(RateLimitDecision::denied(42), Uuid::nil()).unwrap();
        assert_eq!(err.error_code(), "RATE_LIMITED");
        assert_eq!(err.retry_after_seconds(), Some(42));
    }

    fn ok_router() -> axum::Router {
        axum::Router::new().route("/", axum::routing::any(|| async { StatusCode::OK }))
    }

    #[tokio::test]
    async fn middleware_allows_request_when_limiter_allows() {
        let limiter = Arc::new(MockLimiter {
            decision: RateLimitDecision::allowed(),
        }) as Arc<dyn RateLimiter>;
        let req = request_with_connect_info(SocketAddr::new(
            IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
            1234,
        ));

        let svc = axum::middleware::from_fn_with_state(limiter, rate_limit).layer(ok_router());
        let response = svc.oneshot(req).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn middleware_short_circuits_when_limiter_denies() {
        let limiter = Arc::new(MockLimiter {
            decision: RateLimitDecision::denied(17),
        }) as Arc<dyn RateLimiter>;
        let req = request_with_connect_info(SocketAddr::new(
            IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
            1234,
        ));

        let svc = axum::middleware::from_fn_with_state(limiter, rate_limit).layer(ok_router());
        let response = svc.oneshot(req).await.unwrap();

        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        let header = response
            .headers()
            .get(axum::http::header::RETRY_AFTER)
            .and_then(|v| v.to_str().ok());
        assert_eq!(header, Some("17"));
    }
}
