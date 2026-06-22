//! Test support utilities for user_service integration tests.
//!
//! Cross-cutting test doubles come from [`klynt_base::testkit`]; this module
//! keeps only the user-service-specific fakes.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::Utc;

use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::repository::RepositoryError;
use klynt_common::domain::{PaginationRequest, User, UserStatus};
use klynt_common::util::UserId;
use user_service::application::ports::{AuditLogger, UserRepository};
use user_service::{Dependencies, UserConfig, UserService};

pub use klynt_base::testkit::{test_ctx, TestClock, TestPasswordHasher};

/// Create an active sample user for tests.
pub fn sample_user(email: &str, full_name: &str, password_hash: &str) -> User {
    klynt_base::testkit::sample_user(email, full_name, password_hash, UserStatus::Active)
}

/// In-memory user repository for testing.
pub struct TestUserRepo {
    users: Mutex<HashMap<UserId, User>>,
}

impl TestUserRepo {
    pub fn new() -> Self {
        Self {
            users: Mutex::new(HashMap::new()),
        }
    }

    pub fn insert(&self, user: User) {
        self.users.lock().unwrap().insert(user.id, user);
    }
}

impl Default for TestUserRepo {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl UserRepository for TestUserRepo {
    async fn find_by_email(
        &self,
        _ctx: &ExecutionContext,
        email: &klynt_common::domain::Email,
    ) -> Result<Option<User>, RepositoryError> {
        Ok(self
            .users
            .lock()
            .unwrap()
            .values()
            .find(|u| u.email == *email)
            .cloned())
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        id: UserId,
    ) -> Result<Option<User>, RepositoryError> {
        Ok(self.users.lock().unwrap().get(&id).cloned())
    }

    async fn create_pending_user(
        &self,
        _ctx: &ExecutionContext,
        _full_name: String,
        _email: klynt_common::domain::Email,
        _password_hash: String,
    ) -> Result<UserId, RepositoryError> {
        Err(RepositoryError::Internal(
            "create_pending_user not used by user_service".to_string(),
        ))
    }

    async fn activate_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> Result<(), RepositoryError> {
        Err(RepositoryError::Internal(
            "activate_user not used by user_service".to_string(),
        ))
    }

    async fn update_password(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError> {
        let mut users = self.users.lock().unwrap();
        let mut user = users
            .get(&user_id)
            .ok_or(RepositoryError::NotFound)?
            .clone();
        user.password_hash = password_hash;
        users.insert(user_id, user);
        Ok(())
    }

    async fn update(&self, _ctx: &ExecutionContext, user: User) -> Result<User, RepositoryError> {
        let mut users = self.users.lock().unwrap();
        if !users.contains_key(&user.id) {
            return Err(RepositoryError::NotFound);
        }
        users.insert(user.id, user.clone());
        Ok(user)
    }

    async fn delete(&self, _ctx: &ExecutionContext, id: UserId) -> Result<(), RepositoryError> {
        let mut users = self.users.lock().unwrap();
        let mut user = users.get(&id).ok_or(RepositoryError::NotFound)?.clone();
        user.deleted_at = Some(Utc::now());
        users.insert(id, user);
        Ok(())
    }

    async fn list(
        &self,
        _ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError> {
        let users: Vec<User> = self
            .users
            .lock()
            .unwrap()
            .values()
            .filter(|u| !u.is_deleted())
            .cloned()
            .collect();

        let total = users.len() as u64;
        let offset = pagination.offset() as usize;
        let limit = pagination.page_size as usize;
        let items = users.into_iter().skip(offset).take(limit).collect();

        Ok((items, total))
    }
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

    async fn log_profile_updated(&self, _ctx: &ExecutionContext, _user_id: UserId) {
        self.events
            .lock()
            .unwrap()
            .push("profile_updated".to_string());
    }

    async fn log_password_changed(&self, _ctx: &ExecutionContext, _user_id: UserId) {
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
pub fn build_test_service() -> (UserService, Arc<TestUserRepo>, Arc<TestAuditLogger>) {
    let repo = Arc::new(TestUserRepo::new());
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
