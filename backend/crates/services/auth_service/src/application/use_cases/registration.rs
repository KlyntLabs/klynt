//! Registration use case - create pending user and send verification email.

use base::ctx::ExecutionContext;
use domain::contracts::auth::RegistrationRequest;
use domain::{DomainError, Email};
use validator::Validate;

use crate::error::AuthError;
use crate::AuthService;

/// Execute registration use case.
pub(crate) async fn execute(
    service: &AuthService,
    ctx: &ExecutionContext,
    request: RegistrationRequest,
) -> Result<domain::UserId, AuthError> {
    request
        .validate()
        .map_err(|e| AuthError::validation(e.to_string()))?;

    service.password_policy().validate(&request.password)?;

    let password_hash = service
        .internal()
        .infra_facade
        .password_hasher
        .hash(&request.password)
        .await?;

    let email = Email::parse(&request.email)
        .map_err(|e| AuthError::Domain(DomainError::InvalidInput(e.to_string())))?;

    let username = request.username.trim().to_lowercase();
    if username.is_empty() {
        return Err(AuthError::Domain(DomainError::InvalidInput(
            "username is required".to_string(),
        )));
    }

    let institution_id = if request.role.requires_institution() {
        request.institution_id
    } else {
        None
    };

    if request.role.requires_institution() && institution_id.is_none() {
        return Err(AuthError::Domain(DomainError::InvalidInput(format!(
            "institution_id is required for role {}",
            request.role
        ))));
    }

    let user_id = service
        .internal()
        .persistence_facade
        .user_repository
        .create_pending_user(
            ctx,
            request.full_name.unwrap_or_default(),
            username,
            email.clone(),
            password_hash,
            request.role,
            institution_id,
        )
        .await?;

    service
        .internal()
        .persistence_facade
        .audit_logger
        .log_user_registered(ctx, user_id)
        .await;

    service
        .internal()
        .token_email_service
        .send_verification(ctx, &email, user_id)
        .await?;

    Ok(user_id)
}
