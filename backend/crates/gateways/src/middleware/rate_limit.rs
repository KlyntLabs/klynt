//! Rate-limit middleware for auth endpoints.

use std::net::{IpAddr, SocketAddr};

use axum::extract::{ConnectInfo, Request, State};
use axum::http::HeaderMap;
use axum::middleware::Next;
use axum::response::Response;
use persistence::ports::{RateLimitAction, RateLimitScope};

use crate::state::Services;

/// Middleware that rate-limits login attempts.
pub async fn rate_limit_login(
    State(services): State<Services>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Result<Response, crate::GatewayError> {
    let ip = client_ip(&services.trusted_proxies, addr, request.headers());
    check(services, ip, RateLimitAction::Login).await?;
    Ok(next.run(request).await)
}

/// Middleware that rate-limits registration attempts.
pub async fn rate_limit_register(
    State(services): State<Services>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Result<Response, crate::GatewayError> {
    let ip = client_ip(&services.trusted_proxies, addr, request.headers());
    check(services, ip, RateLimitAction::Register).await?;
    Ok(next.run(request).await)
}

async fn check(
    services: Services,
    ip: IpAddr,
    action: RateLimitAction,
) -> Result<(), crate::GatewayError> {
    let decision = services
        .rate_limiter
        .check(RateLimitScope { ip, action })
        .await;

    if decision.allowed {
        Ok(())
    } else {
        let retry_after = decision.retry_after_seconds.unwrap_or(60);
        Err(crate::GatewayError::RateLimited(retry_after))
    }
}

/// Resolve the client IP, taking trusted proxies into account.
///
/// When `trusted_proxies` is empty, the immediate peer address is used. When
/// proxies are configured and the peer is trusted, the left-most untrusted IP
/// from `X-Forwarded-For` is used. Falls back to the peer address on parse
/// errors or when the peer is not trusted.
fn client_ip(trusted_proxies: &[String], peer: SocketAddr, headers: &HeaderMap) -> IpAddr {
    if trusted_proxies.is_empty() {
        return peer.ip();
    }

    let peer_ip = peer.ip();
    if !is_trusted_ip(&peer_ip, trusted_proxies) {
        return peer_ip;
    }

    if let Some(value) = headers.get("x-forwarded-for") {
        if let Ok(value) = value.to_str() {
            for part in value.split(',').map(str::trim) {
                if let Ok(ip) = part.parse::<IpAddr>() {
                    if !is_trusted_ip(&ip, trusted_proxies) {
                        return ip;
                    }
                }
            }
        }
    }

    peer_ip
}

fn is_trusted_ip(ip: &IpAddr, trusted: &[String]) -> bool {
    trusted.iter().any(|entry| matches_trusted(ip, entry))
}

fn matches_trusted(ip: &IpAddr, entry: &str) -> bool {
    if let Ok(trusted_ip) = entry.parse::<IpAddr>() {
        return ip == &trusted_ip;
    }

    if let Some((addr, prefix_str)) = entry.split_once('/') {
        if let (Ok(network), Ok(prefix)) = (addr.parse::<IpAddr>(), prefix_str.parse::<u8>()) {
            return matches_cidr(ip, &network, prefix);
        }
    }

    false
}

fn matches_cidr(ip: &IpAddr, network: &IpAddr, prefix: u8) -> bool {
    match (ip, network) {
        (IpAddr::V4(ip), IpAddr::V4(network)) => {
            let ip_bits = u32::from(*ip);
            let network_bits = u32::from(*network);
            let mask = if prefix == 0 {
                0
            } else {
                u32::MAX << (32 - prefix.min(32))
            };
            ip_bits & mask == network_bits & mask
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn header_map_with_xff(value: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", value.parse().unwrap());
        headers
    }

    #[test]
    fn client_ip_uses_peer_when_no_proxies_configured() {
        let peer = SocketAddr::from(([192, 168, 1, 1], 1234));
        let headers = HeaderMap::new();

        let ip = client_ip(&[], peer, &headers);

        assert_eq!(ip, IpAddr::from([192, 168, 1, 1]));
    }

    #[test]
    fn client_ip_uses_peer_when_not_trusted() {
        let peer = SocketAddr::from(([192, 168, 1, 1], 1234));
        let headers = header_map_with_xff("10.0.0.5");

        let ip = client_ip(&["10.0.0.0/8".to_string()], peer, &headers);

        assert_eq!(ip, IpAddr::from([192, 168, 1, 1]));
    }

    #[test]
    fn client_ip_uses_x_forwarded_for_when_peer_is_trusted() {
        let peer = SocketAddr::from(([127, 0, 0, 1], 1234));
        let headers = header_map_with_xff("203.0.113.42");

        let ip = client_ip(&["127.0.0.1".to_string()], peer, &headers);

        assert_eq!(ip, IpAddr::from([203, 0, 113, 42]));
    }

    #[test]
    fn client_ip_skips_trusted_ips_in_x_forwarded_for() {
        let peer = SocketAddr::from(([10, 0, 0, 1], 1234));
        let headers = header_map_with_xff("203.0.113.42, 10.0.0.2, 10.0.0.3");

        let ip = client_ip(&["10.0.0.0/8".to_string()], peer, &headers);

        assert_eq!(ip, IpAddr::from([203, 0, 113, 42]));
    }

    #[test]
    fn client_ip_falls_back_to_peer_on_malformed_xff() {
        let peer = SocketAddr::from(([127, 0, 0, 1], 1234));
        let headers = header_map_with_xff("not-an-ip");

        let ip = client_ip(&["127.0.0.1".to_string()], peer, &headers);

        assert_eq!(ip, IpAddr::from([127, 0, 0, 1]));
    }
}
