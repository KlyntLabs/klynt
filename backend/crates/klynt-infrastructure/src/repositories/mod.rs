//! Repository traits and models.

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_core::ctx::Ctx;
use klynt_storage::ports::HashedPassword;
use klynt_storage::tokens::TokenKind;
use klynt_utils::{Email, GlobalRole, Role, UserId, UserStatus};

use klynt_shared_domain::DomainError;

pub use klynt_audit::types::AuditEventRepository;

pub mod pg_session;
pub mod pg_user;
pub mod redis_idempotency;
pub mod sqlx_audit_repo;
pub mod sqlx_token_repo;

/// Result of attempting to create a user.
pub enum CreateResult {
    Created,
    AlreadyExists(User),
}

/// Legacy user model used by repository implementations.
#[derive(Debug, Clone)]
pub struct User {
    pub id: UserId,
    pub name: String,
    pub email: Email,
    pub role: Role,
    pub institution_id: Option<uuid::Uuid>,
    pub status: UserStatus,
    pub email_verified_at: Option<DateTime<Utc>>,
    pub global_role: Option<GlobalRole>,
    pub password_hash: String,
    pub terms_accepted_at: DateTime<Utc>,
    pub terms_version: String,
    pub created_at: DateTime<Utc>,
}

/// Legacy user DTO used by repository implementations.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct UserDto {
    pub id: UserId,
    pub name: String,
    pub email: String,
    pub role: Role,
    pub status: UserStatus,
    pub email_verified_at: Option<DateTime<Utc>>,
    pub global_role: Option<GlobalRole>,
    pub created_at: DateTime<Utc>,
}

impl From<&User> for UserDto {
    fn from(user: &User) -> Self {
        Self {
            id: user.id,
            name: user.name.clone(),
            email: user.email.as_str().to_string(),
            role: user.role,
            status: user.status,
            email_verified_at: user.email_verified_at,
            global_role: user.global_role,
            created_at: user.created_at,
        }
    }
}

/// User repository trait.
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn create_if_not_exists(
        &self,
        ctx: &Ctx,
        email: &Email,
        user: &User,
    ) -> Result<CreateResult, DomainError>;

    async fn find_by_email(&self, ctx: &Ctx, email: &Email) -> Result<Option<User>, DomainError>;
    async fn find_by_id(&self, ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError>;

    /// Mark the user's email as verified and activate the account.
    async fn set_email_verified(&self, ctx: &Ctx, user_id: UserId) -> Result<(), DomainError>;

    /// Update the user's password hash.
    async fn update_password(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        password_hash: &HashedPassword,
    ) -> Result<(), DomainError>;
}

/// Unified store for issue-once tokens (email verification, password reset).
#[async_trait]
pub trait TokenStore: Send + Sync {
    /// Store a token hash with its expiry.
    async fn save(
        &self,
        ctx: &Ctx,
        kind: TokenKind,
        user_id: UserId,
        token_hash: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DomainError>;

    /// Atomically consume a token: validate it exists, is unused, is not
    /// expired, and mark it used — all in one step.
    async fn consume(
        &self,
        ctx: &Ctx,
        kind: TokenKind,
        token_hash: &str,
    ) -> Result<UserId, DomainError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_user() -> User {
        User {
            id: UserId::new(),
            name: "Ada Lovelace".to_string(),
            email: Email::parse("ada@klynt.dev").unwrap(),
            role: Role::Teacher,
            institution_id: None,
            status: UserStatus::Active,
            email_verified_at: None,
            global_role: None,
            password_hash: "hash".to_string(),
            terms_accepted_at: Utc::now(),
            terms_version: "1".to_string(),
            created_at: Utc::now(),
        }
    }

    #[test]
    fn user_dto_from_user_copies_fields() {
        let user = dummy_user();
        let dto = UserDto::from(&user);
        assert_eq!(dto.id, user.id);
        assert_eq!(dto.name, user.name);
        assert_eq!(dto.email, user.email.as_str());
        assert_eq!(dto.role, user.role);
        assert_eq!(dto.status, user.status);
        assert_eq!(dto.email_verified_at, user.email_verified_at);
        assert_eq!(dto.global_role, user.global_role);
        assert_eq!(dto.created_at, user.created_at);
    }
}
