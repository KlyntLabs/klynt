//! PostgreSQL implementation of the membership repository.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::{MembershipOpResult, MembershipRepository};
use domain::operations::MembershipOp;
use domain::{
    DomainError, DomainResult, Membership, RoleId, TenantId, TenantMember, TenantRole, UserId,
};
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

#[derive(sqlx::FromRow)]
struct TenantMemberRow {
    user_id: uuid::Uuid,
    email: String,
    name: String,
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

async fn find_role_id_by_name(
    pool: &PgPool,
    tenant_id: TenantId,
    name: &str,
) -> DomainResult<RoleId> {
    let id: Option<uuid::Uuid> = sqlx::query_scalar(
        r#"
        SELECT id FROM tenant_roles
        WHERE tenant_id = $1 AND name = $2
        "#,
    )
    .bind(tenant_id.inner())
    .bind(name)
    .fetch_optional(pool)
    .await
    .map_err(DomainError::internal)?;

    id.map(RoleId::from_uuid)
        .ok_or_else(|| DomainError::not_found("role"))
}

fn map_tenant_member_row(row: TenantMemberRow) -> DomainResult<TenantMember> {
    let role = TenantRole::parse(&row.role)
        .map_err(|e| DomainError::internal_msg(format!("invalid tenant role in DB: {e}")))?;

    Ok(TenantMember {
        user_id: UserId::from_uuid(row.user_id),
        email: row.email,
        full_name: if row.name.is_empty() {
            None
        } else {
            Some(row.name)
        },
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
        let tenant_role_id =
            find_role_id_by_name(&self.pool, membership.tenant_id, membership.role.as_str())
                .await
                .map_err(|_| DomainError::not_found("tenant"))?;

        let row: MembershipRow = match sqlx::query_as(
            r#"
            INSERT INTO user_tenant_memberships (tenant_id, user_id, role, joined_at, tenant_role_id, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
            RETURNING tenant_id, user_id, role, joined_at
            "#,
        )
        .bind(membership.tenant_id.inner())
        .bind(membership.user_id.inner())
        .bind(membership.role.as_str())
        .bind(membership.joined_at)
        .bind(tenant_role_id.0)
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

    async fn create_with_role_id(
        &self,
        _ctx: &ExecutionContext,
        membership: &Membership,
        tenant_role_id: RoleId,
    ) -> DomainResult<Membership> {
        let row: MembershipRow = match sqlx::query_as(
            r#"
            INSERT INTO user_tenant_memberships (tenant_id, user_id, role, joined_at, tenant_role_id, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
            RETURNING tenant_id, user_id, role, joined_at
            "#,
        )
        .bind(membership.tenant_id.inner())
        .bind(membership.user_id.inner())
        .bind(membership.role.as_str())
        .bind(membership.joined_at)
        .bind(tenant_role_id.0)
        .fetch_one(&self.pool)
        .await
        {
            Ok(row) => row,
            Err(SqlxError::Database(db_err)) => {
                if db_err.is_unique_violation() {
                    return Err(DomainError::conflict("membership already exists"));
                }
                if db_err.is_foreign_key_violation() {
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

    async fn list_members(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
    ) -> DomainResult<Vec<TenantMember>> {
        let rows: Vec<TenantMemberRow> = sqlx::query_as(
            r#"
            SELECT m.user_id, u.email, u.name, m.role, m.joined_at
            FROM user_tenant_memberships m
            JOIN users u ON u.id = m.user_id
            WHERE m.tenant_id = $1
            ORDER BY m.joined_at DESC
            "#,
        )
        .bind(tenant_id.inner())
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(rows
            .into_iter()
            .map(map_tenant_member_row)
            .collect::<Result<Vec<_>, _>>()?)
    }

    async fn update_role(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        user_id: UserId,
        role: TenantRole,
    ) -> DomainResult<()> {
        let existing = self.find(_ctx, tenant_id, user_id).await?;
        if existing.is_none() {
            return Err(DomainError::not_found("membership"));
        }

        let tenant_role_id = find_role_id_by_name(&self.pool, tenant_id, role.as_str()).await?;

        let result = sqlx::query(
            r#"
            UPDATE user_tenant_memberships
            SET role = $1, tenant_role_id = $4
            WHERE tenant_id = $2 AND user_id = $3
            "#,
        )
        .bind(role.as_str())
        .bind(tenant_id.inner())
        .bind(user_id.inner())
        .bind(tenant_role_id.0)
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

    async fn execute(
        &self,
        ctx: &ExecutionContext,
        op: MembershipOp,
    ) -> DomainResult<MembershipOpResult> {
        match op {
            MembershipOp::Create { membership } => {
                let result = self.create(ctx, &membership).await?;
                Ok(MembershipOpResult::Membership(result))
            }
            MembershipOp::Find { tenant_id, user_id } => {
                let result = self.find(ctx, tenant_id, user_id).await?;
                Ok(MembershipOpResult::MembershipOption(result))
            }
            MembershipOp::ListForUser { user_id } => {
                let result = self.list_for_user(ctx, user_id).await?;
                Ok(MembershipOpResult::MembershipList(result))
            }
            MembershipOp::ListForTenant { tenant_id } => {
                let result = self.list_for_tenant(ctx, tenant_id).await?;
                Ok(MembershipOpResult::MembershipList(result))
            }
            MembershipOp::UpdateRole {
                tenant_id,
                user_id,
                role,
            } => {
                self.update_role(ctx, tenant_id, user_id, role).await?;
                Ok(MembershipOpResult::Unit(()))
            }
            MembershipOp::Delete { tenant_id, user_id } => {
                self.delete(ctx, tenant_id, user_id).await?;
                Ok(MembershipOpResult::Unit(()))
            }
        }
    }
}
