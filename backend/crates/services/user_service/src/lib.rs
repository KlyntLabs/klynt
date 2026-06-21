//! # User Service
//!
//! User profile and account management service for the Klynt platform.
//!
//! ## Design
//!
//! This is a **deep module**: small interface, deep implementation.
//!
//! - **Interface**: 5 core methods covering user management
//! - **Implementation**: Profile management, validation, persistence hidden inside
//! - **Tests**: Cross the same interface as callers

pub mod application;
pub mod domain;
pub mod error;
pub mod infrastructure;
pub mod models;

use std::sync::Arc;

use klynt_core::ctx::ExecutionContext;
use klynt_shared_domain::PaginationRequest;
use klynt_utils::UserId;

pub use error::{UserError, UserResult};
pub use models::{ProfileUpdate, UserProfile};

use application::ports::{AuditLogger, Clock, PasswordHasher, UserRepository};

/// User service — deep module with small interface.
///
/// ## Interface
///
/// Five core methods covering user management:
/// - `get_user()` - Fetch user by ID
/// - `update_profile()` - Update user profile
/// - `change_password()` - Change user password
/// - `delete_user()` - Soft delete user
/// - `list_users()` - List users with pagination
///
/// ## Deep Implementation
///
/// Behind each method:
/// - Validation and authorization checks
/// - Profile updates with domain rules
/// - Audit logging
/// - Persistence
///
/// ## Tests
///
/// Tests cross the same interface as production code.
pub struct UserService {
    config: UserConfig,
    internal_state: InternalState,
}

impl UserService {
    /// Create a new user service.
    pub fn new(config: UserConfig, dependencies: Dependencies) -> Result<Self, UserError> {
        Ok(Self {
            config,
            internal_state: InternalState {
                user_repository: dependencies.user_repository,
                audit_logger: dependencies.audit_logger,
                password_hasher: dependencies.password_hasher,
                clock: dependencies.clock,
            },
        })
    }

    /// Get a user by ID.
    pub async fn get_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<UserProfile, UserError> {
        application::use_cases::get_user::execute(self, ctx, user_id).await
    }

    /// Update user profile.
    pub async fn update_profile(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        updates: ProfileUpdate,
    ) -> Result<UserProfile, UserError> {
        application::use_cases::update_profile::execute(self, ctx, user_id, updates).await
    }

    /// Change user password.
    pub async fn change_password(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        current_password: &str,
        new_password: &str,
    ) -> Result<(), UserError> {
        application::use_cases::change_password::execute(
            self,
            ctx,
            user_id,
            current_password,
            new_password,
        )
        .await
    }

    /// Delete (soft delete) a user.
    pub async fn delete_user(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), UserError> {
        application::use_cases::delete_user::execute(self, ctx, user_id).await
    }

    /// List users with pagination.
    pub async fn list_users(
        &self,
        ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<klynt_shared_domain::PaginatedResponse<UserProfile>, UserError> {
        application::use_cases::list_users::execute(self, ctx, pagination).await
    }

    pub(crate) fn internal(&self) -> &InternalState {
        &self.internal_state
    }

    pub(crate) fn config(&self) -> &UserConfig {
        &self.config
    }
}

/// Service configuration.
#[derive(Clone, Debug, Default)]
pub struct UserConfig {
    /// Whether users can self-delete
    pub allow_self_delete: bool,
}

/// Dependencies wired into the user service.
#[derive(Clone)]
pub struct Dependencies {
    pub user_repository: Arc<dyn UserRepository>,
    pub audit_logger: Arc<dyn AuditLogger>,
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub clock: Arc<dyn Clock>,
}

/// Internal state — not part of the public interface.
pub(crate) struct InternalState {
    pub user_repository: Arc<dyn UserRepository>,
    pub audit_logger: Arc<dyn AuditLogger>,
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub clock: Arc<dyn Clock>,
}
