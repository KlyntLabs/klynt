//! PostgreSQL implementation of the tenant invite repository.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::{RepositoryError, TenantInviteRepository};
use chrono::{DateTime, Utc};
use domain::{Email, RoleId, TenantId, TenantInvite, UserId};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;

/// PostgreSQL implementation of the tenant invite repository.
pub struct PgTenantInviteRepository {
    pool: PgPool,
}

impl PgTenantInviteRepository {
    /// Create a new repository instance backed by `pool`.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Return a reference to the underlying connection pool.
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

#[derive(FromRow)]
struct InviteRow {
    id: Uuid,
    tenant_id: Uuid,
    email: String,
    tenant_role_id: Uuid,
    role_name: String,
    invited_by: Uuid,
    expires_at: DateTime<Utc>,
    accepted_at: Option<DateTime<Utc>>,
    token: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

fn map_invite_row(row: InviteRow) -> Result<TenantInvite, RepositoryError> {
    Ok(TenantInvite {
        id: row.id,
        tenant_id: TenantId::from_uuid(row.tenant_id),
        email: Email::new(row.email),
        role_id: RoleId::from_uuid(row.tenant_role_id),
        role_name: row.role_name,
        invited_by: UserId::from_uuid(row.invited_by),
        expires_at: row.expires_at,
        accepted_at: row.accepted_at,
        token: row.token,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[async_trait]
impl TenantInviteRepository for PgTenantInviteRepository {
    async fn find_by_token(
        &self,
        _ctx: &ExecutionContext,
        token: &str,
    ) -> Result<Option<TenantInvite>, RepositoryError> {
        let row: Option<InviteRow> = sqlx::query_as(
            r#"
            SELECT
                i.id,
                i.tenant_id,
                i.email,
                i.tenant_role_id,
                r.name AS role_name,
                i.invited_by,
                i.expires_at,
                i.accepted_at,
                i.token,
                i.created_at,
                i.updated_at
            FROM tenant_invites i
            JOIN tenant_roles r ON r.id = i.tenant_role_id
            WHERE i.token = $1
            "#,
        )
        .bind(token)
        .fetch_optional(&self.pool)
        .await
        .map_err(RepositoryError::from)?;

        row.map(map_invite_row).transpose()
    }

    async fn mark_accepted(
        &self,
        _ctx: &ExecutionContext,
        invite_id: Uuid,
    ) -> Result<(), RepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE tenant_invites
            SET accepted_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(invite_id)
        .execute(&self.pool)
        .await
        .map_err(RepositoryError::from)?;

        if result.rows_affected() == 0 {
            return Err(RepositoryError::NotFound);
        }

        Ok(())
    }
}
