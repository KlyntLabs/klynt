//! User service integration tests.

use domain::{PaginationRequest, UserId};

use user_service::application::ports::UserRepository;
use user_service::error::UserError;
use user_service::models::ProfileUpdate;

mod support;

#[tokio::test]
async fn get_user_returns_profile() {
    let (service, repo, _audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let user = support::sample_user("ada@example.com", "Ada Lovelace", "hash");
    let user_id = user.id;
    repo.insert(user);

    let profile = service.get_user(&ctx, user_id).await.unwrap();

    assert_eq!(profile.id, user_id);
    assert_eq!(profile.email, "ada@example.com");
    assert_eq!(profile.full_name, Some("Ada Lovelace".to_string()));
}

#[tokio::test]
async fn get_deleted_user_returns_deleted_error() {
    let (service, repo, _audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let mut user = support::sample_user("deleted@example.com", "Deleted", "hash");
    let user_id = user.id;
    user.deleted_at = Some(chrono::Utc::now());
    repo.insert(user);

    let result = service.get_user(&ctx, user_id).await;
    assert!(matches!(result, Err(UserError::UserDeleted)));
}

#[tokio::test]
async fn get_missing_user_returns_not_found() {
    let (service, _repo, _audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let result = service.get_user(&ctx, UserId::new()).await;
    assert!(matches!(result, Err(UserError::NotFound)));
}

#[tokio::test]
async fn update_profile_modifies_user() {
    let (service, repo, audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let user = support::sample_user("ada@example.com", "Old Name", "hash");
    let user_id = user.id;
    repo.insert(user);

    let updates = ProfileUpdate {
        full_name: Some("New Name".to_string()),
    };

    let profile = service
        .update_profile(&ctx, user_id, updates)
        .await
        .unwrap();

    assert_eq!(profile.full_name, Some("New Name".to_string()));
    assert!(audit.events().contains(&"profile_updated".to_string()));
}

#[tokio::test]
async fn update_profile_with_empty_name_is_rejected() {
    let (service, repo, _audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let user = support::sample_user("ada@example.com", "Ada", "hash");
    let user_id = user.id;
    repo.insert(user);

    let updates = ProfileUpdate {
        full_name: Some("".to_string()),
    };

    let result = service.update_profile(&ctx, user_id, updates).await;
    assert!(matches!(result, Err(UserError::Validation(_))));
}

#[tokio::test]
async fn change_password_with_valid_password_succeeds() {
    let (service, repo, audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let user = support::sample_user("ada@example.com", "Ada", "old-password");
    let user_id = user.id;
    repo.insert(user);

    service
        .change_password(&ctx, user_id, "old-password", "new-password")
        .await
        .unwrap();

    let updated = repo.find_by_id(&ctx, user_id).await.unwrap().unwrap();
    assert_eq!(updated.password_hash, "new-password");
    assert!(audit.events().contains(&"password_changed".to_string()));
}

#[tokio::test]
async fn change_password_with_invalid_password_fails() {
    let (service, repo, _audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let user = support::sample_user("ada@example.com", "Ada", "old-password");
    let user_id = user.id;
    repo.insert(user);

    let result = service
        .change_password(&ctx, user_id, "wrong-password", "new-password")
        .await;

    assert!(matches!(result, Err(UserError::InvalidPassword)));
}

#[tokio::test]
async fn delete_user_soft_deletes() {
    let (service, repo, audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let user = support::sample_user("ada@example.com", "Ada", "hash");
    let user_id = user.id;
    repo.insert(user);

    service.delete_user(&ctx, user_id).await.unwrap();

    let result = service.get_user(&ctx, user_id).await;
    assert!(matches!(result, Err(UserError::UserDeleted)));
    assert!(audit.events().contains(&"user_deleted".to_string()));
}

#[tokio::test]
async fn cannot_delete_admin_user() {
    let (service, repo, _audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let mut user = support::sample_user("admin@example.com", "Admin", "hash");
    user.role = domain::UserRole::Admin;
    let user_id = user.id;
    repo.insert(user);

    let result = service.delete_user(&ctx, user_id).await;
    assert!(matches!(result, Err(UserError::CannotDeleteAdmin)));
}

#[tokio::test]
async fn list_users_returns_paginated_profiles() {
    let (service, repo, _audit) = support::build_test_service();
    let ctx = support::test_ctx();

    for i in 0..5 {
        let user = support::sample_user(
            &format!("user{i}@example.com"),
            &format!("User {i}"),
            "hash",
        );
        repo.insert(user);
    }

    let response = service
        .list_users(&ctx, PaginationRequest::new(1, 2))
        .await
        .unwrap();

    assert_eq!(response.items.len(), 2);
    assert_eq!(response.total_count, 5);
    assert_eq!(response.page, 1);
    assert_eq!(response.page_size, 2);
    assert_eq!(response.total_pages, 3);
}

#[tokio::test]
async fn list_users_excludes_deleted_users() {
    let (service, repo, _audit) = support::build_test_service();
    let ctx = support::test_ctx();

    let active = support::sample_user("active@example.com", "Active", "hash");
    let mut deleted = support::sample_user("deleted@example.com", "Deleted", "hash");
    deleted.deleted_at = Some(chrono::Utc::now());
    repo.insert(active);
    repo.insert(deleted);

    let response = service
        .list_users(&ctx, PaginationRequest::first())
        .await
        .unwrap();

    assert_eq!(response.items.len(), 1);
    assert_eq!(response.total_count, 1);
}
