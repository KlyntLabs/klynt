//! Time utilities.

use chrono::{DateTime, Utc};
use time::Duration;

/// Get current UTC time
pub fn now_utc() -> DateTime<Utc> {
    Utc::now()
}

/// Add duration to datetime
pub fn add_duration(dt: DateTime<Utc>, duration: Duration) -> DateTime<Utc> {
    dt + chrono::Duration::seconds(duration.whole_seconds())
}

/// Check if datetime is in the past
pub fn is_past(dt: DateTime<Utc>) -> bool {
    dt < Utc::now()
}

/// Check if datetime is in the future
pub fn is_future(dt: DateTime<Utc>) -> bool {
    dt > Utc::now()
}
