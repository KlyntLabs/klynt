//! Desktop app route integration tests.
//!
//! Covers the tenant-scoped desktop app HTTP endpoints using the gateway test
//! helpers with a shared in-memory desktop app fake.

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

mod support;

fn app_with_desktop_fakes(
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

async fn body_to_json(response: axum::response::Response) -> serde_json::Value {
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

fn authed_request(method: Method, uri: String, token: &str, body: Body) -> Request<Body> {
    Request::builder()
        .method(method)
        .uri(uri)
        .header("Authorization", format!("Bearer {token}"))
        .header("content-type", "application/json")
        .body(body)
        .unwrap()
}

async fn post_app(
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

async fn tenant_request(
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

fn base_app_payload() -> serde_json::Value {
    json!({
        "type": "markdown",
        "title": "Test App",
        "content": { "body": "hello" },
    })
}

#[allow(clippy::type_complexity)]
fn setup() -> (
    axum::Router,
    Arc<session_service::SessionService>,
    Arc<support::FakeUserServiceRepository>,
    Arc<support::StatefulFakeTenantRepository>,
    Arc<support::StatefulFakeMembershipRepository>,
    Arc<FakeDesktopAppRepository>,
) {
    let tenant_repo = Arc::new(support::StatefulFakeTenantRepository::default());
    let membership_repo = Arc::new(support::StatefulFakeMembershipRepository::default());
    let (app, session_service, user_repo, app_repo) =
        app_with_desktop_fakes(tenant_repo.clone(), membership_repo.clone());
    (
        app,
        session_service,
        user_repo,
        tenant_repo,
        membership_repo,
        app_repo,
    )
}

#[tokio::test]
async fn create_app_returns_201_with_etag() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "owner@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-owner",
        "Desktop Owner Tenant",
    );

    let (_app, status, json) = post_app(app, &tenant, &owner_token, base_app_payload()).await;

    assert_eq!(status, StatusCode::CREATED);
    assert!(json["data"]["id"].is_string());
    assert!(json["data"]["etag"].is_string());
    assert_eq!(json["data"]["type"], "markdown");
}

#[tokio::test]
async fn get_desktop_bundle_returns_summaries_without_content() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "bundle@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-bundle",
        "Bundle Tenant",
    );

    let (app, _status, _json) = post_app(
        app,
        &tenant,
        &owner_token,
        json!({
            "type": "markdown",
            "title": "Bundle App",
            "content": { "body": "bundle content" },
        }),
    )
    .await;

    let (_app, response) = tenant_request(
        app,
        Method::GET,
        &tenant,
        "/desktop",
        &owner_token,
        Body::empty(),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);

    let json = body_to_json(response).await;
    let apps = json["data"]["apps"].as_array().unwrap();
    assert_eq!(apps.len(), 1);
    assert!(apps[0]["id"].is_string());
    assert_eq!(apps[0]["title"], "Bundle App");
    assert!(apps[0].get("content").is_none());
}

#[tokio::test]
async fn get_app_returns_full_app_with_content() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "getapp@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-getapp",
        "GetApp Tenant",
    );

    let (app, _status, create_json) = post_app(
        app,
        &tenant,
        &owner_token,
        json!({
            "type": "markdown",
            "title": "Full App",
            "content": { "body": "full content" },
        }),
    )
    .await;
    let app_id = create_json["data"]["id"].as_str().unwrap();

    let (_app, response) = tenant_request(
        app,
        Method::GET,
        &tenant,
        &format!("/apps/{app_id}"),
        &owner_token,
        Body::empty(),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);

    let json = body_to_json(response).await;
    assert!(json["data"]["content"].is_object());
    assert_eq!(json["data"]["content"]["body"], "full content");
}

