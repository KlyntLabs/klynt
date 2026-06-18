use crate::domain::ctx::Ctx;
use crate::domain::errors::DomainError;
use crate::domain::models::{Email, Role, User, UserId, UserStatus};
use crate::domain::repositories::{CreateResult, UserRepository};
use chrono::Utc;
use uuid::Uuid;

fn ctx() -> Ctx {
    Ctx::new(Uuid::new_v4())
}

fn sample_user(email: &str) -> Result<User, DomainError> {
    Ok(User {
        id: UserId::new(),
        name: "Ada Lovelace".to_string(),
        email: Email::parse(email).map_err(DomainError::InvalidEmail)?,
        role: Role::Student,
        institution_id: None,
        status: UserStatus::PendingVerification,
        password_hash: "hash".to_string(),
        terms_accepted_at: Utc::now(),
        terms_version: "2026-06-18".to_string(),
        created_at: Utc::now(),
    })
}

pub async fn run_user_repository_conformance_tests(
    repo: &dyn UserRepository,
) -> Result<(), DomainError> {
    let ctx = ctx();
    let email = Email::parse("ada@example.com").map_err(DomainError::InvalidEmail)?;
    let user = sample_user("ada@example.com")?;

    let result = repo.create_if_not_exists(&ctx, &email, &user).await?;
    assert!(matches!(result, CreateResult::Created));

    let found = repo.find_by_email(&ctx, &email).await?;
    assert!(found.is_some());
    assert_eq!(found.unwrap().email.as_str(), "ada@example.com");

    let duplicate = repo.create_if_not_exists(&ctx, &email, &user).await?;
    assert!(matches!(duplicate, CreateResult::AlreadyExists(_)));

    let found_by_id = repo.find_by_id(&ctx, user.id).await?;
    assert!(found_by_id.is_some());

    Ok(())
}
