//! Test support utilities and auth-service-specific fake implementations.
//!
//! Cross-cutting test doubles come from [`klynt_base::testkit`]; this module
//! keeps only the auth-service-specific fakes.

use std::sync::{Arc, Mutex};

use async_trait::async_trait;

use auth_service::application::ports::{AuditLogger, EmailSender};
use auth_service::{AuthConfig, AuthService, Dependencies};
use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::email::EmailError;
use klynt_base::testkit::{sample_user, FakeSessionStore, FakeTokenStore, FakeUserRepository};
use klynt_domain::{Email, User, UserId, UserStatus};

pub use klynt_base::testkit::{test_ctx, TestClock, TestPasswordHasher};

/// Fake email sender that records sent emails.
#[derive(Default, Clone)]
pub struct FakeEmailSender {
    pub sent: Arc<Mutex<Vec<(String, String, String)>>>,
}

#[async_trait]
impl EmailSender for FakeEmailSender {
    async fn send_verification(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError> {
        self.sent.lock().unwrap().push((
            "verification".to_string(),
            email.as_str().to_string(),
            format!("{base_url}/verify/{token}"),
        ));
        Ok(())
    }

    async fn send_password_reset(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
        token: &str,
        base_url: &str,
    ) -> Result<(), EmailError> {
        self.sent.lock().unwrap().push((
            "password_reset".to_string(),
            email.as_str().to_string(),
            format!("{base_url}/reset-password/{token}"),
        ));
        Ok(())
    }
}

/// Stub audit logger that does nothing.
#[derive(Default, Clone)]
pub struct StubAuditLogger;

#[async_trait]
impl AuditLogger for StubAuditLogger {
    async fn log_login_success(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_login_failed(&self, _ctx: &ExecutionContext, _email: &str, _error: &str) {}

    async fn log_user_registered(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_email_verified(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_password_reset(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_session_created(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _session_id: String,
    ) {
    }

    async fn log_profile_updated(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_password_changed(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_user_deleted(&self, _ctx: &ExecutionContext, _user_id: UserId) {}
}

/// Build a test auth service with default fake dependencies.
pub fn build_test_service() -> (AuthService, Arc<FakeUserRepository>, Arc<FakeEmailSender>) {
    let email_sender = Arc::new(FakeEmailSender::default());
    let user_repository = Arc::new(FakeUserRepository::new());
    let service = AuthService::new(
        AuthConfig::default(),
        Dependencies {
            user_repository: user_repository.clone(),
            session_store: Arc::new(FakeSessionStore::new()),
            token_store: Arc::new(FakeTokenStore::new()),
            email_sender: email_sender.clone(),
            audit_logger: Arc::new(StubAuditLogger),
            password_hasher: Arc::new(TestPasswordHasher::new()),
            clock: Arc::new(TestClock::new()),
        },
    )
    .expect("valid test dependencies");

    (service, user_repository, email_sender)
}

/// Create a test user model pre-hashed for the default [`TestPasswordHasher`].
pub fn test_user(email: &str, password: &str, status: UserStatus) -> User {
    sample_user(email, "Test User", &format!("hash-{password}"), status)
}
