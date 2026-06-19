use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher as Argon2PasswordHasherTrait, PasswordVerifier,
};
use klynt_domain::errors::DomainError;
use klynt_domain::ports::{HashedPassword, PasswordHasher};

#[derive(Debug, Default, Clone)]
pub struct Argon2PasswordHasher;

impl Argon2PasswordHasher {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait]
impl PasswordHasher for Argon2PasswordHasher {
    async fn hash(&self, plaintext: &str) -> Result<HashedPassword, DomainError> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let hash = argon2
            .hash_password(plaintext.as_bytes(), &salt)
            .map_err(DomainError::internal)?;
        Ok(HashedPassword::from(hash.to_string()))
    }

    async fn verify(&self, plaintext: &str, hash: &HashedPassword) -> Result<bool, DomainError> {
        let parsed_hash = PasswordHash::new(hash.as_str()).map_err(DomainError::internal)?;
        match Argon2::default().verify_password(plaintext.as_bytes(), &parsed_hash) {
            Ok(()) => Ok(true),
            Err(argon2::password_hash::Error::Password) => Ok(false),
            Err(e) => Err(DomainError::internal(e)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn hashes_and_verifies_password() {
        let hasher = Argon2PasswordHasher::new();
        let hash = hasher.hash("a-very-long-password").await.unwrap();
        assert!(hasher.verify("a-very-long-password", &hash).await.unwrap());
        assert!(!hasher.verify("wrong-password", &hash).await.unwrap());
    }

    #[tokio::test]
    async fn rejects_malformed_hash() {
        let hasher = Argon2PasswordHasher::new();
        let bad_hash = HashedPassword::new("not-a-valid-hash");
        let result = hasher.verify("password", &bad_hash).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn same_password_hashes_differently() {
        let hasher = Argon2PasswordHasher::new();
        let hash1 = hasher.hash("same-password").await.unwrap();
        let hash2 = hasher.hash("same-password").await.unwrap();
        assert_ne!(hash1, hash2);
        assert!(hasher.verify("same-password", &hash1).await.unwrap());
        assert!(hasher.verify("same-password", &hash2).await.unwrap());
    }
}
