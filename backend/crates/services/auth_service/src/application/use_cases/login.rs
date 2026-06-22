//! Login use case - authenticate user and create session.

use klynt_base::ctx::ExecutionContext;
use klynt_common::contracts::auth::{LoginRequest, LoginResponse};
use klynt_common::domain::{DomainError, Email};
use validator::Validate;

use crate::error::AuthError;
use crate::AuthService;

/// Execute login use case.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    request: LoginRequest,
) -> Result<LoginResponse, AuthError> {
    request
        .validate()
        .map_err(|e| AuthError::validation(e.to_string()))?;

    let email = Email::parse(&request.email)
        .map_err(|e| AuthError::Domain(DomainError::InvalidInput(e.to_string())))?;

    let user = match service
        .internal()
        .user_repository
        .find_by_email(ctx, &email)
        .await?
    {
        Some(user) => user,
        None => {
            service
                .internal()
                .audit_logger
                .log_login_failed(ctx, &request.email, "invalid credentials")
                .await;
            return Err(AuthError::invalid_credentials());
        }
    };

    let password_valid = service
        .internal()
        .password_hasher
        .verify(&request.password, &user.password_hash)
        .await?;

    if !password_valid {
        service
            .internal()
            .audit_logger
            .log_login_failed(ctx, &request.email, "invalid credentials")
            .await;
        return Err(AuthError::invalid_credentials());
    }

    if !user.is_active() {
        service
            .internal()
            .audit_logger
            .log_login_failed(ctx, &request.email, "account inactive")
            .await;
        return Err(AuthError::account_inactive());
    }

    let expires_at = service.internal().clock.now() + service.config().session_duration();
    let session_token = service
        .internal()
        .session_store
        .create(ctx, user.id, expires_at)
        .await?;

    service
        .internal()
        .audit_logger
        .log_session_created(ctx, user.id, session_token.to_string())
        .await;

    let token_string = session_token.to_string();
    Ok(LoginResponse {
        access_token: token_string.clone(),
        refresh_token: token_string,
        expires_at,
        user: user.into(),
    })
}
