//! Adapter from auth_service `PasswordHasher` port to legacy password hasher.

use async_trait::async_trait;

use crate::application::ports::PasswordHasher;
use crate::error::AuthError;

/// Adapter wrapping a legacy [`klynt_storage::ports::PasswordHasher`].
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
    T: klynt_storage::ports::PasswordHasher,
{
    async fn hash(&self, password: &str) -> Result<String, AuthError> {
        self.inner
            .hash(password)
            .await
            .map(|hashed| hashed.as_str().to_string())
            .map_err(|e| {
                AuthError::Domain(klynt_shared_domain::DomainError::Internal(e.to_string()))
            })
    }

    async fn verify(&self, password: &str, hash: &str) -> Result<bool, AuthError> {
        let hashed = klynt_storage::ports::HashedPassword::new(hash);
        self.inner.verify(password, &hashed).await.map_err(|e| {
            AuthError::Domain(klynt_shared_domain::DomainError::Internal(e.to_string()))
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn hashes_and_verifies_password() {
        let hasher = klynt_infrastructure::password_hasher::Argon2PasswordHasher::new();
        let adapter = PasswordHasherAdapter::new(hasher);

        let hash = adapter.hash("Str0ng!Pass#123").await.unwrap();
        assert!(adapter.verify("Str0ng!Pass#123", &hash).await.unwrap());
        assert!(!adapter.verify("wrong-password", &hash).await.unwrap());
    }
}
