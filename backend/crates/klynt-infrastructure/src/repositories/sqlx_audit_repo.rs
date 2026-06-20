use async_trait::async_trait;
use sqlx::PgPool;

use klynt_domain::audit::AuditEvent;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
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
}
