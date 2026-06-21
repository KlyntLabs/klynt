use std::sync::Arc;

use chrono::Utc;
use tracing::instrument;

use klynt_domain::ctx::Ctx;
use klynt_domain::email_content::{PasswordResetEmail, VerificationEmail};
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, UserDto, UserId};
use klynt_domain::password_policy::PasswordPolicy;
use klynt_domain::ports::SharedEmailService;
use klynt_domain::repositories::TokenStore;
use klynt_domain::session::{Session, SessionStore, SessionToken};
use klynt_domain::tokens::{Token, TokenKind};

use crate::audit::AuditService;
use crate::users::UserService;

pub struct AuthService {
    user_service: Arc<UserService>,
    session_store: Arc<dyn SessionStore>,
    token_store: Arc<dyn TokenStore>,
    email_service: SharedEmailService,
    audit_service: Arc<AuditService>,
    password_policy: PasswordPolicy,
    base_url: String,
}

impl AuthService {
    pub fn new(
        user_service: Arc<UserService>,
        session_store: Arc<dyn SessionStore>,
        token_store: Arc<dyn TokenStore>,
        email_service: SharedEmailService,
        audit_service: Arc<AuditService>,
        base_url: String,
    ) -> Self {
        Self {
            user_service,
            session_store,
            token_store,
            email_service,
            audit_service,
            password_policy: PasswordPolicy::default(),
            base_url,
        }
    }

    /// Authenticate a user and create a session.
    ///
    /// SECURITY: Always creates a NEW session ID on login to prevent
    /// session fixation attacks. Callers must replace any previously held token.
    ///
    /// Returns the bearer token and a DTO of the authenticated user.
    #[instrument(skip(self, email, password))]
    pub async fn login(
        &self,
        ctx: &Ctx,
        email: &Email,
        password: &str,
    ) -> Result<(SessionToken, UserDto), DomainError> {
        let user = match self.user_service.authenticate(ctx, email, password).await {
            Ok(user) => user,
            Err(e) => {
                self.audit_service
                    .try_log(
                        ctx,
                        "login_failed",
                        self.audit_service.log_login_failed(
                            ctx,
                            email.as_str(),
                            None,
                            e.to_string(),
                        ),
                    )
                    .await;
                return Err(e);
            }
        };
        let user_id = user.id;
        let user_dto = UserDto::from(&user);

        let expires_at = Utc::now() + Session::DEFAULT_TTL;
        let token = self.session_store.create(ctx, user_id, expires_at).await?;

        self.audit_service
            .try_log(
                ctx,
                "session_created",
                self.audit_service
                    .log_session_created(ctx, user_id, token.0, None),
            )
            .await;

        Ok((token, user_dto))
    }

    /// Register a new user and send a verification email.
    #[instrument(skip(self, email, password))]
    pub async fn register(
        &self,
        ctx: &Ctx,
        name: String,
        email: &Email,
        password: &str,
        terms_accepted: bool,
        terms_version: String,
    ) -> Result<UserId, DomainError> {
        let user_id = self
            .user_service
            .create_pending_user(ctx, name, email, password, terms_accepted, terms_version)
            .await?;

        self.audit_service
            .try_log(
                ctx,
                "user_registered",
                self.audit_service.log_user_registered(ctx, user_id, None),
            )
            .await;

        let token = Token::generate(TokenKind::EmailVerification, user_id);
        self.token_store
            .save(
                ctx,
                TokenKind::EmailVerification,
                user_id,
                &token.hash,
                token.expires_at,
            )
            .await?;

        let email_content =
            VerificationEmail::new(email.clone(), token.plaintext, self.base_url.clone());
        self.email_service.send(Box::new(email_content)).await?;

        Ok(user_id)
    }

    /// Verify email using token from email link.
    #[instrument(skip(self, token))]
    pub async fn verify_email(&self, ctx: &Ctx, token: &str) -> Result<UserId, DomainError> {
        let token_hash = Token::sha256_hash(token);

        let user_id = self
            .token_store
            .consume(ctx, TokenKind::EmailVerification, &token_hash)
            .await?;

        self.user_service.activate_user(ctx, user_id).await?;

        self.audit_service
            .try_log(
                ctx,
                "email_verified",
                self.audit_service.log_email_verified(ctx, user_id),
            )
            .await;

        Ok(user_id)
    }

    /// Request password reset (user initiates).
    ///
    /// Always returns Ok to prevent email enumeration.
    #[instrument(skip(self, email))]
    pub async fn request_password_reset(
        &self,
        ctx: &Ctx,
        email: &Email,
    ) -> Result<(), DomainError> {
        let user = match self.user_service.find_by_email(ctx, email).await {
            Ok(Some(user)) => user,
            Ok(None) => {
                // User doesn't exist - return Ok to prevent enumeration
                return Ok(());
            }
            Err(e) => return Err(e),
        };

        let token = Token::generate(TokenKind::PasswordReset, user.id);

        self.token_store
            .save(
                ctx,
                TokenKind::PasswordReset,
                user.id,
                &token.hash,
                token.expires_at,
            )
            .await?;

        let email_content =
            PasswordResetEmail::new(email.clone(), token.plaintext, self.base_url.clone());

        // Swallow email errors to prevent account enumeration during outages.
        if let Err(e) = self.email_service.send(Box::new(email_content)).await {
            tracing::warn!(
                error = %e,
                action = "password_reset_email",
                request_id = ?ctx.request_id,
                "failed to send password reset email"
            );
        }

        Ok(())
    }

    /// Reset password using token from email.
    #[instrument(skip(self, token, new_password))]
    pub async fn reset_password(
        &self,
        ctx: &Ctx,
        token: &str,
        new_password: &str,
    ) -> Result<(), DomainError> {
        self.password_policy.validate(new_password)?;

        let token_hash = Token::sha256_hash(token);

        let user_id = self
            .token_store
            .consume(ctx, TokenKind::PasswordReset, &token_hash)
            .await?;

        self.user_service
            .update_password(ctx, user_id, new_password)
            .await?;

        self.audit_service
            .try_log(
                ctx,
                "password_reset",
                self.audit_service.log_password_reset(ctx, user_id),
            )
            .await;

        Ok(())
    }
}
