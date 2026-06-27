//! Infrastructure facade — groups infrastructure adapters.

use async_trait::async_trait;

use base::ports::Clock;
use base::ports::EmailSender;
use base::ports::{PasswordHashError, PasswordHasher};
use std::sync::Arc;

/// Infrastructure facade — single access point to infrastructure adapters.
pub struct InfraFacade {
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub email_sender: Arc<dyn EmailSender>,
    pub clock: Arc<dyn Clock>,
}

impl InfraFacade {
    /// Create a new infrastructure facade.
    pub fn new(
        password_hasher: Arc<dyn PasswordHasher>,
        email_sender: Arc<dyn EmailSender>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            password_hasher,
            email_sender,
            clock,
        }
    }

    /// Create a facade with a default Argon2 password hasher.
    pub fn with_default_password_hasher(
        email_sender: Arc<dyn EmailSender>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        let password_hasher = Arc::new(PasswordHasherAdapter::new(
            persistence::password_hasher::Argon2PasswordHasher::new(),
        )) as Arc<dyn PasswordHasher>;
        Self::new(password_hasher, email_sender, clock)
    }
}

/// Adapter from the service [`PasswordHasher`] port to the persistence password hasher.
pub struct PasswordHasherAdapter<T> {
    inner: T,
}

impl<T> PasswordHasherAdapter<T> {
    /// Wrap a persistence password hasher.
    pub fn new(inner: T) -> Self {
        Self { inner }
    }
}

#[async_trait]
impl<T> PasswordHasher for PasswordHasherAdapter<T>
where
    T: persistence::ports::PasswordHasher,
{
    async fn hash(&self, password: &str) -> Result<String, PasswordHashError> {
        self.inner
            .hash(password)
            .await
            .map(|hashed| hashed.as_str().to_string())
            .map_err(|e| PasswordHashError::Internal(e.to_string()))
    }

    async fn verify(&self, password: &str, hash: &str) -> Result<bool, PasswordHashError> {
        let hashed = persistence::ports::HashedPassword::new(hash);
        self.inner
            .verify(password, &hashed)
            .await
            .map_err(|e| PasswordHashError::Internal(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn hashes_and_verifies_password() {
        let hasher = persistence::password_hasher::Argon2PasswordHasher::new();
        let adapter = PasswordHasherAdapter::new(hasher);

        let hash = adapter.hash("Str0ng!Pass#123").await.unwrap();
        assert!(adapter.verify("Str0ng!Pass#123", &hash).await.unwrap());
        assert!(!adapter.verify("wrong-password", &hash).await.unwrap());
    }
}
