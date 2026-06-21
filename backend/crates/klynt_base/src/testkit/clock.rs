//! Test double for [`Clock`] that supports freezing and advancing time.

use std::sync::{Arc, Mutex};

use chrono::{DateTime, Duration, Utc};

use crate::ports::Clock;

/// Clock that can be frozen at a specific instant or advanced manually.
#[derive(Clone, Debug)]
pub struct TestClock {
    frozen_at: Arc<Mutex<Option<DateTime<Utc>>>>,
}

impl TestClock {
    /// Create a clock that returns the current wall-clock time.
    pub fn new() -> Self {
        Self {
            frozen_at: Arc::new(Mutex::new(None)),
        }
    }

    /// Freeze time at a specific instant.
    pub fn freeze_at(&self, time: DateTime<Utc>) {
        *self.frozen_at.lock().unwrap() = Some(time);
    }

    /// Unfreeze the clock so it returns wall-clock time again.
    pub fn unfreeze(&self) {
        *self.frozen_at.lock().unwrap() = None;
    }

    /// Advance the frozen time by the given duration.
    ///
    /// Panics if the clock is not currently frozen.
    pub fn advance(&self, duration: Duration) {
        let mut frozen = self.frozen_at.lock().unwrap();
        let current = frozen.expect("cannot advance an unfrozen clock");
        *frozen = Some(current + duration);
    }
}

impl Default for TestClock {
    fn default() -> Self {
        Self::new()
    }
}

impl Clock for TestClock {
    fn now(&self) -> DateTime<Utc> {
        self.frozen_at.lock().unwrap().unwrap_or_else(Utc::now)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_clock_returns_wall_clock_time() {
        let clock = TestClock::new();
        let before = Utc::now();
        let now = clock.now();
        let after = Utc::now();
        assert!(now >= before && now <= after);
    }

    #[test]
    fn frozen_clock_returns_fixed_time() {
        let clock = TestClock::new();
        let frozen = Utc::now() - Duration::days(1);
        clock.freeze_at(frozen);
        assert_eq!(clock.now(), frozen);
    }

    #[test]
    fn advance_moves_frozen_time() {
        let clock = TestClock::new();
        let frozen = Utc::now();
        clock.freeze_at(frozen);
        clock.advance(Duration::hours(2));
        assert_eq!(clock.now(), frozen + Duration::hours(2));
    }
}
