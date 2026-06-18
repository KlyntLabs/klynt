use std::sync::{Arc, Mutex};

use async_trait::async_trait;

use klynt_domain::errors::DomainError;
use klynt_domain::repositories::UserRepository;
use klynt_domain::unit_of_work::{Transaction, UnitOfWork};

use crate::repositories::in_memory_user::InMemoryUserRepository;

/// In-memory UnitOfWork implementation with snapshot isolation.
///
/// When a transaction begins, the current repository state is cloned into a
/// snapshot. All writes inside the transaction go to the snapshot. On commit,
/// the snapshot replaces the shared state; on rollback, the snapshot is dropped
/// and the shared state remains unchanged.
#[derive(Debug, Clone)]
pub struct InMemoryUnitOfWork {
    pub(crate) users: Arc<Mutex<InMemoryUserRepository>>,
}

impl InMemoryUnitOfWork {
    pub fn new(users: InMemoryUserRepository) -> Self {
        Self {
            users: Arc::new(Mutex::new(users)),
        }
    }
}

#[async_trait]
impl UnitOfWork for InMemoryUnitOfWork {
    async fn begin(&self) -> Result<Box<dyn Transaction>, DomainError> {
        let snapshot = self.users.lock().unwrap().clone();
        Ok(Box::new(InMemoryTransaction {
            snapshot: Some(snapshot),
            parent: Arc::clone(&self.users),
        }))
    }
}

struct InMemoryTransaction {
    snapshot: Option<InMemoryUserRepository>,
    parent: Arc<Mutex<InMemoryUserRepository>>,
}

#[async_trait]
impl Transaction for InMemoryTransaction {
    fn users(&self) -> &dyn UserRepository {
        self.snapshot
            .as_ref()
            .expect("snapshot present until commit")
    }

    async fn commit(mut self: Box<Self>) -> Result<(), DomainError> {
        if let Some(snapshot) = self.snapshot.take() {
            *self.parent.lock().unwrap() = snapshot;
        }
        Ok(())
    }

    async fn rollback(self: Box<Self>) -> Result<(), DomainError> {
        // Snapshot is dropped; parent remains unchanged.
        Ok(())
    }
}
