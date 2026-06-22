#[derive(Clone, Debug)]
pub struct SessionConfig {
    pub session_duration_secs: u64,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            session_duration_secs: 86400,
        }
    }
}
