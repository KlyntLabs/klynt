use std::sync::Arc;

use chrono::Utc;
use tracing::instrument;
use uuid::Uuid;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, NameError};
use klynt_domain::models::{Email, Role, User, UserDto, UserId, UserStatus};
use klynt_domain::password_policy::PasswordPolicy;
use klynt_domain::ports::{HashedPassword, IdempotencyStore, PasswordHasher};
use klynt_domain::repositories::{CreateResult, UserRepository};

#[derive(Debug, Clone)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
    pub password: String,
    pub role: String,
    pub institution_id: Option<Uuid>,
    pub terms_accepted: bool,
    pub terms_version: String,
}

pub struct UserService {
    user_repo: Arc<dyn UserRepository>,
    password_hasher: Arc<dyn PasswordHasher>,
    idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
    password_policy: PasswordPolicy,
}

fn validate_name(name: &str) -> Result<String, DomainError> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err(DomainError::InvalidName(NameError::Empty));
    }
    if name.chars().count() > 200 {
        return Err(DomainError::InvalidName(NameError::TooLong));
    }
    Ok(name)
}

impl UserService {
    pub fn new(
        user_repo: Arc<dyn UserRepository>,
        password_hasher: Arc<dyn PasswordHasher>,
        idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
    ) -> Self {
        Self {
            user_repo,
            password_hasher,
            idempotency_store,
            password_policy: PasswordPolicy::default(),
        }
    }

    #[instrument(skip(self, req), fields(idempotency_key = %idempotency_key))]
    pub async fn create_user(
        &self,
        ctx: &Ctx,
        idempotency_key: Uuid,
        req: CreateUserRequest,
    ) -> Result<UserDto, DomainError> {
        if let Some(cached) = self.idempotency_store.get(idempotency_key).await? {
            return Ok(cached);
        }

        if !req.terms_accepted {
            return Err(DomainError::TermsNotAccepted);
        }

        let name = validate_name(&req.name)?;
        let email = Email::parse(&req.email)?;
        self.password_policy.validate(&req.password)?;
        let role = Role::parse(&req.role)?;

        if role.requires_institution() && req.institution_id.is_none() {
            return Err(DomainError::InstitutionRequired(role));
        }

        let password_hash = self.password_hasher.hash(&req.password).await?;

        let user = User {
            id: UserId::new(),
            name,
            email: email.clone(),
            role,
            institution_id: req.institution_id,
            status: UserStatus::PendingVerification,
            email_verified_at: None,
            global_role: None,
            password_hash: password_hash.as_str().to_string(),
            terms_accepted_at: Utc::now(),
            terms_version: req.terms_version,
            created_at: Utc::now(),
        };

        match self
            .user_repo
            .create_if_not_exists(ctx, &email, &user)
            .await?
        {
            CreateResult::Created => {
                let user_dto = UserDto::from(&user);
                let cached = self
                    .idempotency_store
                    .get_or_insert(idempotency_key, user_dto.clone())
                    .await?;
                Ok(cached.unwrap_or(user_dto))
            }
            CreateResult::AlreadyExists(existing) => Err(DomainError::AlreadyExists {
                email: existing.email.as_str().to_string(),
            }),
        }
    }

    /// Create a new user in pending verification state.
    #[instrument(skip(self, password))]
    pub async fn create_pending_user(
        &self,
        ctx: &Ctx,
        name: String,
        email: &Email,
        password: &str,
        terms_accepted: bool,
        terms_version: String,
    ) -> Result<UserId, DomainError> {
        if !terms_accepted {
            return Err(DomainError::TermsNotAccepted);
        }

        let name = validate_name(&name)?;
        self.password_policy.validate(password)?;
        let password_hash = self.password_hasher.hash(password).await?;

        let user = User {
            id: UserId::new(),
            name,
            email: email.clone(),
            role: Role::Student,
            institution_id: None,
            status: UserStatus::PendingVerification,
            email_verified_at: None,
            global_role: None,
            password_hash: password_hash.as_str().to_string(),
            terms_accepted_at: Utc::now(),
            terms_version,
            created_at: Utc::now(),
        };

        match self
            .user_repo
            .create_if_not_exists(ctx, email, &user)
            .await?
        {
            CreateResult::Created => Ok(user.id),
            CreateResult::AlreadyExists(_) => Err(DomainError::AlreadyExists {
                email: email.as_str().to_string(),
            }),
        }
    }

    /// Activate a user account (after email verification).
    #[instrument(skip(self))]
    pub async fn activate_user(&self, ctx: &Ctx, user_id: UserId) -> Result<(), DomainError> {
        self.user_repo.set_email_verified(ctx, user_id).await
    }

    #[instrument(skip(self, email, password))]
    pub async fn authenticate(
        &self,
        ctx: &Ctx,
        email: &Email,
        password: &str,
    ) -> Result<User, DomainError> {
        let user = self
            .user_repo
            .find_by_email(ctx, email)
            .await?
            .ok_or(DomainError::AuthenticationRequired)?;

        let hash = HashedPassword::new(&user.password_hash);
        if !self.password_hasher.verify(password, &hash).await? {
            // Do not reveal whether the email exists.
            return Err(DomainError::AuthenticationRequired);
        }

        // Only active (email-verified) users may authenticate.
        if user.status != UserStatus::Active {
            return Err(DomainError::AuthenticationRequired);
        }

        Ok(user)
    }

    #[instrument(skip(self))]
    pub async fn find_by_id(&self, ctx: &Ctx, id: UserId) -> Result<User, DomainError> {
        self.user_repo
            .find_by_id(ctx, id)
            .await?
            .ok_or(DomainError::NotFound)
    }

    /// Find a user by email.
    #[instrument(skip(self))]
    pub async fn find_by_email(
        &self,
        ctx: &Ctx,
        email: &Email,
    ) -> Result<Option<User>, DomainError> {
        self.user_repo.find_by_email(ctx, email).await
    }

    /// Update user password.
    #[instrument(skip(self, new_password))]
    pub async fn update_password(
        &self,
        ctx: &Ctx,
        user_id: UserId,
        new_password: &str,
    ) -> Result<(), DomainError> {
        self.password_policy.validate(new_password)?;
        let password_hash = self.password_hasher.hash(new_password).await?;
        self.user_repo
            .update_password(ctx, user_id, &password_hash)
            .await
    }
}
