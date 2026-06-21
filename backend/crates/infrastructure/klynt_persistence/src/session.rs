//! Session types for authentication.

use async_trait::async_trait;
use chrono::{DateTime, Duration, Utc};
use klynt_common::util::UserId;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::Error;

use klynt_base::ctx::ExecutionContext;

/// Opaque bearer token used to authenticate requests.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SessionToken(pub Uuid);

impl SessionToken {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn parse(raw: &str) -> Result<Self, Error> {
        Uuid::parse_str(raw)
            .map(Self)
            .map_err(|_| Error::InvalidInput("invalid session token".to_string()))
    }
}

impl Default for SessionToken {
    fn default() -> Self {
        Self::new()
    }
}

/// An authenticated session.
#[derive(Debug, Clone)]
pub struct Session {
    pub token: SessionToken,
    pub user_id: UserId,
    pub expires_at: DateTime<Utc>,
}

impl Session {
    /// Default session lifetime when none is specified.
    pub const DEFAULT_TTL: Duration = Duration::hours(24);

    pub fn new(user_id: UserId, ttl: Duration) -> Self {
        let token = SessionToken::new();
        let expires_at = Utc::now() + ttl;
        Self {
            token,
            user_id,
            expires_at,
        }
    }

    pub fn is_expired(&self) -> bool {
        Utc::now() >= self.expires_at
    }
}

/// Outbound port for session storage.
#[async_trait]
pub trait SessionStore: Send + Sync {
    /// Create a new session for `user_id` and return its bearer token.
    async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, Error>;

    /// Find a non-expired session by token.
    async fn find_valid(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> Result<Option<Session>, Error>;

    /// Revoke a session by token.
    async fn revoke(&self, ctx: &ExecutionContext, token: &SessionToken) -> Result<(), Error>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_token_new_is_unique() {
        let a = SessionToken::new();
        let b = SessionToken::new();
        assert_ne!(a, b);
    }

    #[test]
    fn session_token_default_creates_new() {
        let token: SessionToken = Default::default();
        assert_eq!(token.0.get_version_num(), 4);
    }

    #[test]
    fn session_token_parse_round_trips() {
        let token = SessionToken::new();
        let parsed = SessionToken::parse(&token.0.to_string()).unwrap();
        assert_eq!(parsed, token);
    }

    #[test]
    fn session_token_parse_rejects_invalid_input() {
        assert!(matches!(
            SessionToken::parse("not-a-uuid").unwrap_err(),
            Error::InvalidInput(_)
        ));
    }

    #[test]
    fn session_new_has_expected_user_and_future_expiry() {
        let user_id = UserId::new();
        let session = Session::new(user_id, Duration::hours(1));
        assert_eq!(session.user_id, user_id);
        assert!(!session.is_expired());
    }

    #[test]
    fn expired_session_is_detected() {
        let user_id = UserId::new();
        let session = Session::new(user_id, Duration::seconds(-1));
        assert!(session.is_expired());
    }
}
