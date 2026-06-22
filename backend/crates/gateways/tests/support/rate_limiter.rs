//! Fake rate limiter for gateway integration tests.

use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Mutex;

use async_trait::async_trait;
use persistence::ports::{RateLimitAction, RateLimitDecision, RateLimitScope, RateLimiter};

/// In-memory rate limiter that denies requests after a configurable threshold
/// for a given IP/action pair.
pub struct FakeRateLimiter {
    max_requests: usize,
    counts: Mutex<HashMap<(IpAddr, RateLimitAction), usize>>,
}

impl FakeRateLimiter {
    pub fn new(max_requests: usize) -> Self {
        Self {
            max_requests,
            counts: Mutex::new(HashMap::new()),
        }
    }
}

#[async_trait]
impl RateLimiter for FakeRateLimiter {
    async fn check(&self, scope: RateLimitScope) -> RateLimitDecision {
        let mut counts = self.counts.lock().unwrap();
        let count = counts.entry((scope.ip, scope.action)).or_insert(0);
        *count += 1;

        if *count > self.max_requests {
            RateLimitDecision::denied(60)
        } else {
            RateLimitDecision::allowed()
        }
    }
}
