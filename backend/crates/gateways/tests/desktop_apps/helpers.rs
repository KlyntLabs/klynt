//! Shared helpers for the desktop app route integration tests.

use axum::{
    body::Body,
    http::{Method, Request, StatusCode},
};
use base::ctx::{ExecutionContext, RequestContext};
use base::testkit::FakeDesktopAppRepository;
use chrono::Utc;
use domain::{
    Email, Membership, Tenant, TenantRole, TenantSlug, User, UserId, UserRole, UserStatus,
};
use serde_json::json;
use std::sync::Arc;
use tower::ServiceExt;

use super::support;

#[allow(dead_code)]
pub struct TestContext {
    pub app: axum::Router,
    pub session_service: Arc<session_service::SessionService>,
    pub user_repo: Arc<support::FakeUserServiceRepository>,
    pub tenant_repo: Arc<support::StatefulFakeTenantRepository>,
    pub membership_repo: Arc<support::StatefulFakeMembershipRepository>,
    pub app_repo: Arc<FakeDesktopAppRepository>,
}

pub fn app_with_desktop_fakes(
    tenant_repo: Arc<support::StatefulFakeTenantRepository>,
    membership_repo: Arc<support::StatefulFakeMembershipRepository>,
) -> (
    axum::Router,
    Arc<session_service::SessionService>,
    Arc<support::FakeUserServiceRepository>,
    Arc<FakeDesktopAppRepository>,
) {
    let app_repo = Arc::new(FakeDesktopAppRepository::default());
    let (services, session_service, _invite_repo, user_repo, app_repo) =
        support::build_test_services_with_tenant_and_desktop_fakes(
            tenant_repo,
            membership_repo,
            app_repo,
        );
    let config = support::test_config();
    (
        gateways::create_router(config, services),
        session_service,
        user_repo,
        app_repo,
    )
}

pub async fn create_active_user(
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

pub fn create_owned_tenant(
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

pub async fn body_to_json(response: axum::response::Response) -> serde_json::Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .expect("response body should be readable");
    serde_json::from_slice(&body).expect("response body should be valid JSON")
}

pub fn authed_request(method: Method, uri: String, token: &str, body: Body) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header("Authorization", format!("Bearer {token}"))
        .header("content-type", "application/json")
        .body(body)
        .unwrap()
}

pub async fn post_app(
    app: axum::Router,
    tenant: &Tenant,
    token: &str,
    payload: serde_json::Value,
) -> (axum::Router, StatusCode, serde_json::Value) {
    let uri = format!("/api/v1/tenants/{}/desktop/apps", tenant.slug.as_str());
    let response = app
        .clone()
        .oneshot(authed_request(
            Method::POST,
            uri,
            token,
            Body::from(payload.to_string()),
        ))
        .await
        .unwrap();
    let status = response.status();
    let json = body_to_json(response).await;
    (app, status, json)
}

pub async fn tenant_request(
    app: axum::Router,
    method: Method,
    tenant: &Tenant,
    suffix: &str,
    token: &str,
    body: Body,
) -> (axum::Router, axum::response::Response) {
    let uri = format!("/api/v1/tenants/{}{suffix}", tenant.slug.as_str());
    let response = app
        .clone()
        .oneshot(authed_request(method, uri, token, body))
        .await
        .unwrap();
    (app, response)
}

pub fn base_app_payload() -> serde_json::Value {
    json!({
        "type": "markdown",
        "title": "Test App",
        "content": { "body": "hello" },
    })
}

pub fn setup() -> TestContext {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, user_repo, app_repo) =
        app_with_desktop_fakes(tenant_repo.clone(), membership_repo.clone());
    TestContext {
        app,
        session_service,
        user_repo,
        tenant_repo,
        membership_repo,
        app_repo,
    }
}
