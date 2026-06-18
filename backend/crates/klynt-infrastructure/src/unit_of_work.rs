use async_trait::async_trait;

use klynt_domain::errors::DomainError;
use klynt_domain::repositories::UserRepository;
use klynt_domain::unit_of_work::{Transaction, UnitOfWork};

use crate::repositories::in_memory_user::InMemoryUserRepository;

/// In-memory UnitOfWork implementation.
///
/// Note: The in-memory transaction uses a no-op commit/rollback. Writes are applied
/// directly to the shared repository storage, so rollback cannot undo them.
#[derive(Debug, Default, Clone)]
pub struct InMemoryUnitOfWork {
    users: InMemoryUserRepository,
}

impl InMemoryUnitOfWork {
    pub fn new(users: InMemoryUserRepository) -> Self {
        Self { users }
    }
}

#[async_trait]
impl UnitOfWork for InMemoryUnitOfWork {
    async fn begin(&self) -> Result<Box<dyn Transaction>, DomainError> {
        Ok(Box::new(InMemoryTransaction {
            users: self.users.clone(),
        }))
    }
}

struct InMemoryTransaction {
    users: InMemoryUserRepository,
}

#[async_trait]
impl Transaction for InMemoryTransaction {
    fn users(&self) -> &dyn UserRepository {
        &self.users
    }

    async fn commit(self: Box<Self>) -> Result<(), DomainError> {
        Ok(())
    }

    async fn rollback(self: Box<Self>) -> Result<(), DomainError> {
        Ok(())
    }
}
