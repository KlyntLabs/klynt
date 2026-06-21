//! Request-scoped context: request_id, trace_id, client IP, user agent, timing.
//!
//! Replaces the simpler `propagate_request_id` middleware with a richer context
//! that drives structured logging and the response envelope.
//!
//! # Spawn constraint
//!
//! `RequestContext` is stored in a `tokio::task_local!`. It does **not**
//! propagate across `tokio::spawn`. Code that spawns detached work must
//! explicitly capture the `RequestContext` value before spawning.

use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use std::time::Instant;

use axum::{
    extract::{ConnectInfo, Request, State},
    http::{request::Parts, HeaderMap},
    middleware::Next,
    response::Response,
};
use tracing::{info, instrument};
use uuid::Uuid;

use crate::middleware::RequestId;
use crate::state::AppState;

const REQUEST_ID_HEADER: &str = "x-request-id";
const TRACE_ID_HEADER: &str = "x-trace-id";

/// Request-scoped context built from headers and connection info.
#[derive(Debug, Clone)]
pub struct RequestContext {
    pub request_id: Uuid,
    pub trace_id: Uuid,
    pub client_ip: Option<String>,
    pub user_agent: Option<String>,
    pub start_time: Instant,
}

// Task-local storage so handlers and middleware can read the context
// without threading it through every function signature.
tokio::task_local! {
    static CURRENT: Option<RequestContext>;
}

impl RequestContext {
    /// Try to read the current context from task-local storage.
    pub fn current() -> Option<Self> {
        CURRENT.try_with(|ctx| ctx.clone()).ok().flatten()
    }

    /// Scope a future inside task-local storage holding this context.
    pub async fn scope<F, R>(self, future: F) -> R
    where
        F: std::future::Future<Output = R>,
    {
        CURRENT.scope(Some(self), future).await
    }
}

/// Parse a UUID from a header, generating a new v4 if absent or unparseable.
fn parse_or_generate(headers: &HeaderMap, name: &str) -> Uuid {
    headers
        .get(name)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::new_v4)
}

/// Extract the client IP from headers, honoring trusted proxies.
///
/// If `trusted_proxies` is empty, the socket address IP is returned directly
/// (no header trust). If the socket IP is in the trusted set, `X-Forwarded-For`
/// is parsed rightmost-to-leftmost, skipping trusted IPs, taking the first
/// untrusted IP as the client.
pub fn extract_client_ip(
    headers: &HeaderMap,
    socket_addr: SocketAddr,
    trusted_proxies: &[String],
) -> Option<String> {
    let socket_ip = socket_addr.ip();

    // No trusted proxies configured → trust only the direct connection.
    if trusted_proxies.is_empty() {
        return Some(socket_ip.to_string());
    }

    // If the direct connection is not a trusted proxy, use its IP.
    if !is_trusted_proxy(socket_ip, trusted_proxies) {
        return Some(socket_ip.to_string());
    }

    // The direct connection IS a trusted proxy → parse X-Forwarded-For.
    if let Some(xff) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        // Parse all IPs in the chain, rightmost to leftmost.
        let ips: Vec<IpAddr> = xff
            .split(',')
            .filter_map(|s| s.trim().parse::<IpAddr>().ok())
            .collect();

        // Walk right-to-left, skip trusted proxies, take first untrusted.
        for ip in ips.iter().rev() {
            if !is_trusted_proxy(*ip, trusted_proxies) {
                return Some(ip.to_string());
            }
        }
    }

    // Fallback: x-real-ip if the socket is a trusted proxy.
    if let Some(real_ip) = headers
        .get("x-real-ip")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<IpAddr>().ok())
    {
        return Some(real_ip.to_string());
    }

    Some(socket_ip.to_string())
}

/// Check whether an IP falls within any of the trusted-proxy CIDR ranges.
///
/// Currently supports exact IP matching and `/8`–`/32` IPv4 CIDR.
fn is_trusted_proxy(ip: IpAddr, trusted_proxies: &[String]) -> bool {
    for cidr in trusted_proxies {
        if ip_matches_cidr(ip, cidr) {
            return true;
        }
    }
    false
}

/// Match an IP against a CIDR string (supports IPv4 `/n` notation and exact IPs).
fn ip_matches_cidr(ip: IpAddr, cidr: &str) -> bool {
    if let Some((net_str, prefix_str)) = cidr.split_once('/') {
        if let (IpAddr::V4(addr), Ok(net), Ok(prefix)) = (
            ip,
            net_str.parse::<std::net::Ipv4Addr>(),
            prefix_str.parse::<u32>(),
        ) {
            if prefix > 32 {
                return false;
            }
            let mask = if prefix == 0 {
                0
            } else {
                (!0u32) << (32 - prefix)
            };
            let addr_bits = u32::from(addr);
            let net_bits = u32::from(net);
            return (addr_bits & mask) == (net_bits & mask);
        }
    }
    // Exact IP match (no prefix).
    cidr.parse::<IpAddr>().map(|c| c == ip).unwrap_or(false)
}

/// Build a `RequestContext` from request headers and connection info.
pub fn build_request_context(
    headers: &HeaderMap,
    socket_addr: SocketAddr,
    trusted_proxies: &[String],
) -> RequestContext {
    RequestContext {
        request_id: parse_or_generate(headers, REQUEST_ID_HEADER),
        trace_id: parse_or_generate(headers, TRACE_ID_HEADER),
        client_ip: extract_client_ip(headers, socket_addr, trusted_proxies),
        user_agent: headers
            .get("user-agent")
            .and_then(|v| v.to_str().ok())
            .map(String::from),
        start_time: Instant::now(),
    }
}

