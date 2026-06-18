use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;
use uuid::Uuid;

use klynt_domain::errors::DomainError;
use klynt_domain::ports::IdempotencyStore;

#[derive(Debug)]
pub struct InMemoryIdempotencyStore<T> {
    pub(crate) cache: Mutex<HashMap<Uuid, T>>,
}

impl<T> Default for InMemoryIdempotencyStore<T> {
    fn default() -> Self {
        Self {
            cache: Mutex::new(HashMap::new()),
        }
    }
}

impl<T> InMemoryIdempotencyStore<T> {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl<T> IdempotencyStore<T> for InMemoryIdempotencyStore<T>
where
    T: Clone + Send + Sync + 'static,
{
    async fn get(&self, key: Uuid) -> Result<Option<T>, DomainError> {
        let cache = self.cache.lock().unwrap();
        Ok(cache.get(&key).cloned())
    }

    async fn set(&self, key: Uuid, value: T) -> Result<(), DomainError> {
        let mut cache = self.cache.lock().unwrap();
        cache.insert(key, value);
        Ok(())
    }

    async fn get_or_insert(&self, key: Uuid, value: T) -> Result<Option<T>, DomainError> {
        let mut cache = self.cache.lock().unwrap();
        if let Some(existing) = cache.get(&key) {
            return Ok(Some(existing.clone()));
        }
        cache.insert(key, value);
        Ok(None)
    }
}
