//! Adapter from auth_service `PasswordHasher` port to the persistence password hasher.

use async_trait::async_trait;

use base::ports::{PasswordHashError, PasswordHasher};

/// Adapter wrapping a [`persistence::ports::PasswordHasher`].
pub struct PasswordHasherAdapter<T> {
    inner: T,
}

impl<T> PasswordHasherAdapter<T> {
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
