//! PostgreSQL implementation of the tenant repository.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::TenantRepository;
use domain::{
    membership::TenantRole, DomainError, DomainResult, Tenant, TenantId, TenantMembershipSummary,
    TenantSlug, TenantStatus, UserId,
};
use sqlx::{Error as SqlxError, PgPool};

/// PostgreSQL implementation of the tenant repository.
pub struct PgTenantRepository {
    pool: PgPool,
}

impl PgTenantRepository {
    /// Create a new repository instance backed by `pool`.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Return a reference to the underlying connection pool.
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

/// PostgreSQL check-violation SQLSTATE.
const PG_CHECK_VIOLATION: &str = "23514";

#[derive(sqlx::FromRow)]
struct TenantRow {
    id: uuid::Uuid,
    slug: String,
    name: String,
    owner_id: uuid::Uuid,
    max_members: i32,
    max_owners: i32,
    settings: serde_json::Value,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

fn map_tenant_row(row: TenantRow) -> DomainResult<Tenant> {
    use std::str::FromStr;

    let status = TenantStatus::from_str(&row.status)
        .map_err(|e| DomainError::internal_msg(format!("invalid tenant status in DB: {e}")))?;
    let slug = TenantSlug::parse(&row.slug)
        .map_err(|e| DomainError::internal_msg(format!("invalid tenant slug in DB: {e}")))?;

    Ok(Tenant {
        id: TenantId::from_uuid(row.id),
        slug,
        name: row.name,
        owner_id: UserId::from_uuid(row.owner_id),
        max_members: row.max_members,
        max_owners: row.max_owners,
        settings: row.settings,
        status,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[derive(sqlx::FromRow)]
struct TenantMembershipRow {
    id: uuid::Uuid,
    slug: String,
    name: String,
    role: String,
    joined_at: chrono::DateTime<chrono::Utc>,
}

fn map_tenant_membership_row(row: TenantMembershipRow) -> DomainResult<TenantMembershipSummary> {
    let slug = TenantSlug::parse(&row.slug)
        .map_err(|e| DomainError::internal_msg(format!("invalid tenant slug in DB: {e}")))?;
    let role = TenantRole::parse(&row.role)
        .map_err(|e| DomainError::internal_msg(format!("invalid tenant role in DB: {e}")))?;

    Ok(TenantMembershipSummary {
        id: TenantId::from_uuid(row.id),
        slug,
        name: row.name,
        role,
        joined_at: row.joined_at,
    })
}

#[async_trait]
impl TenantRepository for PgTenantRepository {
    async fn create(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        let mut tx = self.pool.begin().await.map_err(DomainError::internal)?;

        let row: TenantRow = match sqlx::query_as!(
            TenantRow,
            r#"
            INSERT INTO tenants (id, slug, name, owner_id, max_members, max_owners, settings, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, slug, name, owner_id, max_members, max_owners, settings, status, created_at, updated_at
            "#,
            tenant.id.inner(),
            tenant.slug.as_str(),
            &tenant.name,
            tenant.owner_id.inner(),
            tenant.max_members,
            tenant.max_owners,
            &tenant.settings,
            tenant.status.as_str(),
            tenant.created_at,
            tenant.updated_at
        )
        .fetch_one(&mut *tx)
        .await
        {
            Ok(row) => row,
            Err(SqlxError::Database(db_err)) => {
                tx.rollback().await.ok();
                if db_err.is_unique_violation() {
                    return Err(DomainError::conflict("tenant slug already exists"));
                }
                if db_err.code().as_deref() == Some(PG_CHECK_VIOLATION) {
                    return Err(DomainError::TenantLimitReached);
                }
                return Err(DomainError::internal(db_err));
            }
            Err(err) => {
                tx.rollback().await.ok();
                return Err(DomainError::internal(err));
            }
        };

        if let Err(err) = seed_system_roles(&mut tx, tenant.id.inner()).await {
            tx.rollback().await.ok();
            return Err(err);
        }

        let owner_role_id = match find_role_id_by_name(&mut tx, tenant.id.inner(), "owner").await {
            Ok(id) => id,
            Err(err) => {
                tx.rollback().await.ok();
                return Err(err);
            }
        };

        if let Err(err) = sqlx::query!(
            r#"
            INSERT INTO user_tenant_memberships (tenant_id, user_id, role, joined_at, tenant_role_id, status)
            VALUES ($1, $2, 'owner', $3, $4, 'active')
            "#,
            tenant.id.inner(),
            tenant.owner_id.inner(),
            tenant.created_at,
            owner_role_id
        )
        .execute(&mut *tx)
        .await
        {
            tx.rollback().await.ok();
            return Err(DomainError::internal(err));
        }

        tx.commit().await.map_err(DomainError::internal)?;
        Ok(map_tenant_row(row)?)
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        id: TenantId,
    ) -> DomainResult<Option<Tenant>> {
        let row: Option<TenantRow> = sqlx::query_as!(
            TenantRow,
            r#"
            SELECT id, slug, name, owner_id, max_members, max_owners, settings, status, created_at, updated_at
            FROM tenants
            WHERE id = $1
            "#,
            id.inner()
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(row.map(map_tenant_row).transpose()?)
    }

    async fn find_by_slug(
        &self,
        _ctx: &ExecutionContext,
        slug: &TenantSlug,
    ) -> DomainResult<Option<Tenant>> {
        let row: Option<TenantRow> = sqlx::query_as!(
            TenantRow,
            r#"
            SELECT id, slug, name, owner_id, max_members, max_owners, settings, status, created_at, updated_at
            FROM tenants
            WHERE slug = $1
            "#,
            slug.as_str()
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(row.map(map_tenant_row).transpose()?)
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<Vec<TenantMembershipSummary>> {
        let rows: Vec<TenantMembershipRow> = sqlx::query_as!(
            TenantMembershipRow,
            r#"
            SELECT
                t.id, t.slug, t.name,
                m.role, m.joined_at
            FROM tenants t
            JOIN user_tenant_memberships m ON m.tenant_id = t.id
            WHERE m.user_id = $1
            ORDER BY t.created_at DESC
            "#,
            user_id.inner()
        )
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(rows
            .into_iter()
            .map(map_tenant_membership_row)
            .collect::<Result<Vec<_>, _>>()?)
    }

    async fn update(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        let result = sqlx::query!(
            r#"
            UPDATE tenants
            SET slug = $1, name = $2, owner_id = $3, max_members = $4, max_owners = $5, settings = $6, status = $7, updated_at = $8
            WHERE id = $9
            "#,
            tenant.slug.as_str(),
            &tenant.name,
            tenant.owner_id.inner(),
            tenant.max_members,
            tenant.max_owners,
            &tenant.settings,
            tenant.status.as_str(),
            tenant.updated_at,
            tenant.id.inner()
        )
        .execute(&self.pool)
        .await
        .map_err(|err| match err {
            SqlxError::Database(db_err) if db_err.is_unique_violation() => {
                DomainError::conflict("tenant slug already exists")
            }
            SqlxError::Database(db_err) => {
                if db_err.code().as_deref() == Some(PG_CHECK_VIOLATION) {
                    DomainError::TenantLimitReached
                } else {
                    DomainError::internal(db_err)
                }
            }
            other => DomainError::internal(other),
        })?;

        if result.rows_affected() == 0 {
            return Err(DomainError::not_found("tenant"));
        }

        Ok(tenant.clone())
    }

    async fn delete(&self, _ctx: &ExecutionContext, id: TenantId) -> DomainResult<()> {
        let result = sqlx::query!(
            r#"
            DELETE FROM tenants
            WHERE id = $1
            "#,
            id.inner()
        )
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::not_found("tenant"));
        }

        Ok(())
    }

    async fn count_owned_by_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<i64> {
        let count: i64 = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) AS "count!"
            FROM tenants
            WHERE owner_id = $1 AND status = 'active'
            "#,
            user_id.inner()
        )
        .fetch_one(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(count)
    }
}

async fn find_role_id_by_name(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: uuid::Uuid,
    name: &str,
) -> DomainResult<uuid::Uuid> {
    let id: Option<uuid::Uuid> = sqlx::query_scalar!(
        r#"
        SELECT id AS "id!" FROM tenant_roles
        WHERE tenant_id = $1 AND name = $2
        "#,
        tenant_id,
        name
    )
    .fetch_optional(&mut **tx)
    .await
    .map_err(DomainError::internal)?;

    id.ok_or_else(|| DomainError::internal_msg(format!("missing {name} role for tenant")))
}

async fn seed_system_roles(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    tenant_id: uuid::Uuid,
) -> DomainResult<()> {
    sqlx::query!(
        r#"
        INSERT INTO tenant_roles (tenant_id, name, description, is_system, is_custom)
        VALUES
            ($1, 'owner', 'Full control over the tenant', TRUE, FALSE),
            ($1, 'admin', 'Can manage tenant settings, members, and roles', TRUE, FALSE),
            ($1, 'member', 'Base tenant access', TRUE, FALSE),
            ($1, 'guest', 'Limited read-only access', TRUE, FALSE)
        ON CONFLICT (tenant_id, name) DO NOTHING
        "#,
        tenant_id
    )
    .execute(&mut **tx)
    .await
    .map_err(DomainError::internal)?;

    sqlx::query!(
        r#"
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM tenant_roles r
        CROSS JOIN permissions p
        WHERE r.tenant_id = $1 AND r.is_system = TRUE
          AND (
              (r.name = 'owner')
              OR (r.name = 'admin' AND p.name NOT IN ('tenant.delete'))
              OR (r.name = 'member' AND p.name IN ('tenant.view', 'content.view', 'content.create', 'content.edit'))
              OR (r.name = 'guest' AND p.name IN ('tenant.view', 'content.view'))
          )
        ON CONFLICT (role_id, permission_id) DO NOTHING
        "#,
        tenant_id
    )
    .execute(&mut **tx)
    .await
    .map_err(DomainError::internal)?;

    Ok(())
}
