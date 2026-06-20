use async_trait::async_trait;
use chrono::Utc;
use sqlx::PgPool;
use std::str::FromStr;
use uuid::Uuid;

use klynt_domain::audit::AuditEvent;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::UserId;
use klynt_domain::repositories::AuditEventRepository;

/// PostgreSQL implementation of audit event repository.
pub struct PgAuditEventRepository {
    pool: PgPool,
}

impl PgAuditEventRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl AuditEventRepository for PgAuditEventRepository {
    async fn log(&self, _ctx: &Ctx, event: AuditEvent) -> Result<(), DomainError> {
        sqlx::query(
            r#"
            INSERT INTO audit_events (
                id, actor_user_id, actor_ip_address,
                action, resource_type, resource_id,
                tenant_id, before_data, after_data,
                success, error_message, request_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            "#,
        )
        .bind(event.id)
        .bind(event.actor_user_id.map(|id| id.0))
        .bind(event.actor_ip_address)
        .bind(event.action.to_string())
        .bind(event.resource_type.to_string())
        .bind(event.resource_id)
        .bind(event.tenant_id)
        .bind(event.before_data)
        .bind(event.after_data)
        .bind(event.success)
        .bind(event.error_message)
        .bind(event.request_id)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(())
    }

    async fn find_by_user(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError> {
        let limit_i64 =
            i64::try_from(limit).map_err(|_| DomainError::internal_msg("limit exceeds maximum"))?;

        let rows = sqlx::query_as::<_, AuditEventRow>(
            r#"
            SELECT
                id, actor_user_id, actor_ip_address,
                action, resource_type, resource_id,
                tenant_id, before_data, after_data,
                success, error_message, created_at, request_id
            FROM audit_events
            WHERE actor_user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(user_id.0)
        .bind(limit_i64)
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        rows.into_iter()
            .map(AuditEventRow::into_audit_event)
            .collect()
    }

    async fn find_by_resource(
        &self,
        _ctx: &Ctx,
        resource_type: &str,
        resource_id: Uuid,
        limit: usize,
    ) -> Result<Vec<AuditEvent>, DomainError> {
        let limit_i64 =
            i64::try_from(limit).map_err(|_| DomainError::internal_msg("limit exceeds maximum"))?;

        let rows = sqlx::query_as::<_, AuditEventRow>(
            r#"
            SELECT
                id, actor_user_id, actor_ip_address,
                action, resource_type, resource_id,
                tenant_id, before_data, after_data,
                success, error_message, created_at, request_id
            FROM audit_events
            WHERE resource_type = $1 AND resource_id = $2
            ORDER BY created_at DESC
            LIMIT $3
            "#,
        )
        .bind(resource_type)
        .bind(resource_id)
        .bind(limit_i64)
        .fetch_all(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        rows.into_iter()
            .map(AuditEventRow::into_audit_event)
            .collect()
    }
}

/// Helper struct for SQLx mapping.
#[derive(sqlx::FromRow)]
struct AuditEventRow {
    id: Uuid,
    actor_user_id: Option<Uuid>,
    actor_ip_address: Option<String>,
    action: String,
    resource_type: String,
    resource_id: Option<Uuid>,
    tenant_id: Option<Uuid>,
    before_data: Option<serde_json::Value>,
    after_data: Option<serde_json::Value>,
    success: bool,
    error_message: Option<String>,
    created_at: chrono::DateTime<Utc>,
    request_id: Option<Uuid>,
}

impl AuditEventRow {
    fn into_audit_event(self) -> Result<AuditEvent, DomainError> {
        use klynt_domain::audit::{AuditAction, ResourceType};

        let action = AuditAction::from_str(&self.action).map_err(|_| {
            DomainError::internal_msg(format!("Invalid audit action: {}", self.action))
        })?;

        let resource_type = ResourceType::from_str(&self.resource_type).map_err(|_| {
            DomainError::internal_msg(format!("Invalid resource type: {}", self.resource_type))
        })?;

        Ok(AuditEvent {
            id: self.id,
            actor_user_id: self.actor_user_id.map(UserId),
            actor_ip_address: self.actor_ip_address,
            action,
            resource_type,
            resource_id: self.resource_id,
            tenant_id: self.tenant_id,
            before_data: self.before_data,
            after_data: self.after_data,
            success: self.success,
            error_message: self.error_message,
            created_at: self.created_at,
            request_id: self.request_id,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use klynt_domain::audit::{AuditAction, ResourceType};

    async fn test_pool() -> PgPool {
        let url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://klynt:klynt@localhost:5432/test".to_string());
        PgPool::connect(&url).await.unwrap()
    }

    #[tokio::test]
    #[ignore = "requires database"]
    async fn logs_and_retrieves_audit_events() {
        let pool = test_pool().await;
        let repo = PgAuditEventRepository::new(pool);
        let ctx = Ctx::guest(Uuid::new_v4());

        let event = AuditEvent::new(AuditAction::SessionCreated, ResourceType::Session)
            .with_actor(UserId::new())
            .with_request_id(Uuid::new_v4());

        repo.log(&ctx, event.clone()).await.unwrap();

        let events = repo
            .find_by_user(&ctx, event.actor_user_id.unwrap(), 10)
            .await
            .unwrap();
        assert!(!events.is_empty());
    }
}
