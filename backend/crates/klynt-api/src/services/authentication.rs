use klynt_application::auth::AuthService;
use klynt_application::users::UserService;
use std::sync::Arc;

/// Coarse-grained aggregate for authentication-related services.
///
/// Groups UserService and AuthService behind a single interface.
/// Reduces AppState's dependency count and provides a cleaner
/// seam for authentication operations.
#[derive(Clone)]
pub struct AuthenticationServices {
    pub user_service: Arc<UserService>,
    pub auth_service: Arc<AuthService>,
}

impl AuthenticationServices {
    pub fn new(user_service: Arc<UserService>, auth_service: Arc<AuthService>) -> Self {
        Self {
            user_service,
            auth_service,
        }
    }

    /// Convenience accessor for user_service
    pub fn users(&self) -> &Arc<UserService> {
        &self.user_service
    }

    /// Convenience accessor for auth_service
    pub fn auth(&self) -> &Arc<AuthService> {
        &self.auth_service
    }
}
