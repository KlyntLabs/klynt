//! Session coordinator configuration.

#[derive(Debug, Clone)]
pub struct SessionCoordinatorConfig {
    /// Whether session synchronization is enabled.
    pub enabled: bool,
}

impl Default for SessionCoordinatorConfig {
    fn default() -> Self {
        Self { enabled: true }
    }
}
