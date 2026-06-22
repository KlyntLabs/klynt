//! Email verification use case - verify email from token.

use klynt_base::ctx::ExecutionContext;

use crate::domain::{Token, TokenKind};
use crate::error::AuthError;
use crate::AuthService;

/// Execute email verification use case.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    token: &str,
) -> Result<klynt_domain::UserId, AuthError> {
    let token_hash = Token::sha256_hash(token);

    let user_id = service
        .internal()
        .token_store
        .consume(ctx, TokenKind::EmailVerification, token_hash)
        .await?;

    service
        .internal()
        .user_repository
        .activate_user(ctx, user_id)
        .await?;

    service
        .internal()
        .audit_logger
        .log_email_verified(ctx, user_id)
        .await;

    Ok(user_id)
}
