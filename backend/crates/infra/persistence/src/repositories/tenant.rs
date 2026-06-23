//! PostgreSQL implementation of the tenant repository.

use std::str::FromStr;

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::repository::TenantRepository;
use domain::{DomainError, DomainResult, Tenant, TenantId, TenantSlug, TenantStatus, UserId};
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

#[derive(sqlx::FromRow)]
struct TenantRow {
    id: uuid::Uuid,
    slug: String,
    name: String,
    owner_id: uuid::Uuid,
    status: String,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

impl From<TenantRow> for Tenant {
    fn from(row: TenantRow) -> Self {
        // A row stored by this repository is always valid; failures here are
        // treated as internal corruption. We panic rather than propagate to keep
        // the trait signature clean, matching the invariant that the database
        // is the source of truth for valid tenant states.
        let status = TenantStatus::from_str(&row.status)
            .expect("database contains an invalid tenant status");
        let slug = TenantSlug::parse(&row.slug).expect("database contains an invalid tenant slug");

        Self {
            id: TenantId::from_uuid(row.id),
            slug,
            name: row.name,
            owner_id: UserId::from_uuid(row.owner_id),
            status,
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

#[async_trait]
impl TenantRepository for PgTenantRepository {
    async fn create(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        let mut tx = self.pool.begin().await.map_err(DomainError::internal)?;

        let row: TenantRow = match sqlx::query_as(
            r#"
            INSERT INTO tenants (id, slug, name, owner_id, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, slug, name, owner_id, status, created_at, updated_at
            "#,
        )
        .bind(tenant.id.inner())
        .bind(tenant.slug.as_str())
        .bind(&tenant.name)
        .bind(tenant.owner_id.inner())
        .bind(tenant.status.as_str())
        .bind(tenant.created_at)
        .bind(tenant.updated_at)
        .fetch_one(&mut *tx)
        .await
        {
            Ok(row) => row,
            Err(SqlxError::Database(db_err)) => {
                tx.rollback().await.ok();
                if db_err.is_unique_violation() {
                    return Err(DomainError::conflict("tenant slug already exists"));
                }
                if db_err.code().as_deref() == Some("23514") {
                    return Err(DomainError::TenantLimitReached);
                }
                return Err(DomainError::internal(db_err));
            }
            Err(err) => {
                tx.rollback().await.ok();
                return Err(DomainError::internal(err));
            }
        };

        if let Err(err) = sqlx::query(
            r#"
            INSERT INTO user_tenant_memberships (tenant_id, user_id, role, joined_at)
            VALUES ($1, $2, 'owner', $3)
            "#,
        )
        .bind(tenant.id.inner())
        .bind(tenant.owner_id.inner())
        .bind(tenant.created_at)
        .execute(&mut *tx)
        .await
        {
            tx.rollback().await.ok();
            return Err(DomainError::internal(err));
        }

        tx.commit().await.map_err(DomainError::internal)?;
        Ok(row.into())
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        id: TenantId,
    ) -> DomainResult<Option<Tenant>> {
        let row: Option<TenantRow> = sqlx::query_as(
            r#"
            SELECT id, slug, name, owner_id, status, created_at, updated_at
            FROM tenants
            WHERE id = $1
            "#,
        )
        .bind(id.inner())
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(row.map(Tenant::from))
    }

    async fn find_by_slug(
        &self,
        _ctx: &ExecutionContext,
        slug: &TenantSlug,
    ) -> DomainResult<Option<Tenant>> {
        let row: Option<TenantRow> = sqlx::query_as(
            r#"
            SELECT id, slug, name, owner_id, status, created_at, updated_at
            FROM tenants
            WHERE slug = $1
            "#,
        )
        .bind(slug.as_str())
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(row.map(Tenant::from))
    }

    async fn list_for_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> DomainResult<Vec<Tenant>> {
        let rows: Vec<TenantRow> = sqlx::query_as(
            r#"
            SELECT t.id, t.slug, t.name, t.owner_id, t.status, t.created_at, t.updated_at
            FROM tenants t
            JOIN user_tenant_memberships m ON m.tenant_id = t.id
            WHERE m.user_id = $1
            ORDER BY t.created_at DESC
            "#,
        )
        .bind(user_id.inner())
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(rows.into_iter().map(Tenant::from).collect())
    }

    async fn update(&self, _ctx: &ExecutionContext, tenant: &Tenant) -> DomainResult<Tenant> {
        let result = sqlx::query(
            r#"
            UPDATE tenants
            SET slug = $1, name = $2, owner_id = $3, status = $4, updated_at = $5
            WHERE id = $6
            "#,
        )
        .bind(tenant.slug.as_str())
        .bind(&tenant.name)
        .bind(tenant.owner_id.inner())
        .bind(tenant.status.as_str())
        .bind(tenant.updated_at)
        .bind(tenant.id.inner())
        .execute(&self.pool)
        .await
        .map_err(|err| match err {
            SqlxError::Database(db_err) if db_err.is_unique_violation() => {
                DomainError::conflict("tenant slug already exists")
            }
            SqlxError::Database(db_err) => {
                if db_err.code().as_deref() == Some("23514") {
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
        let result = sqlx::query(
            r#"
            DELETE FROM tenants
            WHERE id = $1
            "#,
        )
        .bind(id.inner())
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
        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM tenants
            WHERE owner_id = $1 AND status = 'active'
            "#,
        )
        .bind(user_id.inner())
        .fetch_one(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(count)
    }
}
