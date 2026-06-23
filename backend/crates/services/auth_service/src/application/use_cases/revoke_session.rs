//! Revoke a single session belonging to the authenticated user.

use base::ctx::ExecutionContext;
use base::ports::session::SessionToken;
use domain::UserId;

use crate::error::AuthError;
use crate::AuthService;

/// Revoke `session_id` after verifying it belongs to `user_id`.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    user_id: UserId,
    session_id: SessionToken,
) -> Result<(), AuthError> {
    let session = service
        .internal()
        .session_store
        .find_valid(ctx, &session_id)
        .await
        .map_err(AuthError::from)?
        .ok_or(AuthError::InvalidToken)?;

    if session.user_id != user_id {
        return Err(AuthError::Forbidden);
    }

    service
        .internal()
        .session_store
        .revoke(ctx, &session_id)
        .await
        .map_err(AuthError::from)
}
