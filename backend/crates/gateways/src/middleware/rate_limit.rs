//! Rate-limit middleware for auth endpoints.

use std::net::{IpAddr, SocketAddr};

use axum::extract::{ConnectInfo, Request, State};
use axum::http::HeaderMap;
use axum::middleware::Next;
use axum::response::Response;
use ipnet::IpNet;
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
/// proxies are configured and the peer is trusted, `X-Forwarded-For` is parsed
/// from right to left (closest to the server), trusted proxies are skipped,
/// and the first untrusted IP is returned. Parsing from right to left prevents
/// clients from prepending spoofed IPs to the header.
///
/// Falls back to the peer address when the peer is not trusted, the header is
/// missing/malformed, or every address in the chain is trusted.
fn client_ip(trusted_proxies: &[String], peer: SocketAddr, headers: &HeaderMap) -> IpAddr {
    let peer_ip = peer.ip();

    if trusted_proxies.is_empty() {
        return peer_ip;
    }

    let trusted_nets = parse_trusted_nets(trusted_proxies);
    if !is_trusted_ip(&peer_ip, &trusted_nets) {
        return peer_ip;
    }

    if let Some(value) = headers.get("x-forwarded-for") {
        if let Ok(value) = value.to_str() {
            for part in value.split(',').map(str::trim).rev() {
                if let Ok(ip) = part.parse::<IpAddr>() {
                    if !is_trusted_ip(&ip, &trusted_nets) {
                        return ip;
                    }
                }
            }
        }
    }

    peer_ip
}

fn parse_trusted_nets(trusted_proxies: &[String]) -> Vec<IpNet> {
    trusted_proxies
        .iter()
        .filter_map(|entry| {
            if let Ok(net) = entry.parse::<IpNet>() {
                return Some(net);
            }
            if let Ok(ip) = entry.parse::<IpAddr>() {
                return Some(IpNet::from(ip));
            }
            None
        })
        .collect()
}

fn is_trusted_ip(ip: &IpAddr, trusted_nets: &[IpNet]) -> bool {
    trusted_nets.iter().any(|net| net.contains(ip))
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
    fn client_ip_parses_x_forwarded_for_right_to_left() {
        let peer = SocketAddr::from(([10, 0, 0, 1], 1234));
        let headers = header_map_with_xff("203.0.113.42, 10.0.0.2, 10.0.0.3");

        let ip = client_ip(&["10.0.0.0/8".to_string()], peer, &headers);

        assert_eq!(ip, IpAddr::from([203, 0, 113, 42]));
    }

    #[test]
    fn client_ip_ignores_spoofed_ips_prepended_to_x_forwarded_for() {
        let peer = SocketAddr::from(([10, 0, 0, 1], 1234));
        // A malicious client prepends a spoofed IP. Right-to-left parsing uses
        // the IP closest to the server (after skipping trusted proxies).
        let headers = header_map_with_xff("1.2.3.4, 203.0.113.42, 10.0.0.2");

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

    #[test]
    fn client_ip_supports_ipv6_cidr_trusted_proxies() {
        let peer = SocketAddr::from(("2001:db8:ff::2".parse::<IpAddr>().unwrap(), 1234));
        let headers = header_map_with_xff("2001:db8::1, 2001:db8:ff::3");

        let ip = client_ip(&["2001:db8:ff::/64".to_string()], peer, &headers);

        assert_eq!(ip, "2001:db8::1".parse::<IpAddr>().unwrap());
    }
}
