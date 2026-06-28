//! Password hasher port.

use crate::Error;

/// Opaque wrapper around a hashed password string.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HashedPassword(String);

impl HashedPassword {
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<String> for HashedPassword {
    fn from(value: String) -> Self {
        Self(value)
    }
}

/// Outbound port for hashing and verifying passwords.
#[async_trait::async_trait]
pub trait PasswordHasher: Send + Sync {
    async fn hash(&self, plaintext: &str) -> Result<HashedPassword, Error>;
    async fn verify(&self, plaintext: &str, hash: &HashedPassword) -> Result<bool, Error>;
}

#[cfg(test)]
mod tests {
    use super::*;

    struct AlwaysSame;

    #[async_trait::async_trait]
    impl PasswordHasher for AlwaysSame {
        async fn hash(&self, _plaintext: &str) -> Result<HashedPassword, Error> {
            Ok(HashedPassword::new("fixed"))
        }

        async fn verify(&self, plaintext: &str, _hash: &HashedPassword) -> Result<bool, Error> {
            Ok(plaintext == "password")
        }
    }

    #[tokio::test]
    async fn port_can_be_implemented_by_test_double() {
        let hasher: Box<dyn PasswordHasher> = Box::new(AlwaysSame);
        let hash = hasher.hash("password").await.unwrap();
        assert!(hasher.verify("password", &hash).await.unwrap());
        assert!(!hasher.verify("wrong-password", &hash).await.unwrap());
    }
}
