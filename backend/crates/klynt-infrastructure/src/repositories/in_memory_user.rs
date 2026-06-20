use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use chrono::Utc;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, User, UserId, UserStatus};
use klynt_domain::repositories::{CreateResult, UserRepository};

#[derive(Debug, Default, Clone)]
pub struct InMemoryUserRepository {
    pub(crate) users: Arc<Mutex<HashMap<Email, User>>>,
}

impl InMemoryUserRepository {
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl UserRepository for InMemoryUserRepository {
    async fn create_if_not_exists(
        &self,
        _ctx: &Ctx,
        email: &Email,
        user: &User,
    ) -> Result<CreateResult, DomainError> {
        let mut users = self.users.lock().unwrap();
        if let Some(existing) = users.get(email) {
            return Ok(CreateResult::AlreadyExists(existing.clone()));
        }
        users.insert(email.clone(), user.clone());
        Ok(CreateResult::Created)
    }

    async fn find_by_email(&self, _ctx: &Ctx, email: &Email) -> Result<Option<User>, DomainError> {
        let users = self.users.lock().unwrap();
        Ok(users.get(email).cloned())
    }

    async fn find_by_id(&self, _ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError> {
        let users = self.users.lock().unwrap();
        Ok(users.values().find(|u| u.id == id).cloned())
    }

    async fn set_email_verified(&self, _ctx: &Ctx, user_id: UserId) -> Result<(), DomainError> {
        let mut users = self.users.lock().unwrap();
        let user = users
            .values_mut()
            .find(|u| u.id == user_id)
            .ok_or(DomainError::NotFound)?;
        user.status = UserStatus::Active;
        user.email_verified_at = Some(Utc::now());
        Ok(())
    }
}