#[tokio::test]
async fn update_app_with_wrong_etag_returns_409() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "etag-wrong@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-etag-wrong",
        "Etag Wrong Tenant",
    );

    let (app, _status, create_json) =
        post_app(app, &tenant, &owner_token, base_app_payload()).await;
    let app_id = create_json["data"]["id"].as_str().unwrap();

    let (_app, response) = tenant_request(
        app,
        Method::PATCH,
        &tenant,
        &format!("/apps/{app_id}"),
        &owner_token,
        Body::from(
            json!({
                "etag": "definitely-wrong",
                "title": "Updated Title",
                "content": null,
                "menu_config": null,
            })
            .to_string(),
        ),
    )
    .await;

    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn update_app_with_correct_etag_then_stale_etag_returns_409() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "etag-stale@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-etag-stale",
        "Etag Stale Tenant",
    );

    let (app, _status, create_json) =
        post_app(app, &tenant, &owner_token, base_app_payload()).await;
    let app_id = create_json["data"]["id"].as_str().unwrap();
    let etag = create_json["data"]["etag"].as_str().unwrap().to_string();

    let (app, response) = tenant_request(
        app,
        Method::PATCH,
        &tenant,
        &format!("/apps/{app_id}"),
        &owner_token,
        Body::from(
            json!({
                "etag": etag,
                "title": "Updated Title",
                "content": null,
                "menu_config": null,
            })
            .to_string(),
        ),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);

    let (_app, stale_response) = tenant_request(
        app,
        Method::PATCH,
        &tenant,
        &format!("/apps/{app_id}"),
        &owner_token,
        Body::from(
            json!({
                "etag": create_json["data"]["etag"],
                "title": "Should Fail",
                "content": null,
                "menu_config": null,
            })
            .to_string(),
        ),
    )
    .await;

    assert_eq!(stale_response.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn delete_app_as_owner_returns_204() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "delete-owner@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-delete-owner",
        "Delete Owner Tenant",
    );

    let (app, _status, create_json) =
        post_app(app, &tenant, &owner_token, base_app_payload()).await;
    let app_id = create_json["data"]["id"].as_str().unwrap();

    let (app, response) = tenant_request(
        app,
        Method::DELETE,
        &tenant,
        &format!("/apps/{app_id}"),
        &owner_token,
        Body::empty(),
    )
    .await;

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let (_app, get_response) = tenant_request(
        app,
        Method::GET,
        &tenant,
        &format!("/apps/{app_id}"),
        &owner_token,
        Body::empty(),
    )
    .await;

    assert_eq!(get_response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn delete_app_as_non_owner_returns_403() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "non-owner-a@example.com").await;
    let (member_id, member_token) =
        create_active_user(&user_repo, &session_service, "non-owner-b@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-non-owner",
        "Non Owner Tenant",
    );
    membership_repo.insert(Membership::new(tenant.id, member_id, TenantRole::Member));

    let (app, _status, create_json) =
        post_app(app, &tenant, &owner_token, base_app_payload()).await;
    let app_id = create_json["data"]["id"].as_str().unwrap();

    let (_app, response) = tenant_request(
        app,
        Method::DELETE,
        &tenant,
        &format!("/apps/{app_id}"),
        &member_token,
        Body::empty(),
    )
    .await;

    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn create_app_with_oversized_content_returns_422() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "oversized@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-oversized",
        "Oversized Tenant",
    );

    let big = "x".repeat(300_000);
    let (_app, status, _json) = post_app(
        app,
        &tenant,
        &owner_token,
        json!({
            "type": "markdown",
            "title": "Big App",
            "content": { "body": big },
        }),
    )
    .await;

    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn create_video_app_with_http_src_returns_422() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "http-video@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-http-video",
        "Http Video Tenant",
    );

    let (_app, status, _json) = post_app(
        app,
        &tenant,
        &owner_token,
        json!({
            "type": "video",
            "title": "Http Video",
            "content": { "src": "http://example.com/video.mp4" },
        }),
    )
    .await;

    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn xss_payload_is_preserved_as_json_not_executed() {
    let (app, session_service, user_repo, tenant_repo, membership_repo, _) = setup();
    let (owner_id, owner_token) =
        create_active_user(&user_repo, &session_service, "xss@example.com").await;
    let tenant = create_owned_tenant(
        &tenant_repo,
        &membership_repo,
        owner_id,
        "desktop-xss",
        "XSS Tenant",
    );

    let payload = "<script>alert(1)</script>";
    let (app, _status, create_json) = post_app(
        app,
        &tenant,
        &owner_token,
        json!({
            "type": "markdown",
            "title": "XSS App",
            "content": { "payload": payload },
        }),
    )
    .await;
    let app_id = create_json["data"]["id"].as_str().unwrap();

    let (_app, response) = tenant_request(
        app,
        Method::GET,
        &tenant,
        &format!("/apps/{app_id}"),
        &owner_token,
        Body::empty(),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);

    let json = body_to_json(response).await;
    assert_eq!(json["data"]["content"]["payload"], payload);
}
