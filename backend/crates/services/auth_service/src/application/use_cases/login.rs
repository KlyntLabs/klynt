//! Login use case - authenticate user and create session.

use base::ctx::ExecutionContext;
use base::ports::session::MembershipSnapshot;
use domain::contracts::auth::{LoginRequest, LoginResponse};
use domain::{DomainError, Email};
use uuid::Uuid;
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
        .persistence_facade
        .user_repository
        .find_by_email(ctx, &email)
        .await?
    {
        Some(user) => user,
        None => {
            service
                .internal()
                .persistence_facade
                .audit_logger
                .log_login_failed(ctx, &request.email, "invalid credentials")
                .await;
            return Err(AuthError::invalid_credentials());
        }
    };

    let password_valid = service
        .internal()
        .infra_facade
        .password_hasher
        .verify(&request.password, &user.password_hash)
        .await?;

    if !password_valid {
        service
            .internal()
            .persistence_facade
            .audit_logger
            .log_login_failed(ctx, &request.email, "invalid credentials")
            .await;
        return Err(AuthError::invalid_credentials());
    }

    if !user.is_active() {
        service
            .internal()
            .persistence_facade
            .audit_logger
            .log_login_failed(ctx, &request.email, "account inactive")
            .await;
        return Err(AuthError::account_inactive());
    }

    let remember_me = request.remember_me.unwrap_or(false);
    let pair_id = Uuid::new_v4();

    let access = service
        .internal()
        .session_service
        .create_access(ctx, user.id, remember_me, Some(pair_id))
        .await?;

    let refresh = match service
        .internal()
        .session_service
        .create_refresh(ctx, user.id, Some(pair_id))
        .await
    {
        Ok(session) => session,
        Err(err) => {
            // Best-effort rollback: don't leave a valid access token behind
            // if we cannot complete the token pair.
            let _ = service
                .internal()
                .session_service
                .invalidate(ctx, &access.token)
                .await;
            return Err(err.into());
        }
    };

    let memberships = service
        .internal()
        .persistence_facade
        .membership_repository
        .list_for_user(ctx, user.id)
        .await?;

    let snapshots: Vec<MembershipSnapshot> = memberships
        .into_iter()
        .map(|m| MembershipSnapshot {
            tenant_id: m.tenant_id.inner(),
            role: m.role,
        })
        .collect();

    service
        .internal()
        .persistence_facade
        .session_store
        .update_memberships(ctx, &access.token, snapshots)
        .await?;

    service
        .internal()
        .persistence_facade
        .audit_logger
        .log_session_created(ctx, user.id, access.token.to_string())
        .await;

    Ok(LoginResponse {
        access_token: access.token.to_string(),
        refresh_token: refresh.token.to_string(),
        expires_at: access.expires_at,
        user: user.into(),
    })
}
