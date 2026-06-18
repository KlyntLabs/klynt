use uuid::Uuid;

use crate::models::UserId;

/// Request-scoped context passed into use cases and adapters.
///
/// `Ctx` is intentionally framework-agnostic. The `user_id` is `None` for
/// unauthenticated (guest) requests; callers that require authentication should
/// reject guest contexts at the application or API boundary.
#[derive(Debug, Clone, Copy)]
pub struct Ctx {
    pub request_id: Uuid,
    pub user_id: Option<UserId>,
}

impl Ctx {
    /// Create a context for an unauthenticated (guest) request.
    pub fn guest(request_id: Uuid) -> Self {
        Self {
            request_id,
            user_id: None,
        }
    }

    /// Create a context for an authenticated request.
    pub fn authenticated(request_id: Uuid, user_id: UserId) -> Self {
        Self {
            request_id,
            user_id: Some(user_id),
        }
    }

    pub fn is_authenticated(&self) -> bool {
        self.user_id.is_some()
    }
}
