//! Tenant route integration tests.
//!
//! These tests use the gateway test helpers with stateful tenant fakes to
//! verify tenant context middleware and route authorization.

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
    Arc<support::FakeTenantInviteRepository>,
    Arc<support::FakeUserServiceRepository>,
) {
    let (services, session_service, invite_repo, user_repo) =
        support::build_test_services_with_tenant_fakes(tenant_repo, membership_repo);
    let config = support::test_config();
    (
        gateways::create_router(config, services),
        session_service,
        invite_repo,
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
        username: email.split('@').next().unwrap().to_string(),
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
async fn non_member_cannot_access_tenant() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, _invite_repo, user_repo) =
        app_with_tenant_fakes(tenant_repo.clone(), membership_repo.clone());

    let (owner_id, _owner_token) =
        create_active_user(&user_repo, &session_service, "owner@example.com").await;
    let (_stranger_id, stranger_token) =
        create_active_user(&user_repo, &session_service, "stranger@example.com").await;

    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "acme-corp",
        "Acme Corp",
    );

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/api/v1/tenants/{}", tenant.slug.as_str()))
                .header("Authorization", format!("Bearer {stranger_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn member_can_list_their_tenants() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, _invite_repo, user_repo) =
        app_with_tenant_fakes(tenant_repo.clone(), membership_repo.clone());

    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "owner-list@example.com").await;
    create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "owner-tenant",
        "Owner Tenant",
    );

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri("/api/v1/tenants")
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
    assert_eq!(json["data"].as_array().unwrap().len(), 1);
    assert_eq!(json["data"][0]["slug"], "owner-tenant");
    assert_eq!(json["data"][0]["name"], "Owner Tenant");
    assert_eq!(json["data"][0]["role"], "owner");
    assert!(json["data"][0]["joined_at"].is_string());
}

#[tokio::test]
async fn get_tenant_returns_full_payload() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, _invite_repo, user_repo) =
        app_with_tenant_fakes(tenant_repo.clone(), membership_repo.clone());

    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "owner-detail@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "detail-tenant",
        "Detail Tenant",
    );

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::GET)
                .uri(format!("/api/v1/tenants/{}", tenant.slug.as_str()))
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
    assert_eq!(json["data"]["slug"], "detail-tenant");
    assert_eq!(json["data"]["name"], "Detail Tenant");
    assert_eq!(json["data"]["max_members"], 100);
    assert_eq!(json["data"]["max_owners"], 1);
    assert!(json["data"]["settings"].is_object());
    assert!(json["data"].get("created_at").is_some());
    assert!(json["data"].get("updated_at").is_some());
}

#[tokio::test]
async fn owner_can_update_and_delete_tenant() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, _invite_repo, user_repo) =
        app_with_tenant_fakes(tenant_repo.clone(), membership_repo.clone());

    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "owner-update@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "update-tenant",
        "Original Name",
    );

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::PATCH)
                .uri(format!("/api/v1/tenants/{}", tenant.slug.as_str()))
                .header("Authorization", format!("Bearer {owner_token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({ "name": "Updated Name" }).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["data"]["name"], "Updated Name");

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::DELETE)
                .uri(format!("/api/v1/tenants/{}", tenant.slug.as_str()))
                .header("Authorization", format!("Bearer {owner_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn creating_more_than_two_active_tenants_fails() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, _invite_repo, user_repo) =
        app_with_tenant_fakes(tenant_repo.clone(), membership_repo.clone());

    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "owner-limit@example.com").await;

    for i in 0..2 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/v1/tenants")
                    .header("Authorization", format!("Bearer {owner_token}"))
                    .header("content-type", "application/json")
                    .body(Body::from(
                        serde_json::json!({
                            "slug": format!("tenant-{i}-{}" , owner_id.inner()),
                            "name": format!("Tenant {i}"),
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/tenants")
                .header("Authorization", format!("Bearer {owner_token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "slug": format!("tenant-exceed-{}" , owner_id.inner()),
                        "name": "Exceed Tenant",
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}
