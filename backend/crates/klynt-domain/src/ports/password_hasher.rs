use crate::errors::DomainError;

/// Opaque wrapper around a hashed password string.
///
/// The inner value is intentionally private so callers cannot accidentally
/// treat the hash as plaintext or serialize it without an explicit conversion.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HashedPassword(String);

impl HashedPassword {
    /// Create a new hashed password from a string-like value.
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    /// Return the hashed password as a string slice.
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
///
/// Implementations are expected to use a strong, salted hashing algorithm
/// suitable for password storage. The domain layer does not specify the
/// algorithm; that decision belongs to the infrastructure adapter.
#[async_trait::async_trait]
pub trait PasswordHasher: Send + Sync {
    /// Hash `plaintext` and return the resulting hashed password.
    async fn hash(&self, plaintext: &str) -> Result<HashedPassword, DomainError>;

    /// Verify `plaintext` against a previously computed `hash`.
    async fn verify(&self, plaintext: &str, hash: &HashedPassword) -> Result<bool, DomainError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    struct AlwaysSame;

    #[async_trait::async_trait]
    impl PasswordHasher for AlwaysSame {
        async fn hash(&self, _plaintext: &str) -> Result<HashedPassword, DomainError> {
            Ok(HashedPassword::new("fixed"))
        }

        async fn verify(
            &self,
            plaintext: &str,
            _hash: &HashedPassword,
        ) -> Result<bool, DomainError> {
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
