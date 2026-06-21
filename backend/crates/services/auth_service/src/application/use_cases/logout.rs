//! Logout use case - end a session.

use klynt_base::ctx::ExecutionContext;

use crate::domain::SessionToken;
use crate::error::AuthError;
use crate::AuthService;

/// Execute logout use case.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    session_token: &str,
) -> Result<(), AuthError> {
    let token = SessionToken::parse(session_token)?;
    service.internal().session_store.revoke(ctx, &token).await
}
