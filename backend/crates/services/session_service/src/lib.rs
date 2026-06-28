//! # Session Service
//!
//! Session management service for the Klynt platform.

pub mod config;
pub mod error;

#[cfg(test)]
mod tests;

pub use config::SessionConfig;
pub use error::{SessionError, SessionResult};

use std::sync::Arc;

use base::ctx::ExecutionContext;
use base::ports::session::{Session, SessionKind, SessionStore, SessionToken};
use base::ports::{Clock, SystemClock};
use chrono::{DateTime, Utc};
use domain::UserId;
use uuid::Uuid;

/// A newly created session token together with its expiry.
#[derive(Clone, Debug)]
pub struct CreatedSession {
    /// Bearer token for the session.
    pub token: SessionToken,
    /// Instant at which the session expires.
    pub expires_at: DateTime<Utc>,
}

/// Session service — small interface, deep implementation.
#[derive(Clone)]
pub struct SessionService {
    config: SessionConfig,
    session_store: Arc<dyn SessionStore>,
    clock: Arc<dyn Clock>,
}

impl SessionService {
    /// Create a session service using the system clock.
    pub fn new(config: SessionConfig, session_store: Arc<dyn SessionStore>) -> Self {
        Self::with_clock(config, session_store, Arc::new(SystemClock))
    }

    /// Create a session service with a custom clock.
    pub fn with_clock(
        config: SessionConfig,
        session_store: Arc<dyn SessionStore>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            config,
            session_store,
            clock,
        }
    }

    /// Create a new access session for a user.
    pub async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> SessionResult<CreatedSession> {
        self.create_access(ctx, user_id, false, None).await
    }

    /// Create a new access session, optionally extended for "remember me".
    pub async fn create_access(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        remember_me: bool,
        pair_id: Option<Uuid>,
    ) -> SessionResult<CreatedSession> {
        let kind = if remember_me {
            SessionKind::LongLived
        } else {
            SessionKind::Access
        };
        self.create_with_kind(ctx, user_id, kind, pair_id).await
    }

    /// Create a new refresh session for a user.
    pub async fn create_refresh(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        pair_id: Option<Uuid>,
    ) -> SessionResult<CreatedSession> {
        self.create_with_kind(ctx, user_id, SessionKind::Refresh, pair_id)
            .await
    }

    /// Create a new session for a user, choosing the token kind.
    pub async fn create_with_kind(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
        kind: SessionKind,
        pair_id: Option<Uuid>,
    ) -> SessionResult<CreatedSession> {
        let duration = match kind {
            SessionKind::Access => self.config.session_duration(),
            SessionKind::LongLived => self.config.long_session_duration(),
            SessionKind::Refresh => self.config.refresh_duration(),
        };
        let expires_at = self.clock.now() + duration;
        let token = self
            .session_store
            .create_with_kind(ctx, user_id, expires_at, kind, pair_id)
            .await
            .map_err(SessionError::from)?;
        Ok(CreatedSession { token, expires_at })
    }

    /// Validate a session token and return the session if valid.
    pub async fn validate(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> SessionResult<Session> {
        self.session_store
            .find_valid(ctx, token)
            .await?
            .ok_or(SessionError::InvalidToken)
    }

    /// Validate an access token for API authorization.
    ///
    /// Returns `InvalidToken` if the token is a refresh token, even if it is
    /// otherwise valid.
    pub async fn validate_access(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> SessionResult<Session> {
        let session = self.validate(ctx, token).await?;
        if session.kind.is_access() {
            Ok(session)
        } else {
            Err(SessionError::InvalidToken)
        }
    }

    /// Invalidate a session.
    pub async fn invalidate(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> SessionResult<()> {
        self.session_store
            .revoke(ctx, token)
            .await
            .map_err(Into::into)
    }

    /// Invalidate a session and any session paired with it.
    pub async fn invalidate_pair(
        &self,
        ctx: &ExecutionContext,
        token: &SessionToken,
    ) -> SessionResult<()> {
        let session = self.validate(ctx, token).await?;
        self.session_store
            .revoke(ctx, token)
            .await
            .map_err(SessionError::from)?;
        if let Some(pair_id) = session.pair_id {
            self.session_store
                .revoke_pair(ctx, pair_id, token)
                .await
                .map_err(SessionError::from)?;
        }
        Ok(())
    }
}
