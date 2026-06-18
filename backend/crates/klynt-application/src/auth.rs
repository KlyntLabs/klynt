use std::sync::Arc;

use chrono::Utc;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, UserDto};
use klynt_domain::session::{Session, SessionStore, SessionToken};

use crate::users::UserService;

pub struct AuthService {
    user_service: Arc<UserService>,
    session_store: Arc<dyn SessionStore>,
}

impl AuthService {
    pub fn new(user_service: Arc<UserService>, session_store: Arc<dyn SessionStore>) -> Self {
        Self {
            user_service,
            session_store,
        }
    }

    /// Authenticate a user and create a session.
    ///
    /// Returns the bearer token and a DTO of the authenticated user.
    pub async fn login(
        &self,
        ctx: &Ctx,
        email: &Email,
        password: &str,
    ) -> Result<(SessionToken, UserDto), DomainError> {
        let user = self.user_service.authenticate(ctx, email, password).await?;
        let user_id = user.id;
        let user_dto = UserDto::from(&user);

        let expires_at = Utc::now() + Session::DEFAULT_TTL;
        let token = self.session_store.create(ctx, user_id, expires_at).await?;

        Ok((token, user_dto))
    }
}
