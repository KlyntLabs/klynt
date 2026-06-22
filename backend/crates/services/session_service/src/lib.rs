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
use base::ports::session::{Session, SessionStore, SessionToken};
use base::ports::{Clock, SystemClock};
use chrono::Duration;
use domain::UserId;

/// Session service — small interface, deep implementation.
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

    /// Create a new session for a user.
    pub async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> SessionResult<SessionToken> {
        let duration_secs = i64::try_from(self.config.session_duration_secs)
            .map_err(|_| SessionError::StoreError("session duration too large".to_string()))?;
        let expires_at = self.clock.now() + Duration::seconds(duration_secs);
        self.session_store
            .create(ctx, user_id, expires_at)
            .await
            .map_err(Into::into)
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
}
