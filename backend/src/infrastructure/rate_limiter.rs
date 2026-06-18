use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[derive(Debug, Default)]
pub struct RateLimiter {
    buckets: Mutex<HashMap<IpAddr, Vec<Instant>>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_allowed(&self, ip: IpAddr, max_requests: usize, window: Duration) -> bool {
        let mut buckets = self.buckets.lock().unwrap();
        let now = Instant::now();
        let cutoff = now - window;

        let entries = buckets.entry(ip).or_default();
        entries.retain(|t| *t > cutoff);

        if entries.len() >= max_requests {
            return false;
        }

        entries.push(now);
        true
    }
}
