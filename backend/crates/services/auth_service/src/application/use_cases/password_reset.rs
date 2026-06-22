//! Password reset use cases - request and complete reset.

use klynt_base::ctx::ExecutionContext;
use klynt_domain::{DomainError, Email};

use crate::domain::{Token, TokenKind};
use crate::error::AuthError;
use crate::AuthService;

/// Request a password reset.
///
/// Always returns Ok to prevent email enumeration.
pub(crate) async fn request(
    service: &AuthService,
    ctx: &ExecutionContext,
    email: &str,
) -> Result<(), AuthError> {
    let parsed_email = Email::parse(email)
        .map_err(|e| AuthError::Domain(DomainError::InvalidInput(e.to_string())))?;

    let user = match service
        .internal()
        .user_repository
        .find_by_email(ctx, &parsed_email)
        .await?
    {
        Some(user) => user,
        None => return Ok(()),
    };

    let token = Token::generate(TokenKind::PasswordReset, user.id);
    service
        .internal()
        .token_store
        .save(
            ctx,
            TokenKind::PasswordReset,
            user.id,
            token.hash,
            token.expires_at,
        )
        .await?;

    // Swallow email errors to prevent account enumeration during outages.
    if let Err(e) = service
        .internal()
        .email_sender
        .send_password_reset(
            ctx,
            &parsed_email,
            &token.plaintext,
            &service.config().base_url,
        )
        .await
    {
        tracing::warn!(
            error = %e,
            action = "password_reset_email",
            request_id = ?ctx.request.request_id,
            "failed to send password reset email"
        );
    }

    Ok(())
}

/// Complete a password reset.
pub(crate) async fn reset(
    service: &AuthService,
    ctx: &ExecutionContext,
    token: &str,
    new_password: &str,
) -> Result<(), AuthError> {
    service.password_policy().validate(new_password)?;

    let token_hash = Token::sha256_hash(token);
    let user_id = service
        .internal()
        .token_store
        .consume(ctx, TokenKind::PasswordReset, token_hash)
        .await?;

    let password_hash = service
        .internal()
        .password_hasher
        .hash(new_password)
        .await?;
    service
        .internal()
        .user_repository
        .update_password(ctx, user_id, password_hash)
        .await?;

    service
        .internal()
        .audit_logger
        .log_password_reset(ctx, user_id)
        .await;

    Ok(())
}
