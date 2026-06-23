//! # Auth Service
//!
//! Authentication and authorization service for Klynt platform.
//!
//! ## Design
//!
//! This is a **deep module**: small interface, deep implementation.
//!
//! - **Interface**: 6 core methods covering authentication flows
//! - **Implementation**: Password policy, sessions, tokens, email flows hidden inside
//! - **Tests**: Cross the same interface as callers

pub mod application;
pub mod builder;
pub mod core;
pub mod error;
pub mod infrastructure;
pub mod models;

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::{Clock, PasswordHasher};
use domain::contracts::auth::{LoginRequest, LoginResponse, RegistrationRequest};
use domain::session::SessionSummary;
use domain::UserId;

// Public exports
pub use builder::AuthBuilder;
pub use core::{PasswordPolicy, SessionToken};
pub use error::{AuthError, AuthResult};

use application::ports::{AuditLogger, EmailSender, MembershipRepository, UserRepository};
use base::ports::session::SessionStore;
use core::TokenStore;

/// Authentication service — deep module with small interface.
///
/// ## Interface
///
/// Six core methods covering all authentication flows:
/// - `login()` - Authenticate and create session
/// - `register()` - Register new user with email verification
/// - `verify_email()` - Verify email from token
/// - `request_password_reset()` - Initiate password reset
/// - `reset_password()` - Complete password reset
/// - `logout()` - End session
///
/// ## Deep Implementation
///
/// Behind each method:
/// - Password policy validation
/// - Session/token management
/// - Audit logging
/// - Email delivery
/// - Error handling
///
/// ## Tests
///
/// Tests cross the same interface as production code — no testing past the interface.
pub struct AuthService {
    config: AuthConfig,
    password_policy: PasswordPolicy,
    internal_state: InternalState,
}

impl AuthService {
    /// Return a builder for constructing the service with sensible defaults.
    pub fn builder() -> AuthBuilder {
        AuthBuilder::new()
    }

    /// Create a new auth service with given configuration and dependencies.
    ///
    /// Prefer [`AuthService::builder`] for production wiring; this constructor
    /// remains available for tests and custom dependency injection.
    pub fn new(config: AuthConfig, dependencies: Dependencies) -> Result<Self, AuthError> {
        let password_policy = config.password_policy.clone().unwrap_or_default();

        Ok(Self {
            config,
            password_policy,
            internal_state: InternalState {
                user_repository: dependencies.user_repository,
                session_service: dependencies.session_service,
                session_store: dependencies.session_store,
                token_store: dependencies.token_store,
                email_sender: dependencies.email_sender,
                audit_logger: dependencies.audit_logger,
                password_hasher: dependencies.password_hasher,
                membership_repository: dependencies.membership_repository,
                clock: dependencies.clock,
            },
        })
    }

    /// Authenticate a user and create a session.
    pub async fn login(
        &self,
        ctx: &ExecutionContext,
        request: LoginRequest,
    ) -> Result<LoginResponse, AuthError> {
        application::use_cases::login::execute(self, ctx, request).await
    }

    /// Register a new user with email verification.
    pub async fn register(
        &self,
        ctx: &ExecutionContext,
        request: RegistrationRequest,
    ) -> Result<UserId, AuthError> {
        application::use_cases::registration::execute(self, ctx, request).await
    }

    /// Verify email address using token from email link.
    pub async fn verify_email(
        &self,
        ctx: &ExecutionContext,
        token: &str,
    ) -> Result<UserId, AuthError> {
        application::use_cases::email_verification::execute(self, ctx, token).await
    }

    /// Request password reset (user-initiated).
    ///
    /// Always returns Ok to prevent email enumeration.
    pub async fn request_password_reset(
        &self,
        ctx: &ExecutionContext,
        email: &str,
    ) -> Result<(), AuthError> {
        application::use_cases::password_reset::request(self, ctx, email).await
    }

    /// Reset password using token from email.
    pub async fn reset_password(
        &self,
        ctx: &ExecutionContext,
        token: &str,
        new_password: &str,
    ) -> Result<(), AuthError> {
        application::use_cases::password_reset::reset(self, ctx, token, new_password).await
    }

    /// Logout user by invalidating session.
    pub async fn logout(
        &self,
        ctx: &ExecutionContext,
        session_token: &str,
    ) -> Result<(), AuthError> {
        application::use_cases::logout::execute(self, ctx, session_token).await
    }

    /// List active sessions for a user.
    pub async fn list_sessions(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<Vec<SessionSummary>, AuthError> {
        application::use_cases::list_sessions::execute(self, ctx, user_id).await
    }

    /// Revoke a session after verifying it belongs to the user.
    pub async fn revoke_session(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        session_id: crate::core::SessionToken,
    ) -> Result<(), AuthError> {
        application::use_cases::revoke_session::execute(self, ctx, user_id, session_id).await
    }

    pub(crate) fn internal(&self) -> &InternalState {
        &self.internal_state
    }

    pub(crate) fn config(&self) -> &AuthConfig {
        &self.config
    }

    pub(crate) fn password_policy(&self) -> &PasswordPolicy {
        &self.password_policy
    }
}

/// Service configuration.
///
/// Created by composition root (gateway/server startup).
#[derive(Clone, Debug)]
pub struct AuthConfig {
    /// Base URL for email links.
    pub base_url: String,

    /// Token duration in seconds (for future access tokens).
    pub token_duration_secs: u64,

    /// Password policy (uses default if None).
    pub password_policy: Option<PasswordPolicy>,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self {
            base_url: "https://klynt.edu".to_string(),
            token_duration_secs: 3600, // 1 hour
            password_policy: None,
        }
    }
}

/// Dependencies wired into the auth service.
///
/// All concrete adapters are supplied at construction time, keeping the
/// service testable and framework-agnostic.
#[derive(Clone)]
pub struct Dependencies {
    pub user_repository: Arc<dyn UserRepository>,
    pub session_service: Arc<session_service::SessionService>,
    pub session_store: Arc<dyn SessionStore>,
    pub token_store: Arc<dyn TokenStore>,
    pub email_sender: Arc<dyn EmailSender>,
    pub audit_logger: Arc<dyn AuditLogger>,
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub membership_repository: Arc<dyn MembershipRepository>,
    pub clock: Arc<dyn Clock>,
}

/// Internal state — not part of the public interface.
pub(crate) struct InternalState {
    pub user_repository: Arc<dyn UserRepository>,
    pub session_service: Arc<session_service::SessionService>,
    pub session_store: Arc<dyn SessionStore>,
    pub token_store: Arc<dyn TokenStore>,
    pub email_sender: Arc<dyn EmailSender>,
    pub audit_logger: Arc<dyn AuditLogger>,
    pub password_hasher: Arc<dyn PasswordHasher>,
    pub membership_repository: Arc<dyn MembershipRepository>,
    /// Retained for dependency injection and future token/time-sensitive logic.
    /// The session service owns the clock used for session expiry.
    #[allow(dead_code)]
    pub clock: Arc<dyn Clock>,
}
