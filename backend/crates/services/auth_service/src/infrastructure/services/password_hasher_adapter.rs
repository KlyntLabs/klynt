//! Adapter from auth_service `PasswordHasher` port to legacy password hasher.

use async_trait::async_trait;

use klynt_base::ports::{PasswordHashError, PasswordHasher};

/// Adapter wrapping a legacy [`klynt_persistence::ports::PasswordHasher`].
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
    T: klynt_persistence::ports::PasswordHasher,
{
    async fn hash(&self, password: &str) -> Result<String, PasswordHashError> {
        self.inner
            .hash(password)
            .await
            .map(|hashed| hashed.as_str().to_string())
            .map_err(|e| PasswordHashError::Internal(e.to_string()))
    }

    async fn verify(&self, password: &str, hash: &str) -> Result<bool, PasswordHashError> {
        let hashed = klynt_persistence::ports::HashedPassword::new(hash);
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
        let hasher = klynt_persistence::password_hasher::Argon2PasswordHasher::new();
        let adapter = PasswordHasherAdapter::new(hasher);

        let hash = adapter.hash("Str0ng!Pass#123").await.unwrap();
        assert!(adapter.verify("Str0ng!Pass#123", &hash).await.unwrap());
        assert!(!adapter.verify("wrong-password", &hash).await.unwrap());
    }
}
