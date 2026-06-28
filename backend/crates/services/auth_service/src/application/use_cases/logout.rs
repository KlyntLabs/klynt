//! Logout use case - end a session.

use base::ctx::ExecutionContext;
use uuid::Uuid;

use crate::core::SessionToken;
use crate::error::AuthError;
use crate::AuthService;

/// Execute logout use case.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    session_token: &str,
) -> Result<(), AuthError> {
    let token = Uuid::parse_str(session_token)
        .map(SessionToken)
        .map_err(|_| AuthError::InvalidToken)?;
    service
        .internal()
        .session_service
        .invalidate_pair(ctx, &token)
        .await?;
    Ok(())
}
