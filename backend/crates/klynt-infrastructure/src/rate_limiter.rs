use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

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

    pub fn is_allowed(&self, ip: IpAddr) -> bool {
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

impl RateLimiterPort for RateLimiter {
    fn is_allowed(&self, ip: IpAddr) -> bool {
        self.is_allowed(ip)
    }
}
