use chrono::Utc;
use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, Role, User, UserId, UserStatus};
use klynt_domain::repositories::{CreateResult, UserRepository};
use klynt_infrastructure::repositories::in_memory_user::InMemoryUserRepository;
use uuid::Uuid;

fn ctx() -> Ctx {
    Ctx::guest(Uuid::new_v4())
}

fn sample_user(email: &str) -> Result<User, DomainError> {
    Ok(User {
        id: UserId::new(),
        name: "Ada Lovelace".to_string(),
        email: Email::parse(email).map_err(DomainError::InvalidEmail)?,
        role: Role::Student,
        institution_id: None,
        status: UserStatus::PendingVerification,
        email_verified_at: None,
        global_role: None,
        password_hash: "hash".to_string(),
        terms_accepted_at: Utc::now(),
        terms_version: "2026-06-18".to_string(),
        created_at: Utc::now(),
    })
}

async fn run_user_repository_conformance_tests(
    repo: &dyn UserRepository,
) -> Result<(), DomainError> {
    let ctx = ctx();
    let email = Email::parse("ada@example.com").map_err(DomainError::InvalidEmail)?;
    let user = sample_user("ada@example.com")?;

    // Unknown email returns None
    let unknown = Email::parse("unknown@example.com").map_err(DomainError::InvalidEmail)?;
    assert!(repo.find_by_email(&ctx, &unknown).await?.is_none());

    // Create succeeds
    let result = repo.create_if_not_exists(&ctx, &email, &user).await?;
    assert!(matches!(result, CreateResult::Created));

    // find_by_email returns the created user
    let found = repo.find_by_email(&ctx, &email).await?;
    assert!(found.is_some());
    let found = found.unwrap();
    assert_eq!(found.email.as_str(), "ada@example.com");

    // Duplicate returns the existing user
    let duplicate = repo.create_if_not_exists(&ctx, &email, &user).await?;
    match duplicate {
        CreateResult::AlreadyExists(existing) => {
            assert_eq!(existing.email.as_str(), "ada@example.com");
        }
        CreateResult::Created => panic!("expected AlreadyExists"),
    }

    // find_by_id returns the correct user
    let found_by_id = repo.find_by_id(&ctx, user.id).await?;
    assert!(found_by_id.is_some());
    assert_eq!(found_by_id.unwrap().id, user.id);

    Ok(())
}

#[tokio::test]
async fn in_memory_user_repository_conforms() {
    let repo = InMemoryUserRepository::new();
    run_user_repository_conformance_tests(&repo)
        .await
        .expect("conformance tests should pass");
}
