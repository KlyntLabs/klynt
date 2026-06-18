use std::net::IpAddr;

use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::errors::DomainError;
use crate::domain::models::UserDto;

#[async_trait]
pub trait IdempotencyStore: Send + Sync {
    async fn get(&self, key: Uuid) -> Result<Option<UserDto>, DomainError>;
    async fn set(&self, key: Uuid, user: UserDto) -> Result<(), DomainError>;

    /// Insert `user` only if `key` is absent. Returns the existing value when one is present.
    async fn get_or_insert(&self, key: Uuid, user: UserDto)
        -> Result<Option<UserDto>, DomainError>;
}

pub trait RateLimiter: Send + Sync {
    fn is_allowed(&self, ip: IpAddr) -> bool;
}
