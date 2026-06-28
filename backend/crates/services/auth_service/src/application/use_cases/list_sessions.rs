//! List active sessions for the authenticated user.

use base::ctx::ExecutionContext;
use domain::session::SessionSummary;
use domain::UserId;

use crate::error::AuthError;
use crate::AuthService;

/// Return all active sessions for `user_id`.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    user_id: UserId,
) -> Result<Vec<SessionSummary>, AuthError> {
    service
        .internal()
        .persistence_facade
        .session_store
        .list_active_by_user(ctx, user_id)
        .await
        .map_err(AuthError::from)
}
