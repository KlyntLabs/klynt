use async_trait::async_trait;

use crate::domain::errors::DomainError;
use crate::domain::repositories::UserRepository;

#[async_trait]
pub trait Transaction: Send + Sync {
    fn users(&self) -> &dyn UserRepository;
    async fn commit(self: Box<Self>) -> Result<(), DomainError>;
    async fn rollback(self: Box<Self>) -> Result<(), DomainError>;
}

#[async_trait]
pub trait UnitOfWork: Send + Sync {
    async fn begin(&self) -> Result<Box<dyn Transaction>, DomainError>;
}
