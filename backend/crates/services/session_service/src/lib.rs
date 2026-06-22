//! # Session Service
//!
//! Session management service for the Klynt platform.

pub mod config;
pub mod error;

pub use config::SessionConfig;
pub use error::{SessionError, SessionResult};

use std::sync::Arc;

use klynt_base::ctx::ExecutionContext;
use klynt_base::ports::session::{Session, SessionStore, SessionToken};
use klynt_common::util::UserId;

pub struct SessionService {
    config: SessionConfig,
    session_store: Arc<dyn SessionStore>,
}

impl SessionService {
    pub fn new(config: SessionConfig, session_store: Arc<dyn SessionStore>) -> Self {
        Self {
            config,
            session_store,
        }
    }

    pub async fn validate(&self, ctx: &ExecutionContext, token: &str) -> SessionResult<Session> {
        let session_token =
            SessionToken(uuid::Uuid::parse_str(token).map_err(|_| SessionError::InvalidToken)?);
        self.session_store
            .find_valid(ctx, &session_token)
            .await?
            .ok_or(SessionError::InvalidToken)
    }

    pub async fn create(
        &self,
        ctx: &ExecutionContext,
        user_id: UserId,
    ) -> SessionResult<SessionToken> {
        let expires_at = chrono::Utc::now()
            + chrono::Duration::seconds(self.config.session_duration_secs as i64);
        self.session_store
            .create(ctx, user_id, expires_at)
            .await
            .map_err(Into::into)
    }

    pub async fn invalidate(&self, ctx: &ExecutionContext, token: &str) -> SessionResult<()> {
        let session_token =
            SessionToken(uuid::Uuid::parse_str(token).map_err(|_| SessionError::InvalidToken)?);
        self.session_store
            .revoke(ctx, &session_token)
            .await
            .map_err(Into::into)
    }
}
