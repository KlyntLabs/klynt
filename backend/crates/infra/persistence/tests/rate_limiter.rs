//! Integration tests for the Redis-backed rate limiter.

use config::RateLimiterConfig;
use persistence::ports::{RateLimitAction, RateLimitScope, RateLimiter};
use persistence::rate_limiter::RedisRateLimiter;
use std::net::{IpAddr, Ipv4Addr};
use uuid::Uuid;

fn redis_url() -> String {
    std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379/0".to_string())
}

fn enabled_config() -> RateLimiterConfig {
    RateLimiterConfig {
        enabled: true,
        max_requests: 2,
        window_seconds: 60,
    }
}

/// Generate a unique IP per test so leftover Redis keys from prior runs do not
/// interfere with assertions.
fn unique_ip() -> IpAddr {
    let bytes: [u8; 4] = Uuid::new_v4().as_bytes()[0..4]
        .try_into()
        .expect("uuid has at least 4 bytes");
    IpAddr::V4(Ipv4Addr::from(bytes))
}

fn login_scope(ip: IpAddr) -> RateLimitScope {
    RateLimitScope {
        ip,
        action: RateLimitAction::Login,
    }
}

#[tokio::test]
async fn rate_limiter_allows_requests_under_limit() {
    let limiter = RedisRateLimiter::new(enabled_config(), &redis_url())
        .await
        .unwrap();
    let ip = unique_ip();

    let decision = limiter.check(login_scope(ip)).await;

    assert!(decision.allowed);
}

#[tokio::test]
async fn rate_limiter_denies_requests_over_limit() {
    let limiter = RedisRateLimiter::new(enabled_config(), &redis_url())
        .await
        .unwrap();
    let ip = unique_ip();

    // First two requests are allowed.
    assert!(limiter.check(login_scope(ip)).await.allowed);
    assert!(limiter.check(login_scope(ip)).await.allowed);

    // Third request is denied.
    let decision = limiter.check(login_scope(ip)).await;
    assert!(!decision.allowed);
    assert!(decision.retry_after_seconds.unwrap_or(0) > 0);
}

#[tokio::test]
async fn disabled_rate_limiter_always_allows() {
    let config = RateLimiterConfig {
        enabled: false,
        max_requests: 1,
        window_seconds: 60,
    };
    let limiter = RedisRateLimiter::new(config, &redis_url()).await.unwrap();
    let ip = unique_ip();

    let decision = limiter.check(login_scope(ip)).await;

    assert!(decision.allowed);
}
