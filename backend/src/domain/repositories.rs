use async_trait::async_trait;

use crate::domain::ctx::Ctx;
use crate::domain::errors::DomainError;
use crate::domain::models::{Email, User, UserId};

pub enum CreateResult {
    Created,
    AlreadyExists(User),
}

#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn create_if_not_exists(
        &self,
        ctx: &Ctx,
        email: &Email,
        user: &User,
    ) -> Result<CreateResult, DomainError>;

    async fn find_by_email(&self, ctx: &Ctx, email: &Email) -> Result<Option<User>, DomainError>;

    async fn find_by_id(&self, ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError>;
}
