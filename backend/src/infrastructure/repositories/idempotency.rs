use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use uuid::Uuid;

use crate::application::users::UserDto;
use crate::domain::errors::DomainError;

#[async_trait]
pub trait IdempotencyStore: Send + Sync {
    async fn get(&self, key: Uuid) -> Result<Option<UserDto>, DomainError>;
    async fn set(&self, key: Uuid, user: UserDto) -> Result<(), DomainError>;

    /// Insert `user` only if `key` is absent. Returns the existing value when one is present.
    async fn get_or_insert(&self, key: Uuid, user: UserDto)
        -> Result<Option<UserDto>, DomainError>;
}

#[derive(Debug, Default)]
pub struct InMemoryIdempotencyStore {
    cache: Mutex<HashMap<Uuid, UserDto>>,
}

impl InMemoryIdempotencyStore {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl IdempotencyStore for InMemoryIdempotencyStore {
    async fn get(&self, key: Uuid) -> Result<Option<UserDto>, DomainError> {
        let cache = self.cache.lock().unwrap();
        Ok(cache.get(&key).cloned())
    }

    async fn set(&self, key: Uuid, user: UserDto) -> Result<(), DomainError> {
        let mut cache = self.cache.lock().unwrap();
        cache.insert(key, user);
        Ok(())
    }

    async fn get_or_insert(
        &self,
        key: Uuid,
        user: UserDto,
    ) -> Result<Option<UserDto>, DomainError> {
        let mut cache = self.cache.lock().unwrap();
        if let Some(existing) = cache.get(&key) {
            return Ok(Some(existing.clone()));
        }
        cache.insert(key, user);
        Ok(None)
    }
}
