//! PostgreSQL implementation of the membership repository.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::MembershipRepository;
use domain::{DomainError, DomainResult, Membership, TenantId, TenantRole, UserId};
use sqlx::{Error as SqlxError, PgPool};

/// PostgreSQL implementation of the membership repository.
pub struct PgMembershipRepository {
    pool: PgPool,
}

impl PgMembershipRepository {
    /// Create a new repository instance backed by `pool`.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Return a reference to the underlying connection pool.
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

#[derive(sqlx::FromRow)]
struct MembershipRow {
    tenant_id: uuid::Uuid,
    user_id: uuid::Uuid,
    role: String,
    joined_at: chrono::DateTime<chrono::Utc>,
}

fn map_membership_row(row: MembershipRow) -> DomainResult<Membership> {
    let role = TenantRole::parse(&row.role)
        .map_err(|e| DomainError::internal_msg(format!("invalid tenant role in DB: {e}")))?;

    Ok(Membership {
        tenant_id: TenantId::from_uuid(row.tenant_id),
        user_id: UserId::from_uuid(row.user_id),
        role,
        joined_at: row.joined_at,
    })
}

#[async_trait]
impl MembershipRepository for PgMembershipRepository {
    async fn create(
        &self,
        _ctx: &ExecutionContext,
        membership: &Membership,
    ) -> DomainResult<Membership> {
        let row: MembershipRow = match sqlx::query_as(
            r#"
            INSERT INTO user_tenant_memberships (tenant_id, user_id, role, joined_at)
            VALUES ($1, $2, $3, $4)
            RETURNING tenant_id, user_id, role, joined_at
            "#,
        )
        .bind(membership.tenant_id.inner())
        .bind(membership.user_id.inner())
        .bind(membership.role.as_str())
        .bind(membership.joined_at)
        .fetch_one(&self.pool)
        .await
        {
            Ok(row) => row,
            Err(SqlxError::Database(db_err)) => {
                if db_err.is_unique_violation() {
                    return Err(DomainError::conflict("membership already exists"));
                }
                if db_err.is_foreign_key_violation() {
                    // The FK constraint tells us whether the missing entity is a
                    // tenant or a user. We surface a generic not-found error so
                    // callers can handle a missing reference uniformly.
                    return Err(DomainError::not_found(
                        db_err.constraint().unwrap_or("tenant or user"),
                    ));
                }
                return Err(DomainError::internal(db_err));
            }
            Err(err) => return Err(DomainError::internal(err)),
        };

        Ok(map_membership_row(row)?)
    }

    async fn find(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<Option<Membership>> {
        let row: Option<MembershipRow> = sqlx::query_as(
            r#"
            SELECT tenant_id, user_id, role, joined_at
            FROM user_tenant_memberships
            WHERE tenant_id = $1 AND user_id = $2
            "#,
        )
        .bind(tenant_id.inner())
        .bind(user_id.inner())
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(row.map(map_membership_row).transpose()?)
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<Vec<Membership>> {
        let rows: Vec<MembershipRow> = sqlx::query_as(
            r#"
            SELECT tenant_id, user_id, role, joined_at
            FROM user_tenant_memberships
            WHERE user_id = $1
            ORDER BY joined_at DESC
            "#,
        )
        .bind(user_id.inner())
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(rows
            .into_iter()
            .map(map_membership_row)
            .collect::<Result<Vec<_>, _>>()?)
    }

    async fn list_for_tenant(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
    ) -> DomainResult<Vec<Membership>> {
        let rows: Vec<MembershipRow> = sqlx::query_as(
            r#"
            SELECT tenant_id, user_id, role, joined_at
            FROM user_tenant_memberships
            WHERE tenant_id = $1
            ORDER BY joined_at DESC
            "#,
        )
        .bind(tenant_id.inner())
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(rows
            .into_iter()
            .map(map_membership_row)
            .collect::<Result<Vec<_>, _>>()?)
    }

    async fn update_role(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
        role: TenantRole,
    ) -> DomainResult<()> {
        let result = sqlx::query(
            r#"
            UPDATE user_tenant_memberships
            SET role = $1
            WHERE tenant_id = $2 AND user_id = $3
            "#,
        )
        .bind(role.as_str())
        .bind(tenant_id.inner())
        .bind(user_id.inner())
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::not_found("membership"));
        }

        Ok(())
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
    ) -> DomainResult<()> {
        let result = sqlx::query(
            r#"
            DELETE FROM user_tenant_memberships
            WHERE tenant_id = $1 AND user_id = $2
            "#,
        )
        .bind(tenant_id.inner())
        .bind(user_id.inner())
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::not_found("membership"));
        }

        Ok(())
    }
}
