//! Email verification use case - verify email from token.

use base::ctx::ExecutionContext;

use crate::core::{Token, TokenKind};
use crate::error::AuthError;
use crate::AuthService;

/// Execute email verification use case.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    token: &str,
) -> Result<domain::UserId, AuthError> {
    let token_hash = Token::sha256_hash(token);

    let user_id = service
        .internal()
        .persistence_facade
        .token_store
        .consume(ctx, TokenKind::EmailVerification, token_hash)
        .await?;

    service
        .internal()
        .persistence_facade
        .user_repository
        .activate_user(ctx, user_id)
        .await?;

    service
        .internal()
        .persistence_facade
        .audit_logger
        .log_email_verified(ctx, user_id)
        .await;

    Ok(user_id)
}
