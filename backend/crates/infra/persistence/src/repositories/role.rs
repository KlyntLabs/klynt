//! PostgreSQL implementation of the role repository.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::permission::RoleRepository;
use domain::{DomainError, DomainResult, PermissionId, RoleId, TenantId, TenantRoleAggregate};
use sqlx::{FromRow, PgPool};

/// PostgreSQL implementation of the role repository.
pub struct PgRoleRepository {
    pool: PgPool,
}

impl PgRoleRepository {
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
struct RoleRow {
    id: uuid::Uuid,
    tenant_id: uuid::Uuid,
    name: String,
    description: String,
    is_custom: bool,
    is_system: bool,
    permission_ids: Vec<uuid::Uuid>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

fn map_role_row(row: RoleRow) -> DomainResult<TenantRoleAggregate> {
    Ok(TenantRoleAggregate {
        id: RoleId::from_uuid(row.id),
        tenant_id: TenantId::from_uuid(row.tenant_id),
        name: row.name,
        description: row.description,
        is_custom: row.is_custom,
        is_system: row.is_system,
        permission_ids: row
            .permission_ids
            .into_iter()
            .map(PermissionId::from_uuid)
            .collect(),
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

#[async_trait]
impl RoleRepository for PgRoleRepository {
    async fn list_roles_for_tenant(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
    ) -> DomainResult<Vec<TenantRoleAggregate>> {
        let rows: Vec<RoleRow> = sqlx::query_as(
            r#"
            SELECT
                r.id,
                r.tenant_id,
                r.name,
                r.description,
                r.is_custom,
                r.is_system,
                r.created_at,
                r.updated_at,
                COALESCE(
                    array_agg(rp.permission_id)
                    FILTER (WHERE rp.permission_id IS NOT NULL),
                    '{}'
                ) AS permission_ids
            FROM tenant_roles r
            LEFT JOIN role_permissions rp ON rp.role_id = r.id
            WHERE r.tenant_id = $1
            GROUP BY r.id
            ORDER BY r.is_system DESC, r.name
            "#,
        )
        .bind(tenant_id.inner())
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        rows.into_iter()
            .map(map_role_row)
            .collect::<Result<Vec<_>, _>>()
    }

    async fn find_role_by_name(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        name: &str,
    ) -> DomainResult<Option<TenantRoleAggregate>> {
        let row: Option<RoleRow> = sqlx::query_as(
            r#"
            SELECT
                r.id,
                r.tenant_id,
                r.name,
                r.description,
                r.is_custom,
                r.is_system,
                r.created_at,
                r.updated_at,
                COALESCE(
                    array_agg(rp.permission_id)
                    FILTER (WHERE rp.permission_id IS NOT NULL),
                    '{}'
                ) AS permission_ids
            FROM tenant_roles r
            LEFT JOIN role_permissions rp ON rp.role_id = r.id
            WHERE r.tenant_id = $1 AND r.name = $2
            GROUP BY r.id
            "#,
        )
        .bind(tenant_id.inner())
        .bind(name)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        row.map(map_role_row).transpose()
    }

    async fn find_role_by_id(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
    ) -> DomainResult<Option<TenantRoleAggregate>> {
        let row: Option<RoleRow> = sqlx::query_as(
            r#"
            SELECT
                r.id,
                r.tenant_id,
                r.name,
                r.description,
                r.is_custom,
                r.is_system,
                r.created_at,
                r.updated_at,
                COALESCE(
                    array_agg(rp.permission_id)
                    FILTER (WHERE rp.permission_id IS NOT NULL),
                    '{}'
                ) AS permission_ids
            FROM tenant_roles r
            LEFT JOIN role_permissions rp ON rp.role_id = r.id
            WHERE r.tenant_id = $1 AND r.id = $2
            GROUP BY r.id
            "#,
        )
        .bind(tenant_id.inner())
        .bind(role_id.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        row.map(map_role_row).transpose()
    }

    async fn create_role(
        &self,
        _ctx: &ExecutionContext,
        role: TenantRoleAggregate,
    ) -> DomainResult<()> {
        let mut tx = self.pool.begin().await.map_err(DomainError::internal)?;

        if let Err(err) = sqlx::query(
            r#"
            INSERT INTO tenant_roles (id, tenant_id, name, description, is_custom, is_system, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            "#,
        )
        .bind(role.id.0)
        .bind(role.tenant_id.inner())
        .bind(&role.name)
        .bind(&role.description)
        .bind(role.is_custom)
        .bind(role.is_system)
        .bind(role.created_at)
        .bind(role.updated_at)
        .execute(&mut *tx)
        .await
        {
            tx.rollback().await.ok();
            return Err(map_role_db_error(err));
        }

        if let Err(err) = insert_role_permissions(&mut tx, role.id, &role.permission_ids).await {
            tx.rollback().await.ok();
            return Err(err);
        }

        tx.commit().await.map_err(DomainError::internal)
    }

    async fn update_role_permissions(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
        permission_ids: Vec<PermissionId>,
    ) -> DomainResult<()> {
        let mut tx = self.pool.begin().await.map_err(DomainError::internal)?;

        let result = sqlx::query(
            r#"
            UPDATE tenant_roles
            SET updated_at = NOW()
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id.inner())
        .bind(role_id.0)
        .execute(&mut *tx)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            tx.rollback().await.ok();
            return Err(DomainError::not_found("role"));
        }

        if let Err(err) = sqlx::query(
            r#"
            DELETE FROM role_permissions
            WHERE role_id = $1
            "#,
        )
        .bind(role_id.0)
        .execute(&mut *tx)
        .await
        {
            tx.rollback().await.ok();
            return Err(DomainError::internal(err));
        }

        if let Err(err) = insert_role_permissions(&mut tx, role_id, &permission_ids).await {
            tx.rollback().await.ok();
            return Err(err);
        }

        tx.commit().await.map_err(DomainError::internal)
    }

    async fn delete_role(
        &self,
        _ctx: &ExecutionContext,
        tenant_id: TenantId,
        role_id: RoleId,
    ) -> DomainResult<()> {
        let result = sqlx::query(
            r#"
            DELETE FROM tenant_roles
            WHERE tenant_id = $1 AND id = $2 AND is_system = FALSE
            "#,
        )
        .bind(tenant_id.inner())
        .bind(role_id.0)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() > 0 {
            return Ok(());
        }

        let is_system: Option<bool> = sqlx::query_scalar(
            r#"
            SELECT is_system
            FROM tenant_roles
            WHERE tenant_id = $1 AND id = $2
            "#,
        )
        .bind(tenant_id.inner())
        .bind(role_id.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        match is_system {
            Some(true) => Err(DomainError::validation("cannot delete a system role")),
            Some(false) => Err(DomainError::not_found("role")),
            None => Err(DomainError::not_found("role")),
        }
    }
}

async fn insert_role_permissions(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    role_id: RoleId,
    permission_ids: &[PermissionId],
) -> DomainResult<()> {
    if permission_ids.is_empty() {
        return Ok(());
    }

    let role_ids: Vec<uuid::Uuid> = std::iter::repeat_n(role_id.0, permission_ids.len()).collect();
    let permission_uuids: Vec<uuid::Uuid> = permission_ids
        .iter()
        .map(|permission_id| permission_id.0)
        .collect();

    sqlx::query(
        r#"
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT * FROM UNNEST($1::uuid[], $2::uuid[])
        "#,
    )
    .bind(role_ids)
    .bind(permission_uuids)
    .execute(&mut **tx)
    .await
    .map_err(map_role_db_error)?;

    Ok(())
}

fn map_role_db_error(err: sqlx::Error) -> DomainError {
    match err {
        sqlx::Error::Database(db_err) => {
            if db_err.is_unique_violation() {
                DomainError::conflict("role name already exists")
            } else if db_err.is_foreign_key_violation() {
                DomainError::validation("permission not found")
            } else {
                DomainError::internal(db_err)
            }
        }
        other => DomainError::internal(other),
    }
}
