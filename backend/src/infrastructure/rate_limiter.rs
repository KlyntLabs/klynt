use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Debug, Default)]
pub struct RateLimiter {
    enabled: bool,
    buckets: Mutex<HashMap<IpAddr, Vec<Instant>>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            enabled: true,
            ..Self::default()
        }
    }

    pub fn disabled() -> Self {
        Self {
            enabled: false,
            ..Self::default()
        }
    }

    pub fn is_allowed(&self, ip: IpAddr, max_requests: usize, window: Duration) -> bool {
        if !self.enabled {
            return true;
        }

        let mut buckets = self.buckets.lock().unwrap();
        let now = Instant::now();
        let cutoff = now - window;

        let entries = buckets.entry(ip).or_default();
        entries.retain(|t| *t > cutoff);

        if entries.is_empty() {
            buckets.remove(&ip);
            return true;
        }

        if entries.len() >= max_requests {
            return false;
        }

        entries.push(now);
        true
    }
}
