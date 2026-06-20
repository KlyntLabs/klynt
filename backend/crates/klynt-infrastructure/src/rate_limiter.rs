use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use async_trait::async_trait;
use klynt_domain::config::RateLimiterConfig;
use klynt_domain::ports::RateLimiter as RateLimiterPort;

#[derive(Debug)]
pub struct RateLimiter {
    config: RateLimiterConfig,
    pub(crate) buckets: Mutex<HashMap<IpAddr, Vec<Instant>>>,
}

impl RateLimiter {
    pub fn new(config: RateLimiterConfig) -> Self {
        Self {
            config,
            buckets: Mutex::default(),
        }
    }

    pub fn disabled() -> Self {
        Self {
            config: RateLimiterConfig {
                enabled: false,
                ..RateLimiterConfig::default()
            },
            buckets: Mutex::default(),
        }
    }
}

#[async_trait]
impl RateLimiterPort for RateLimiter {
    async fn is_allowed(&self, ip: IpAddr) -> bool {
        if !self.config.enabled {
            return true;
        }

        let mut buckets = self.buckets.lock().unwrap();
        let now = Instant::now();
        let window = Duration::from_secs(self.config.window_seconds);
        let cutoff = now - window;

        let entries = buckets.entry(ip).or_default();
        entries.retain(|t| *t > cutoff);

        if entries.len() >= self.config.max_requests {
            return false;
        }

        entries.push(now);
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::IpAddr;
    use std::str::FromStr;

    fn test_ip() -> IpAddr {
        IpAddr::from_str("192.0.2.1").unwrap()
    }

    #[tokio::test]
    async fn port_allows_requests_under_limit() {
        let limiter: Box<dyn RateLimiterPort> = Box::new(RateLimiter::new(RateLimiterConfig {
            enabled: true,
            max_requests: 2,
            window_seconds: 60,
        }));
        assert!(limiter.is_allowed(test_ip()).await);
        assert!(limiter.is_allowed(test_ip()).await);
        assert!(!limiter.is_allowed(test_ip()).await);
    }

    #[tokio::test]
    async fn disabled_port_always_allows() {
        let limiter: Box<dyn RateLimiterPort> = Box::new(RateLimiter::disabled());
        assert!(limiter.is_allowed(test_ip()).await);
        assert!(limiter.is_allowed(test_ip()).await);
    }
}
