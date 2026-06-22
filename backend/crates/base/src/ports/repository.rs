//! Canonical repository ports for the Klynt platform.
//!
//! These traits define the persistence interface shared across all services.
//! By having a single source of truth for repository interfaces, we eliminate
//! the need for service-specific adapters and improve testability.

use crate::ctx::ExecutionContext;
use async_trait::async_trait;
use domain::{Email, PaginationRequest, User, UserId};

/// Canonical User repository interface.
///
/// Combines methods from both auth and user services into a single,
/// complete interface. All services depend on this trait rather than
/// defining their own fragmented versions.
///
/// ## Design Rationale
///
/// - **Auth methods** (`find_by_email`, `create_pending_user`, `activate_user`,
///   `update_password`) are included because user registration is an auth concern.
/// - **User management methods** (`find_by_id`, `update`, `delete`, `list`) are
///   needed for profile management.
/// - **Single adapter:** One implementation serves both services.
/// - **Test locality:** Tests use local fakes; canonical test doubles will live in `base::testkit`.
#[async_trait]
pub trait UserRepository: Send + Sync {
    /// Find user by email address (auth flow).
    async fn find_by_email(
        &self,
        ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, RepositoryError>;

    /// Find user by ID (user management flow).
    async fn find_by_id(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Option<User>, RepositoryError>;

    /// Create a new pending user (registration flow).
    ///
    /// Returns the ID of the created user.
    async fn create_pending_user(
        &self,
        ctx: &ExecutionContext,
        full_name: String,
        email: Email,
        password_hash: String,
    ) -> Result<UserId, RepositoryError>;

    /// Activate a pending user (email verification flow).
    async fn activate_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError>;

    /// Update user password (password reset/change flows).
    async fn update_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError>;

    /// Update full user record (profile management).
    async fn update(&self, ctx: &ExecutionContext, user: User) -> Result<User, RepositoryError>;

    /// Soft delete a user (account deletion).
    async fn delete(&self, ctx: &ExecutionContext, user_id: UserId) -> Result<(), RepositoryError>;

    /// List users with pagination (admin/user management).
    async fn list(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError>;
}

/// Canonical repository error type.
///
/// Centralized error type for all repository operations.
/// Services map this to their domain-specific errors.
#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    /// Requested user was not found.
    #[error("User not found")]
    NotFound,

    /// User already exists with a conflicting identifier.
    #[error("User already exists ({0})")]
    Conflict(String),

    /// Input validation failed.
    #[error("Validation error: {0}")]
    Validation(String),

    /// Underlying database error.
    #[error("Database error: {0}")]
    Database(String),

    /// Internal unexpected error.
    #[error("Internal error: {0}")]
    Internal(String),
}

// Convert from sqlx::Error for repository implementations.
impl From<sqlx::Error> for RepositoryError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => RepositoryError::NotFound,
            sqlx::Error::Database(db_err) => {
                if db_err.is_unique_violation() {
                    RepositoryError::Conflict(db_err.constraint().unwrap_or("unknown").to_string())
                } else if db_err.is_foreign_key_violation() {
                    RepositoryError::Validation(
                        db_err.constraint().unwrap_or("unknown").to_string(),
                    )
                } else {
                    RepositoryError::Database(db_err.to_string())
                }
            }
            _ => RepositoryError::Internal(err.to_string()),
        }
    }
}

#[cfg(test)]
#[path = "repository_test.rs"]
mod repository_test;