/// Middleware: build `RequestContext`, insert into extensions + task-local,
/// record tracing span fields, echo `x-request-id`.
#[instrument(skip(state, req, next), fields(request_id, trace_id))]
pub async fn request_context(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    mut req: Request,
    next: Next,
) -> Response {
    let ctx = build_request_context(req.headers(), addr, &state.config().api.trusted_proxies);

    // Insert typed extensions for extractors.
    req.extensions_mut().insert(RequestId(ctx.request_id));
    req.extensions_mut().insert(ctx.clone());

    // Record span fields.
    tracing::Span::current()
        .record("request_id", ctx.request_id.to_string())
        .record("trace_id", ctx.trace_id.to_string());

    info!(
        request_id = %ctx.request_id,
        trace_id = %ctx.trace_id,
        client_ip = ctx.client_ip.as_deref().unwrap_or("unknown"),
        method = %req.method(),
        path = %req.uri().path(),
        "Request started"
    );

    let mut response = ctx.clone().scope(next.run(req)).await;

    // Echo request_id on the response.
    if let Ok(value) = axum::http::HeaderValue::from_str(&ctx.request_id.to_string()) {
        response.headers_mut().insert(REQUEST_ID_HEADER, value);
    }

    response
}

impl<S: Send + Sync> axum::extract::FromRequestParts<S> for RequestContext {
    type Rejection = axum::http::StatusCode;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<RequestContext>()
            .cloned()
            .ok_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::{HeaderMap, HeaderValue};
    use std::net::{IpAddr, Ipv4Addr};

    fn socket() -> SocketAddr {
        SocketAddr::new(IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)), 8080)
    }

    #[test]
    fn no_trusted_proxies_uses_socket_ip() {
        let headers = HeaderMap::new();
        let ip = extract_client_ip(&headers, socket(), &[]).unwrap();
        assert_eq!(ip, "127.0.0.1");
    }

    #[test]
    fn untrusted_socket_ignores_xff() {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", HeaderValue::from_static("203.0.113.5"));
        // Socket is 127.0.0.1, which is NOT in trusted_proxies → use socket.
        let ip = extract_client_ip(&headers, socket(), &["10.0.0.0/8".to_string()]).unwrap();
        assert_eq!(ip, "127.0.0.1");
    }

    #[test]
    fn trusted_socket_parses_xff_right_to_left() {
        let mut headers = HeaderMap::new();
        // Client → proxy1 (trusted) → proxy2 (trusted) → us
        headers.insert(
            "x-forwarded-for",
            HeaderValue::from_static("203.0.113.5, 10.0.0.1, 10.0.0.2"),
        );
        // Our socket is a trusted proxy (10.0.0.2).
        let sock = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(10, 0, 0, 2)), 8080);
        let ip = extract_client_ip(&headers, sock, &["10.0.0.0/8".to_string()]).unwrap();
        // Rightmost trusted is 10.0.0.1 (skip), next is 203.0.113.5 (untrusted).
        assert_eq!(ip, "203.0.113.5");
    }

    #[test]
    fn trusted_socket_all_proxies_in_chain_falls_back_to_socket() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-forwarded-for",
            HeaderValue::from_static("10.0.0.1, 10.0.0.2"),
        );
        let sock = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(10, 0, 0, 2)), 8080);
        let ip = extract_client_ip(&headers, sock, &["10.0.0.0/8".to_string()]).unwrap();
        // All XFF IPs are trusted → falls back to socket.
        assert_eq!(ip, "10.0.0.2");
    }

    #[test]
    fn build_context_reads_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "x-request-id",
            HeaderValue::from_static("550e8400-e29b-41d4-a716-446655440000"),
        );
        headers.insert(
            "x-trace-id",
            HeaderValue::from_static("660e8400-e29b-41d4-a716-446655440000"),
        );
        headers.insert("user-agent", HeaderValue::from_static("test-agent/1.0"));

        let ctx = build_request_context(&headers, socket(), &[]);
        assert_eq!(
            ctx.request_id.to_string(),
            "550e8400-e29b-41d4-a716-446655440000"
        );
        assert_eq!(
            ctx.trace_id.to_string(),
            "660e8400-e29b-41d4-a716-446655440000"
        );
        assert_eq!(ctx.user_agent.as_deref(), Some("test-agent/1.0"));
        assert_eq!(ctx.client_ip.as_deref(), Some("127.0.0.1"));
    }

    #[test]
    fn build_context_generates_ids_when_headers_absent() {
        let headers = HeaderMap::new();
        let ctx = build_request_context(&headers, socket(), &[]);
        // Generated UUIDs are not nil.
        assert_ne!(ctx.request_id, Uuid::nil());
        assert_ne!(ctx.trace_id, Uuid::nil());
    }

    #[test]
    fn cidr_matching_ipv4() {
        assert!(ip_matches_cidr("10.0.0.5".parse().unwrap(), "10.0.0.0/8"));
        assert!(!ip_matches_cidr(
            "203.0.113.5".parse().unwrap(),
            "10.0.0.0/8"
        ));
        assert!(ip_matches_cidr(
            "192.168.1.1".parse().unwrap(),
            "192.168.1.0/24"
        ));
        assert!(ip_matches_cidr("127.0.0.1".parse().unwrap(), "127.0.0.1"));
    }
}
