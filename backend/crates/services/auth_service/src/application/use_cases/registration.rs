//! Registration use case - create pending user and send verification email.

use klynt_base::ctx::ExecutionContext;
use klynt_domain::contracts::auth::RegistrationRequest;
use klynt_domain::{DomainError, Email};
use validator::Validate;

use crate::domain::{Token, TokenKind};
use crate::error::AuthError;
use crate::AuthService;

/// Execute registration use case.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    request: RegistrationRequest,
) -> Result<klynt_domain::UserId, AuthError> {
    request
        .validate()
        .map_err(|e| AuthError::validation(e.to_string()))?;

    service.password_policy().validate(&request.password)?;

    let password_hash = service
        .internal()
        .password_hasher
        .hash(&request.password)
        .await?;

    let email = Email::parse(&request.email)
        .map_err(|e| AuthError::Domain(DomainError::InvalidInput(e.to_string())))?;

    let user_id = service
        .internal()
        .user_repository
        .create_pending_user(
            ctx,
            request.full_name.unwrap_or_default(),
            email.clone(),
            password_hash,
        )
        .await?;

    service
        .internal()
        .audit_logger
        .log_user_registered(ctx, user_id)
        .await;

    let token = Token::generate(TokenKind::EmailVerification, user_id);
    service
        .internal()
        .token_store
        .save(
            ctx,
            TokenKind::EmailVerification,
            user_id,
            token.hash,
            token.expires_at,
        )
        .await?;

    service
        .internal()
        .email_sender
        .send_verification(ctx, &email, &token.plaintext, &service.config().base_url)
        .await?;

    Ok(user_id)
}
