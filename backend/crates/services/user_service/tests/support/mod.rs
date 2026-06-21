//! Test support utilities for user_service integration tests.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::{DateTime, Utc};

use klynt_base::ctx::{ExecutionContext, RequestContext};
use klynt_common::domain::{Email, PaginationRequest, UserRole, UserStatus};
use klynt_common::util::UserId;
use user_service::application::ports::{AuditLogger, Clock, PasswordHasher, UserRepository};
use user_service::domain::User;
use user_service::error::UserError;
use user_service::{Dependencies, UserConfig, UserService};

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
    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        id: UserId,
    ) -> Result<Option<User>, UserError> {
        Ok(self.users.lock().unwrap().get(&id).cloned())
    }

    async fn update(&self, _ctx: &ExecutionContext, user: &User) -> Result<(), UserError> {
        let mut users = self.users.lock().unwrap();
        if !users.contains_key(&user.id) {
            return Err(UserError::NotFound);
        }
        users.insert(user.id, user.clone());
        Ok(())
    }

    async fn delete(&self, _ctx: &ExecutionContext, id: UserId) -> Result<(), UserError> {
        let mut users = self.users.lock().unwrap();
        let mut user = users.get(&id).ok_or(UserError::NotFound)?.clone();
        user.deleted_at = Some(Utc::now());
        users.insert(id, user);
        Ok(())
    }

    async fn list(
        &self,
        _ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), UserError> {
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

/// Test password hasher that stores passwords in plain text (tests only).
pub struct TestPasswordHasher;

#[async_trait]
impl PasswordHasher for TestPasswordHasher {
    async fn verify(&self, password: &str, hash: &str) -> Result<bool, UserError> {
        Ok(password == hash)
    }

    async fn hash(&self, password: &str) -> Result<String, UserError> {
        Ok(password.to_string())
    }
}

/// Test clock that returns a fixed timestamp.
pub struct TestClock {
    now: DateTime<Utc>,
}

impl TestClock {
    pub fn new(now: DateTime<Utc>) -> Self {
        Self { now }
    }
}

impl Clock for TestClock {
    fn now(&self) -> DateTime<Utc> {
        self.now
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
            password_hasher: Arc::new(TestPasswordHasher),
            clock: Arc::new(TestClock::new(Utc::now())),
        },
    )
    .expect("service construction should succeed");

    (service, repo, audit)
}

/// Create a test execution context.
pub fn test_ctx() -> ExecutionContext {
    ExecutionContext::new(RequestContext::new())
}

/// Create a sample domain user with the given password hash.
pub fn sample_user(email: &str, full_name: &str, password_hash: &str) -> User {
    User {
        id: UserId::new(),
        email: Email::new(email.to_string()),
        full_name: Some(full_name.to_string()),
        password_hash: password_hash.to_string(),
        status: UserStatus::Active,
        role: UserRole::Student,
        created_at: Utc::now(),
        updated_at: None,
        deleted_at: None,
    }
}
