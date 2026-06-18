use std::ops::Add;

use async_trait::async_trait;
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::ctx::Ctx;
use crate::errors::DomainError;
use crate::models::UserId;

/// Opaque bearer token used to authenticate requests.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SessionToken(pub Uuid);

impl SessionToken {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn parse(raw: &str) -> Result<Self, DomainError> {
        Uuid::parse_str(raw)
            .map(Self)
            .map_err(|_| DomainError::InvalidSessionToken)
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
        let expires_at = Utc::now().add(ttl);
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
        ctx: &Ctx,
        user_id: UserId,
        expires_at: DateTime<Utc>,
    ) -> Result<SessionToken, DomainError>;

    /// Find a non-expired session by token.
    async fn find_valid(
        &self,
        ctx: &Ctx,
        token: &SessionToken,
    ) -> Result<Option<Session>, DomainError>;

    /// Revoke a session by token.
    async fn revoke(&self, ctx: &Ctx, token: &SessionToken) -> Result<(), DomainError>;
}
