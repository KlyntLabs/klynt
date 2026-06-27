//! Session synchronization coordinator.

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::session::SessionStore;

use super::config::SessionCoordinatorConfig;
use super::error::SessionCoordinatorError;
use super::event::MembershipEvent;

/// Coordinates session updates in response to membership changes.
#[allow(dead_code)]
pub struct SessionCoordinator {
    session_store: Arc<dyn SessionStore>,
    config: SessionCoordinatorConfig,
}

impl SessionCoordinator {
    /// Create a new session coordinator.
    pub fn new(session_store: Arc<dyn SessionStore>, config: SessionCoordinatorConfig) -> Self {
        Self {
            session_store,
            config,
        }
    }

    /// Handle a membership event by updating affected sessions.
    pub async fn handle_membership_event(
        &self,
        ctx: &ExecutionContext,
        event: MembershipEvent,
    ) -> Result<(), SessionCoordinatorError> {
        if !self.config.enabled {
            return Ok(());
        }

        let _ = (ctx, event);

        // TODO: Implement event handling in next task
        Ok(())
    }
}
