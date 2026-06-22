use chrono::Duration;

#[derive(Clone, Debug)]
pub struct SessionConfig {
    pub session_duration_secs: u64,
    pub long_session_duration_secs: u64,
}

impl SessionConfig {
    /// Standard session duration.
    pub fn session_duration(&self) -> Duration {
        Duration::seconds(self.session_duration_secs as i64)
    }

    /// Extended session duration for "remember me" sessions.
    pub fn long_session_duration(&self) -> Duration {
        Duration::seconds(self.long_session_duration_secs as i64)
    }

    /// Refresh token lifetime.
    ///
    /// Refresh tokens are long-lived by default so users stay signed in across
    /// visits without re-authenticating.
    pub fn refresh_duration(&self) -> Duration {
        self.long_session_duration()
    }
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            session_duration_secs: 24 * 3600,
            long_session_duration_secs: 30 * 24 * 3600,
        }
    }
}
