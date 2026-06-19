use std::sync::Arc;

use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHash, PasswordHasher, PasswordVerifier,
};
use chrono::Utc;
use uuid::Uuid;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, NameError};
use klynt_domain::models::{validate_password, Email, Role, User, UserDto, UserId, UserStatus};
use klynt_domain::repositories::CreateResult;
use klynt_domain::unit_of_work::UnitOfWork;

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
    uow: Arc<dyn UnitOfWork>,
}

impl UserService {
    pub fn new(uow: Arc<dyn UnitOfWork>) -> Self {
        Self { uow }
    }

    pub async fn create_user(
        &self,
        ctx: &Ctx,
        req: CreateUserRequest,
    ) -> Result<UserDto, DomainError> {
        if !req.terms_accepted {
            return Err(DomainError::TermsNotAccepted);
        }

        let name = req.name.trim().to_string();
        if name.is_empty() {
            return Err(DomainError::InvalidName(NameError::Empty));
        }
        if name.chars().count() > 200 {
            return Err(DomainError::InvalidName(NameError::TooLong));
        }

        let email = Email::parse(&req.email)?;
        validate_password(&req.password)?;
        let role = Role::parse(&req.role)?;

        if role.requires_institution() && req.institution_id.is_none() {
            return Err(DomainError::InstitutionRequired(role));
        }

        let password_hash =
            hash_password(&req.password).map_err(|e| DomainError::internal_msg(e.to_string()))?;

        let user = User {
            id: UserId::new(),
            name,
            email: email.clone(),
            role,
            institution_id: req.institution_id,
            status: UserStatus::PendingVerification,
            password_hash,
            terms_accepted_at: Utc::now(),
            terms_version: req.terms_version,
            created_at: Utc::now(),
        };

        let tx = self.uow.begin().await?;
        match tx.users().create_if_not_exists(ctx, &email, &user).await? {
            CreateResult::Created => {
                tx.commit().await?;
                Ok(UserDto::from(&user))
            }
            CreateResult::AlreadyExists(existing) => {
                tx.rollback().await?;
                Err(DomainError::AlreadyExists {
                    email: existing.email.as_str().to_string(),
                })
            }
        }
    }

    pub async fn authenticate(
        &self,
        ctx: &Ctx,
        email: &Email,
        password: &str,
    ) -> Result<User, DomainError> {
        let tx = self.uow.begin().await?;
        let user = tx
            .users()
            .find_by_email(ctx, email)
            .await?
            .ok_or(DomainError::AuthenticationRequired)?;

        if verify_password(password, &user.password_hash).is_err() {
            // Do not reveal whether the email exists.
            return Err(DomainError::AuthenticationRequired);
        }

        tx.commit().await?;
        Ok(user)
    }

    pub async fn find_by_id(&self, ctx: &Ctx, id: UserId) -> Result<User, DomainError> {
        let tx = self.uow.begin().await?;
        let user = tx
            .users()
            .find_by_id(ctx, id)
            .await?
            .ok_or(DomainError::NotFound)?;
        tx.commit().await?;
        Ok(user)
    }
}

fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(hash.to_string())
}

fn verify_password(password: &str, hash: &str) -> Result<(), argon2::password_hash::Error> {
    let parsed_hash = PasswordHash::new(hash)?;
    Argon2::default().verify_password(password.as_bytes(), &parsed_hash)
}
