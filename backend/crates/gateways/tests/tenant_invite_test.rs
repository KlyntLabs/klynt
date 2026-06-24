//! Tenant invite acceptance route tests.

use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
};
use base::ctx::{ExecutionContext, RequestContext};
use base::ports::repository::{MembershipRepository, TenantInviteRepository};
use chrono::Utc;
use domain::{
    Email, Membership, RoleId, Tenant, TenantInvite, TenantRole, TenantSlug, User, UserId,
    UserRole, UserStatus,
};
use std::sync::Arc;
use tower::ServiceExt;

mod support;

fn app_with_invite_fakes(
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

fn create_tenant(
    tenant_repo: &support::StatefulFakeTenantRepository,
    owner_id: UserId,
    slug: &str,
    name: &str,
) -> Tenant {
    let slug = TenantSlug::parse(slug).expect("valid test slug");
    let tenant =
        Tenant::create(slug.clone(), name.to_string(), owner_id).expect("valid test tenant");
    tenant_repo.insert(tenant.clone());
    tenant
}

#[tokio::test]
async fn accept_invite_returns_tenant_and_creates_membership() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, invite_repo, user_repo) =
        app_with_invite_fakes(tenant_repo.clone(), membership_repo.clone());

    let email = "invited@example.com";
    let (user_id, token) = create_active_user(&user_repo, &session_service, email).await;
    let tenant = create_tenant(&tenant_repo, user_id, "invite-tenant", "Invite Tenant");

    let role_id = RoleId::new();
    let invite = TenantInvite {
        id: uuid::Uuid::new_v4(),
        tenant_id: tenant.id,
        email: Email::new(email.to_string()),
        role_id,
        role_name: "member".to_string(),
        invited_by: user_id,
        expires_at: Utc::now() + chrono::Duration::hours(1),
        accepted_at: None,
        token: "invite-token".to_string(),
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    invite_repo.insert(invite);

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/tenants/invites/invite-token/accept")
                .header("Authorization", format!("Bearer {token}"))
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
    assert_eq!(json["data"]["slug"], "invite-tenant");
    assert_eq!(json["data"]["role"], "member");
    assert!(json["data"]["joined_at"].is_string());

    let accepted = invite_repo
        .find_by_token(
            &ExecutionContext::new(RequestContext::new()),
            "invite-token",
        )
        .await
        .unwrap()
        .unwrap();
    assert!(accepted.accepted_at.is_some());

    let membership = membership_repo
        .find(
            &ExecutionContext::new(RequestContext::new()),
            tenant.id,
            user_id,
        )
        .await
        .unwrap();
    assert!(membership.is_some());
    assert_eq!(membership.unwrap().role, TenantRole::Member);
}

#[tokio::test]
async fn create_invite_returns_invite_details() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, invite_repo, user_repo) =
        app_with_invite_fakes(tenant_repo.clone(), membership_repo.clone());

    let email = "owner-create-invite@example.com";
    let (owner_id, token) = create_active_user(&user_repo, &session_service, email).await;
    let tenant = create_tenant(
        &tenant_repo,
        owner_id,
        "invite-create",
        "Invite Create Tenant",
    );
    membership_repo.insert(Membership::new(tenant.id, owner_id, TenantRole::Owner));

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri(format!("/api/v1/tenants/{}/invites", tenant.slug.as_str()))
                .header("Authorization", format!("Bearer {token}"))
                .header("content-type", "application/json")
                .body(Body::from(
                    serde_json::json!({
                        "email": "invited-user@example.com",
                        "role": "admin"
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
    assert!(json["data"]["token"].is_string());
    assert_eq!(json["data"]["email"], "invited-user@example.com");
    assert_eq!(json["data"]["role"], "admin");
    assert!(json["data"]["expires_at"].is_string());

    let created_token = json["data"]["token"].as_str().unwrap().to_string();
    let stored = invite_repo
        .find_by_token(
            &ExecutionContext::new(RequestContext::new()),
            &created_token,
        )
        .await
        .unwrap();
    assert!(stored.is_some());
    assert_eq!(stored.unwrap().role_name, "admin");
}

#[tokio::test]
async fn accept_invite_returns_not_found_for_missing_token() {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, _invite_repo, user_repo) =
        app_with_invite_fakes(tenant_repo, membership_repo);

    let (_user_id, token) =
        create_active_user(&user_repo, &session_service, "missing@example.com").await;

    let response = app
        .oneshot(
            Request::builder()
                .method(Method::POST)
                .uri("/api/v1/tenants/invites/no-such-token/accept")
                .header("Authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
