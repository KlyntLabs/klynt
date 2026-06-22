//! Test support utilities for user_service integration tests.
//!
//! Cross-cutting test doubles come from [`base::testkit`]; this module
//! keeps only the user-service-specific fakes.

use std::sync::{Arc, Mutex};

use async_trait::async_trait;

use base::ctx::ExecutionContext;
use base::ports::audit::{PasswordChangeSnapshot, ProfileUpdateSnapshot};
use base::testkit::{sample_user as base_sample_user, FakeUserRepository};
use domain::{User, UserId, UserStatus};
use user_service::application::ports::AuditLogger;
use user_service::{Dependencies, UserConfig, UserService};

pub use base::testkit::{test_ctx, TestClock, TestPasswordHasher};

/// Create an active sample user for tests.
pub fn sample_user(email: &str, full_name: &str, password_hash: &str) -> User {
    base_sample_user(email, full_name, password_hash, UserStatus::Active)
}

/// In-memory audit logger that captures event names.
pub struct TestAuditLogger {
    events: Mutex<Vec<String>>,
}

impl TestAuditLogger {
    pub fn new() -> Self {
        Self {
            events: Mutex::new(Vec::new()),
        }
    }

    pub fn events(&self) -> Vec<String> {
        self.events.lock().unwrap().clone()
    }
}

impl Default for TestAuditLogger {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AuditLogger for TestAuditLogger {
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

    async fn log_profile_updated(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _before: ProfileUpdateSnapshot,
        _after: ProfileUpdateSnapshot,
    ) {
        self.events
            .lock()
            .unwrap()
            .push("profile_updated".to_string());
    }

    async fn log_password_changed(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _before: PasswordChangeSnapshot,
        _after: PasswordChangeSnapshot,
    ) {
        self.events
            .lock()
            .unwrap()
            .push("password_changed".to_string());
    }

    async fn log_user_deleted(&self, _ctx: &ExecutionContext, _user_id: UserId) {
        self.events.lock().unwrap().push("user_deleted".to_string());
    }
}

/// Build a user service and its backing test repository.
pub fn build_test_service() -> (UserService, Arc<FakeUserRepository>, Arc<TestAuditLogger>) {
    let repo = Arc::new(FakeUserRepository::new());
    let audit = Arc::new(TestAuditLogger::new());
    let service = UserService::new(
        UserConfig::default(),
        Dependencies {
            user_repository: repo.clone(),
            audit_logger: audit.clone(),
            password_hasher: Arc::new(TestPasswordHasher::with_prefix("")),
            clock: Arc::new(TestClock::new()),
        },
    )
    .expect("service construction should succeed");

    (service, repo, audit)
}
