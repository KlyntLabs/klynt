pub mod logger_impl;
pub mod types;

use std::sync::Arc;

use base::ctx::ExecutionContext;
use domain::DomainError;
use serde::Serialize;

use crate::types::AuditEventRepository;

/// Serialize an audit snapshot into a JSON value.
///
/// Audit snapshots are simple, derive-`Serialize` structs, so this should
/// never fail in practice. The helper keeps callers concise.
fn snapshot_to_value<T: Serialize>(snapshot: T) -> serde_json::Value {
    serde_json::to_value(snapshot).unwrap_or_else(|e| {
        tracing::warn!(error = %e, "failed to serialize audit snapshot");
        serde_json::Value::Null
    })
}

/// Audit logging service.
///
/// Logs all security-relevant mutations for compliance and incident response.
pub struct AuditService {
    repo: Arc<dyn AuditEventRepository>,
}

impl AuditService {
    pub fn new(repo: Arc<dyn AuditEventRepository>) -> Self {
        Self { repo }
    }

    /// Log an audit event, swallowing any error.
    ///
    /// Audit failures must never fail the request. This method encapsulates
    /// the "log, warn, move on" policy so callers don't replicate the
    /// error-handling boilerplate.
    pub async fn try_log(
        &self,
        ctx: &ExecutionContext,
        action: &str,
        log_fn: impl std::future::Future<Output = Result<(), DomainError>>,
    ) {
        if let Err(e) = log_fn.await {
            tracing::warn!(
                error = %e,
                action = action,
                request_id = ?ctx.request.request_id.0,
                "failed to log audit event"
            );
        }
    }
}

mod role;
mod session;
mod tenant;
mod user;

#[cfg(test)]
mod tests;
