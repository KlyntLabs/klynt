//! Tenant role and permission route integration tests.

use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
};
use base::ctx::{ExecutionContext, RequestContext};
use chrono::Utc;
use domain::{
    Email, Membership, Tenant, TenantRole, TenantSlug, User, UserId, UserRole, UserStatus,
};
use std::sync::Arc;
use tower::ServiceExt;

mod support;

fn app_with_tenant_fakes(
    tenant_repo: Arc<support::StatefulFakeTenantRepository>,
    membership_repo: Arc<support::StatefulFakeMembershipRepository>,
) -> (
    axum::Router,
    Arc<session_service::SessionService>,
    Arc<support::FakeUserServiceRepository>,
) {
    let (services, session_service, user_repo) =
        support::build_test_services_with_tenant_fakes(tenant_repo, membership_repo);
    let config = support::test_config();
    (
        gateways::create_router(config, services),
        session_service,
        user_repo,
    )
}

async fn create_active_user(
    user_repo: &support::FakeUserServiceRepository,
    session_service: &session_service::SessionService,
    email: &str,
) -> (UserId, String) {
    let user_id = UserId::new();
    let now = Utc::now();
    let user = User {
        id: user_id,
        email: Email::new(email.to_string()),
        full_name: Some("Test User".to_string()),
        password_hash: "hash-password".to_string(),
        status: UserStatus::Active,
        role: UserRole::Student,
        global_role: None,
        email_verified_at: None,
        institution_id: None,
        terms_accepted_at: now,
        terms_version: "1.0".to_string(),
        created_at: now,
        updated_at: now,
        deleted_at: None,
    };
    user_repo.insert(user);

    let token = session_service
        .create(
            &ExecutionContext::new(RequestContext::new()),
            UserId(user_id.inner()),
        )
        .await
        .unwrap();

    (user_id, token.token.0.to_string())
}

fn create_owned_tenant(
    tenant_repo: &support::StatefulFakeTenantRepository,
    membership_repo: &support::StatefulFakeMembershipRepository,
    owner_id: UserId,
    slug: &str,
    name: &str,
) -> Tenant {
    let slug = TenantSlug::parse(slug).expect("valid test slug");
    let tenant =
        Tenant::create(slug.clone(), name.to_string(), owner_id).expect("valid test tenant");

    tenant_repo.insert(tenant.clone());
    membership_repo.insert(Membership::new(tenant.id, owner_id, TenantRole::Owner));

    tenant
}

#[tokio::test]
async fn lists_permission_catalog() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, user_repo) =
        app_with_tenant_fakes(tenant_repo.clone(), membership_repo.clone());

    let (_owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "owner-perms@example.com").await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/permissions")
                .header("Authorization", format!("Bearer {owner_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert!(json["data"].is_array());
    assert!(!json["data"].as_array().unwrap().is_empty());
}

#[tokio::test]
async fn owner_can_create_and_list_roles() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, user_repo) =
        app_with_tenant_fakes(tenant_repo.clone(), membership_repo.clone());

    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "owner-roles@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "role-tenant",
        "Role Tenant",
    );

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/api/v1/tenants/{}/roles", tenant.slug.as_str()))
                .header("Authorization", format!("Bearer {owner_token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "name": "Manager",
                        "description": "Manages content",
                        "permission_ids": [],
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/api/v1/tenants/{}/roles", tenant.slug.as_str()))
                .header("Authorization", format!("Bearer {owner_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn owner_can_attempt_role_lifecycle() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, user_repo) =
        app_with_tenant_fakes(tenant_repo.clone(), membership_repo.clone());

    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "owner-lifecycle@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "lifecycle-tenant",
        "Lifecycle Tenant",
    );

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/api/v1/tenants/{}/roles", tenant.slug.as_str()))
                .header("Authorization", format!("Bearer {owner_token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "name": "Editor",
                        "description": "",
                        "permission_ids": [],
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    let role_id = json["data"]["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!(
                    "/api/v1/tenants/{}/roles/{role_id}",
                    tenant.slug.as_str()
                ))
                .header("Authorization", format!("Bearer {owner_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri(format!(
                    "/api/v1/tenants/{}/roles/{role_id}",
                    tenant.slug.as_str()
                ))
                .header("Authorization", format!("Bearer {owner_token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({ "permission_ids": [] }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!(
                    "/api/v1/tenants/{}/roles/{role_id}",
                    tenant.slug.as_str()
                ))
                .header("Authorization", format!("Bearer {owner_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn non_member_cannot_access_roles() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, user_repo) =
        app_with_tenant_fakes(tenant_repo.clone(), membership_repo.clone());

    let (owner_id, _owner_token) =
        create_active_user(&user_repo, &session_service, "owner-private@example.com").await;
    let (_stranger_id, stranger_token) =
        create_active_user(&user_repo, &session_service, "stranger@example.com").await;

    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "private-tenant",
        "Private Tenant",
    );

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/api/v1/tenants/{}/roles", tenant.slug.as_str()))
                .header("Authorization", format!("Bearer {stranger_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}
