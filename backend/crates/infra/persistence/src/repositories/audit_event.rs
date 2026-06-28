use async_trait::async_trait;
use sqlx::types::ipnetwork::IpNetwork;
use sqlx::PgPool;
use std::str::FromStr;

use crate::repositories::AuditEventRepository;
use base::ctx::ExecutionContext;
use domain::DomainError;
use observability::audit::types::AuditEvent;

/// Parse an IP address string into an `IpNetwork` for PostgreSQL `INET`.
fn parse_ip_network(s: &str) -> Result<IpNetwork, String> {
    IpNetwork::from_str(s).map_err(|e| e.to_string())
}

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
    async fn log(&self, _ctx: &ExecutionContext, event: AuditEvent) -> Result<(), DomainError> {
        let actor_ip_address = event
            .actor_ip_address
            .as_deref()
            .map(parse_ip_network)
            .transpose()
            .map_err(|e| DomainError::internal_msg(format!("invalid actor IP address: {e}")))?;

        sqlx::query!(
            r#"
            INSERT INTO audit_events (
                id, actor_user_id, actor_ip_address,
                action, resource_type, resource_id,
                tenant_id, before_data, after_data,
                success, error_message, request_id
            )
            VALUES ($1, $2, $3::INET, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            "#,
            event.id,
            event.actor_user_id.map(|id| id.0),
            actor_ip_address,
            event.action.to_string(),
            event.resource_type.to_string(),
            event.resource_id,
            event.tenant_id,
            event.before_data,
            event.after_data,
            event.success,
            event.error_message,
            event.request_id
        )
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        Ok(())
    }
}
