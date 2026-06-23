//! PostgreSQL implementation of the permission repository.

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::permission::PermissionRepository;
use domain::{DomainError, DomainResult, Permission, PermissionCategory, PermissionId};
use sqlx::{FromRow, PgPool};
use std::str::FromStr;

/// PostgreSQL implementation of the permission repository.
pub struct PgPermissionRepository {
    pool: PgPool,
}

impl PgPermissionRepository {
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
struct PermissionRow {
    id: uuid::Uuid,
    name: String,
    description: String,
    category: String,
}

fn map_permission_row(row: PermissionRow) -> DomainResult<Permission> {
    let category = PermissionCategory::from_str(&row.category).map_err(|e| {
        DomainError::internal_msg(format!("invalid permission category in DB: {e}"))
    })?;

    Ok(Permission {
        id: PermissionId::from_uuid(row.id),
        name: row.name,
        description: row.description,
        category,
    })
}

#[async_trait]
impl PermissionRepository for PgPermissionRepository {
    async fn list_permissions(&self, _ctx: &ExecutionContext) -> DomainResult<Vec<Permission>> {
        let rows: Vec<PermissionRow> = sqlx::query_as(
            r#"
            SELECT id, name, description, category
            FROM permissions
            ORDER BY category, name
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        rows.into_iter()
            .map(map_permission_row)
            .collect::<Result<Vec<_>, _>>()
    }

    async fn find_permission_by_name(
        &self,
        _ctx: &ExecutionContext,
        name: &str,
    ) -> DomainResult<Option<Permission>> {
        let row: Option<PermissionRow> = sqlx::query_as(
            r#"
            SELECT id, name, description, category
            FROM permissions
            WHERE name = $1
            "#,
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        row.map(map_permission_row).transpose()
    }
}
