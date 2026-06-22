//! Shared clock port for deterministic time handling.

use chrono::{DateTime, Utc};

/// Port for generating timestamps (injected for testability).
pub trait Clock: Send + Sync {
    /// Return the current UTC timestamp.
    fn now(&self) -> DateTime<Utc>;
}

/// Default system clock.
#[derive(Debug, Clone, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> DateTime<Utc> {
        Utc::now()
    }
}
