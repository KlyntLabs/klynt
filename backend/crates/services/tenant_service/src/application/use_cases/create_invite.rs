//! Create a tenant invite use case.

use base::ctx::ExecutionContext;
use chrono::{Duration, Utc};
use domain::{DomainError, Email, TenantInvite};
use rand::RngExt;
use uuid::Uuid;

use crate::error::TenantError;
use crate::{CreateTenantInviteRequest, TenantService};

use super::shared::{fetch_tenant, require_actor};

const INVITE_TOKEN_BYTES: usize = 32;
const INVITE_EXPIRES_DAYS: i64 = 7;

pub(crate) async fn execute(
    service: &TenantService,
    ctx: &ExecutionContext,
    slug: &str,
    request: CreateTenantInviteRequest,
) -> Result<TenantInvite, TenantError> {
    let actor_id = require_actor(ctx)?;
    let tenant = fetch_tenant(service, ctx, slug).await?;

    service
        .authorization()
        .require_permission_with_context(
            ctx,
            tenant.id,
            actor_id,
            domain::permission::tenant::MANAGE_MEMBERS,
        )
        .await
        .map_err(|e| super::shared::map_permission_error(e, TenantError::NotAdmin))?;

    let email = Email::parse(&request.email).map_err(DomainError::from)?;
    let role_name = request.role.as_str();

    let role = service
        .internal()
        .persistence_facade
        .role_repository
        .find_role_by_name(ctx, tenant.id, role_name)
        .await?
        .ok_or_else(|| DomainError::validation("unknown tenant role"))?;

    let token = generate_secure_token();
    let now = Utc::now();
    let invite = TenantInvite {
        id: Uuid::new_v4(),
        tenant_id: tenant.id,
        email,
        role_id: role.id,
        role_name: role_name.to_string(),
        invited_by: actor_id,
        expires_at: now + Duration::days(INVITE_EXPIRES_DAYS),
        accepted_at: None,
        token,
        created_at: now,
        updated_at: now,
    };

    let created = service
        .internal()
        .persistence_facade
        .invite_repository
        .create(ctx, invite)
        .await
        .map_err(|e| TenantError::Internal(e.to_string()))?;

    service
        .internal()
        .persistence_facade
        .audit_logger
        .log_member_invited(ctx, tenant.id, created.email.as_str(), role_name)
        .await;

    Ok(created)
}

fn generate_secure_token() -> String {
    const ALPHABET: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::rng();
    (0..INVITE_TOKEN_BYTES)
        .map(|_| {
            let idx = rng.random_range(0..ALPHABET.len());
            ALPHABET[idx] as char
        })
        .collect()
}
