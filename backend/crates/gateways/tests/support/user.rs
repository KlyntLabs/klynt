//! Fake user service dependencies for gateway tests.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use base::ctx::ExecutionContext;
use base::ports::audit::{PasswordChangeSnapshot, ProfileUpdateSnapshot, RoleMetadataSnapshot};
use base::ports::repository::{RepositoryError, UserRepository};
use base::ports::{Clock, PasswordHashError, PasswordHasher};
use chrono::{DateTime, Utc};
use domain::{Email, PaginationRequest, PermissionId, RoleId, TenantId, User, UserId, UserRole};
use user_service::{
    application::ports::AuditLogger as UserAuditLogger, Dependencies as UserDependencies,
    UserConfig, UserService,
};
use uuid::Uuid;

/// Fake user repository for user_service tests.
#[derive(Default)]
pub struct FakeUserServiceRepository {
    users: Mutex<HashMap<UserId, User>>,
}

impl FakeUserServiceRepository {
    /// Insert a user into the fake repository.
    pub fn insert(&self, user: User) {
        self.users.lock().unwrap().insert(user.id, user);
    }
}

#[async_trait]
impl UserRepository for FakeUserServiceRepository {
    async fn find_by_email(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
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
        _email: Email,
        _password_hash: String,
        _role: UserRole,
        _institution_id: Option<Uuid>,
    ) -> Result<UserId, RepositoryError> {
        unimplemented!("create_pending_user not used by gateway user tests")
    }

    async fn activate_user(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
    ) -> Result<(), RepositoryError> {
        unimplemented!("activate_user not used by gateway user tests")
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
        self.users.lock().unwrap().insert(user.id, user.clone());
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

/// Stub audit logger for user_service tests.
#[derive(Default, Clone)]
pub struct StubUserAuditLogger;

#[async_trait]
impl UserAuditLogger for StubUserAuditLogger {
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
    }

    async fn log_password_changed(
        &self,
        _ctx: &ExecutionContext,
        _user_id: UserId,
        _before: PasswordChangeSnapshot,
        _after: PasswordChangeSnapshot,
    ) {
    }

    async fn log_user_deleted(&self, _ctx: &ExecutionContext, _user_id: UserId) {}

    async fn log_tenant_created(&self, _ctx: &ExecutionContext, _tenant_id: TenantId) {}

    async fn log_tenant_updated(&self, _ctx: &ExecutionContext, _tenant_id: TenantId) {}

    async fn log_tenant_deleted(&self, _ctx: &ExecutionContext, _tenant_id: TenantId) {}

    async fn log_member_added(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) {
    }

    async fn log_member_role_changed(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
        _old_role: &str,
        _new_role: &str,
    ) {
    }

    async fn log_member_removed(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _user_id: UserId,
    ) {
    }

    async fn log_role_created(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _name: &str,
        _description: &str,
        _permission_ids: Vec<PermissionId>,
    ) {
    }

    async fn log_role_updated(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _before: RoleMetadataSnapshot,
        _after: RoleMetadataSnapshot,
    ) {
    }

    async fn log_role_permissions_updated(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _before_permission_ids: Vec<PermissionId>,
        _after_permission_ids: Vec<PermissionId>,
    ) {
    }

    async fn log_role_deleted(
        &self,
        _ctx: &ExecutionContext,
        _tenant_id: TenantId,
        _role_id: RoleId,
        _before_name: &str,
        _before_description: &str,
        _before_permission_ids: Vec<PermissionId>,
    ) {
    }
}

/// Fake password hasher for user_service tests.
#[derive(Default, Clone)]
pub struct FakeUserPasswordHasher;

#[async_trait]
impl PasswordHasher for FakeUserPasswordHasher {
    async fn verify(&self, password: &str, hash: &str) -> Result<bool, PasswordHashError> {
        Ok(password == hash)
    }

    async fn hash(&self, password: &str) -> Result<String, PasswordHashError> {
        Ok(password.to_string())
    }
}

/// Fixed clock for user_service tests.
#[derive(Clone)]
pub struct FixedUserClock {
    pub now: DateTime<Utc>,
}

impl Clock for FixedUserClock {
    fn now(&self) -> DateTime<Utc> {
        self.now
    }
}

/// Build a fake user service and its backing repository for tests.
pub fn build_test_user_service() -> (UserService, Arc<FakeUserServiceRepository>) {
    let repo = Arc::new(FakeUserServiceRepository::default());
    let service = UserService::new(
        UserConfig::default(),
        UserDependencies {
            user_repository: repo.clone(),
            audit_logger: Arc::new(StubUserAuditLogger),
            password_hasher: Arc::new(FakeUserPasswordHasher),
            clock: Arc::new(FixedUserClock { now: Utc::now() }),
        },
    )
    .expect("valid test dependencies");

    (service, repo)
}
