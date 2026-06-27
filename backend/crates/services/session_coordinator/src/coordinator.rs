//! Session synchronization coordinator.

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::session::{MembershipSnapshot, SessionStore};

use super::config::SessionCoordinatorConfig;
use super::error::SessionCoordinatorError;
use super::event::MembershipEvent;

/// Coordinates session updates in response to membership changes.
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
    #[tracing::instrument(
        skip(self, ctx),
        fields(
            event_kind = %event.kind(),
            tenant_id = %event.tenant_id(),
            user_id = %event.user_id(),
        )
    )]
    pub async fn handle_membership_event(
        &self,
        ctx: &ExecutionContext,
        event: MembershipEvent,
    ) -> Result<(), SessionCoordinatorError> {
        if !self.config.enabled {
            return Ok(());
        }

        match event {
            MembershipEvent::Added {
                tenant_id,
                user_id,
                role,
            } => {
                let snapshot = MembershipSnapshot {
                    tenant_id: tenant_id.inner(),
                    role,
                };
                self.session_store
                    .add_membership(ctx, user_id, snapshot)
                    .await?;
            }
            MembershipEvent::Updated {
                tenant_id,
                user_id,
                role,
            } => {
                let snapshot = MembershipSnapshot {
                    tenant_id: tenant_id.inner(),
                    role,
                };
                self.session_store
                    .update_membership(ctx, user_id, snapshot)
                    .await?;
            }
            MembershipEvent::Removed { tenant_id, user_id } => {
                self.session_store
                    .remove_membership(ctx, user_id, tenant_id)
                    .await?;
            }
        }

        Ok(())
    }
}
