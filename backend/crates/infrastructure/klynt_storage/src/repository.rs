//! Repository base trait and utilities.

use crate::error::StorageError;
use async_trait::async_trait;

/// Base repository trait
#[async_trait]
pub trait Repository: Send + Sync {
    /// Check if repository is healthy
    async fn health_check(&self) -> bool;
}

/// Transactional operations trait
#[async_trait]
pub trait Transactional: Repository {
    type Transaction;

    /// Begin a transaction
    async fn begin_transaction(&self) -> Result<Self::Transaction, StorageError>;

    /// Commit a transaction
    async fn commit(&self, transaction: Self::Transaction) -> Result<(), StorageError>;

    /// Rollback a transaction
    async fn rollback(&self, transaction: Self::Transaction) -> Result<(), StorageError>;
}
