use std::sync::Arc;

use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use chrono::Utc;

use crate::contracts::users::CreateUserRequest;
use crate::domain::ctx::Ctx;
use crate::domain::errors::{DomainError, NameError};
use crate::domain::models::{validate_password, Email, Role, User, UserId, UserStatus};
use crate::domain::repositories::CreateResult;
use crate::domain::unit_of_work::UnitOfWork;

#[derive(Debug, Clone)]
pub struct UserDto {
    pub id: UserId,
    pub name: String,
    pub email: String,
    pub role: Role,
    pub status: UserStatus,
    pub created_at: chrono::DateTime<Utc>,
}

impl From<&User> for UserDto {
    fn from(user: &User) -> Self {
        Self {
            id: user.id,
            name: user.name.clone(),
            email: user.email.as_str().to_string(),
            role: user.role,
            status: user.status,
            created_at: user.created_at,
        }
    }
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

        let password_hash = hash_password(&req.password)
            .map_err(|e| DomainError::Internal(anyhow::anyhow!("{e}")))?;

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
}

fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(hash.to_string())
}
