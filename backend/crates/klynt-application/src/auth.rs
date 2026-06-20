use std::sync::Arc;

use chrono::Utc;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, UserDto, UserId};
use klynt_domain::ports::SharedEmailService;
use klynt_domain::repositories::{EmailVerificationTokenRepository, PasswordResetTokenRepository};
use klynt_domain::session::{Session, SessionStore, SessionToken};
use klynt_domain::tokens::{EmailVerificationToken, PasswordResetToken};

use crate::users::UserService;

pub struct AuthService {
    user_service: Arc<UserService>,
    session_store: Arc<dyn SessionStore>,
    email_verification_repo: Arc<dyn EmailVerificationTokenRepository>,
    password_reset_repo: Arc<dyn PasswordResetTokenRepository>,
    email_service: SharedEmailService,
}

impl AuthService {
    pub fn new(
        user_service: Arc<UserService>,
        session_store: Arc<dyn SessionStore>,
        email_verification_repo: Arc<dyn EmailVerificationTokenRepository>,
        password_reset_repo: Arc<dyn PasswordResetTokenRepository>,
        email_service: SharedEmailService,
    ) -> Self {
        Self {
            user_service,
            session_store,
            email_verification_repo,
            password_reset_repo,
            email_service,
        }
    }

    /// Authenticate a user and create a session.
    ///
    /// SECURITY: Always creates a NEW session ID on login to prevent
    /// session fixation attacks. Callers must replace any previously held token.
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

    /// Register a new user and send a verification email.
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

        let token = EmailVerificationToken::generate(user_id);
        self.email_verification_repo
            .save(ctx, user_id, &token.hash, token.expires_at)
            .await?;

        self.email_service
            .send_verification(email, &token.plaintext)
            .await?;

        Ok(user_id)
    }

    /// Verify email using token from email link.
    pub async fn verify_email(&self, ctx: &Ctx, token: &str) -> Result<UserId, DomainError> {
        let token_hash = EmailVerificationToken::sha256_hash(token);

        let (user_id, _expires_at) = self
            .email_verification_repo
            .find_valid(ctx, &token_hash)
            .await?
            .ok_or(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::Invalid,
            ))?;

        let was_used = self
            .email_verification_repo
            .mark_used(ctx, &token_hash)
            .await?;

        if !was_used {
            return Err(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::AlreadyUsed,
            ));
        }

        self.user_service.activate_user(ctx, user_id).await?;

        Ok(user_id)
    }

    /// Request password reset (user initiates).
    ///
    /// Always returns Ok to prevent email enumeration.
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

        let token = PasswordResetToken::generate(user.id);

        self.password_reset_repo
            .save(ctx, user.id, &token.hash, token.expires_at)
            .await?;

        self.email_service
            .send_password_reset(email, &token.plaintext)
            .await?;

        Ok(())
    }

    /// Reset password using token from email.
    pub async fn reset_password(
        &self,
        ctx: &Ctx,
        token: &str,
        new_password: &str,
    ) -> Result<(), DomainError> {
        klynt_domain::models::validate_password(new_password)?;

        let token_hash = PasswordResetToken::sha256_hash(token);

        let (user_id, _expires_at) = self
            .password_reset_repo
            .find_valid(ctx, &token_hash)
            .await?
            .ok_or(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::Invalid,
            ))?;

        let was_used = self.password_reset_repo.mark_used(ctx, &token_hash).await?;

        if !was_used {
            return Err(DomainError::InvalidToken(
                klynt_domain::errors::TokenError::AlreadyUsed,
            ));
        }

        self.user_service
            .update_password(ctx, user_id, new_password)
            .await?;

        Ok(())
    }
}
