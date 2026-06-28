pub use super::*;
pub use crate::types::{AuditAction, AuditEvent, AuditEventRepository, ResourceType};
pub use base::ctx::{ExecutionContext, RequestContext};
pub use base::ports::audit::{
    AuditLogger, PasswordChangeSnapshot, ProfileUpdateSnapshot, RoleMetadataSnapshot,
};
pub use domain::{DomainError, PermissionId, RoleId, TenantId, UserId};
pub use uuid::Uuid;

use std::str::FromStr;
use std::sync::{Arc, Mutex};

struct CapturingRepo {
    events: Mutex<Vec<AuditEvent>>,
}

impl CapturingRepo {
    fn new() -> Self {
        Self {
            events: Mutex::new(Vec::new()),
        }
    }

    fn events(&self) -> Vec<AuditEvent> {
        self.events.lock().unwrap().clone()
    }
}

#[async_trait::async_trait]
impl AuditEventRepository for CapturingRepo {
    async fn log(&self, _ctx: &ExecutionContext, event: AuditEvent) -> Result<(), DomainError> {
        self.events.lock().unwrap().push(event);
        Ok(())
    }
}

struct ErrorRepo;

#[async_trait::async_trait]
impl AuditEventRepository for ErrorRepo {
    async fn log(&self, _ctx: &ExecutionContext, _event: AuditEvent) -> Result<(), DomainError> {
        Err(DomainError::Internal("audit storage failed".to_string()))
    }
}

fn capturing_service() -> (AuditService, Arc<CapturingRepo>) {
    let repo = Arc::new(CapturingRepo::new());
    let service = AuditService::new(repo.clone());
    (service, repo)
}

mod role;
mod session;
mod tenant;
mod user;
