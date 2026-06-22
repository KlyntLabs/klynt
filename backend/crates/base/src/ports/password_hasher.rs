//! Shared password hasher port.

use async_trait::async_trait;

/// Errors that can occur when hashing or verifying passwords.
#[derive(Debug, thiserror::Error)]
pub enum PasswordHashError {
    /// Internal failure during password hashing/verification.
    #[error("password hashing failed: {0}")]
    Internal(String),
}

/// Port for password hashing operations.
#[async_trait]
pub trait PasswordHasher: Send + Sync {
    /// Hash a plaintext password.
    async fn hash(&self, password: &str) -> Result<String, PasswordHashError>;

    /// Verify a plaintext password against a stored hash.
    async fn verify(&self, password: &str, hash: &str) -> Result<bool, PasswordHashError>;
}
