use chrono::Duration;

#[derive(Clone, Debug)]
pub struct SessionConfig {
    pub session_duration_secs: u64,
    pub long_session_duration_secs: u64,
    pub refresh_duration_secs: u64,
}

impl SessionConfig {
    /// Standard access-session duration.
    pub fn session_duration(&self) -> Duration {
        Duration::seconds(
            i64::try_from(self.session_duration_secs).expect("session duration fits in i64"),
        )
    }

    /// Extended access-session duration for "remember me" sessions.
    pub fn long_session_duration(&self) -> Duration {
        Duration::seconds(
            i64::try_from(self.long_session_duration_secs)
                .expect("long session duration fits in i64"),
        )
    }

    /// Refresh-token lifetime.
    pub fn refresh_duration(&self) -> Duration {
        Duration::seconds(
            i64::try_from(self.refresh_duration_secs).expect("refresh duration fits in i64"),
        )
    }
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            session_duration_secs: 24 * 3600,           // 24 hours
            long_session_duration_secs: 30 * 24 * 3600, // 30 days
            refresh_duration_secs: 30 * 24 * 3600,      // 30 days
        }
    }
}
