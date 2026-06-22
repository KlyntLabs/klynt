//! Test double for [`PasswordHasher`] with deterministic, reversible hashes.

use async_trait::async_trait;

use crate::ports::{PasswordHashError, PasswordHasher};

/// Password hasher for tests that stores passwords with an optional prefix.
///
/// Hashing returns `{prefix}{password}`. Verification succeeds when the hash
/// matches the same transformation. This makes tests deterministic and avoids
/// the cost of real hashing algorithms.
#[derive(Clone, Debug)]
pub struct TestPasswordHasher {
    prefix: String,
}

impl TestPasswordHasher {
    /// Create a hasher with the default `hash-` prefix.
    pub fn new() -> Self {
        Self {
            prefix: "hash-".to_string(),
        }
    }

    /// Create a hasher with a custom prefix.
    pub fn with_prefix(prefix: impl Into<String>) -> Self {
        Self {
            prefix: prefix.into(),
        }
    }

    fn make_hash(&self, password: &str) -> String {
        format!("{}{}", self.prefix, password)
    }
}

impl Default for TestPasswordHasher {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl PasswordHasher for TestPasswordHasher {
    async fn hash(&self, password: &str) -> Result<String, PasswordHashError> {
        Ok(self.make_hash(password))
    }

    async fn verify(&self, password: &str, hash: &str) -> Result<bool, PasswordHashError> {
        Ok(hash == self.make_hash(password))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn hashes_and_verifies_matching_password() {
        let hasher = TestPasswordHasher::new();
        let hash = hasher.hash("secret").await.unwrap();
        assert!(hasher.verify("secret", &hash).await.unwrap());
    }

    #[tokio::test]
    async fn rejects_non_matching_password() {
        let hasher = TestPasswordHasher::new();
        let hash = hasher.hash("secret").await.unwrap();
        assert!(!hasher.verify("wrong", &hash).await.unwrap());
    }

    #[tokio::test]
    async fn custom_prefix_is_used() {
        let hasher = TestPasswordHasher::with_prefix("plain:");
        let hash = hasher.hash("secret").await.unwrap();
        assert!(hash.starts_with("plain:"));
        assert!(hasher.verify("secret", &hash).await.unwrap());
    }
}
