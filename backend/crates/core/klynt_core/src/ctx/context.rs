//! Request-scoped context passed into use cases and adapters.

use uuid::Uuid;

/// Request-scoped context.
#[derive(Debug, Clone, Copy)]
pub struct Ctx {
    pub request_id: Uuid,
    pub user_id: Option<klynt_utils::UserId>,
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
    pub fn authenticated(request_id: Uuid, user_id: klynt_utils::UserId) -> Self {
        Self {
            request_id,
            user_id: Some(user_id),
        }
    }

    pub fn is_authenticated(&self) -> bool {
        self.user_id.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn guest_context_has_no_user() {
        let request_id = Uuid::new_v4();
        let ctx = Ctx::guest(request_id);
        assert_eq!(ctx.request_id, request_id);
        assert!(ctx.user_id.is_none());
        assert!(!ctx.is_authenticated());
    }

    #[test]
    fn authenticated_context_carries_user() {
        let request_id = Uuid::new_v4();
        let user_id = klynt_utils::UserId::new();
        let ctx = Ctx::authenticated(request_id, user_id);
        assert_eq!(ctx.request_id, request_id);
        assert_eq!(ctx.user_id, Some(user_id));
        assert!(ctx.is_authenticated());
    }
}
