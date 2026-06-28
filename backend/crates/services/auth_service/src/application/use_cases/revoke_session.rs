//! Revoke a single session belonging to the authenticated user.

use base::ctx::ExecutionContext;
use domain::UserId;
use uuid::Uuid;

use crate::error::AuthError;
use crate::AuthService;

/// Revoke `session_id` after verifying it belongs to `user_id`.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    user_id: UserId,
    session_id: Uuid,
) -> Result<(), AuthError> {
    service
        .internal()
        .persistence_facade
        .session_store
        .revoke_by_id(ctx, user_id, session_id)
        .await
        .map_err(AuthError::from)
}
