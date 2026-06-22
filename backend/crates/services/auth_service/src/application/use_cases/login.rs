//! Login use case - authenticate user and create session.

use base::ctx::ExecutionContext;
use domain::contracts::auth::{LoginRequest, LoginResponse};
use domain::{DomainError, Email};
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

    let remember_me = request.remember_me.unwrap_or(false);
    let access_duration = if remember_me {
        service.config().long_session_duration()
    } else {
        service.config().session_duration()
    };
    let expires_at = service.internal().clock.now() + access_duration;

    let access_token = service
        .internal()
        .session_store
        .create(ctx, user.id, expires_at)
        .await?;

    let refresh_expires_at = service.internal().clock.now() + service.config().refresh_duration();
    let refresh_token = service
        .internal()
        .session_store
        .create(ctx, user.id, refresh_expires_at)
        .await?;

    service
        .internal()
        .audit_logger
        .log_session_created(ctx, user.id, access_token.to_string())
        .await;

    Ok(LoginResponse {
        access_token: access_token.to_string(),
        refresh_token: refresh_token.to_string(),
        expires_at,
        user: user.into(),
    })
}
