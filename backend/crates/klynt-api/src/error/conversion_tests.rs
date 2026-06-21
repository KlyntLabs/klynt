use axum::http::StatusCode;

use super::*;
use klynt_domain::errors::{DomainError, NameError, PasswordError};

fn status_of(err: AppError) -> StatusCode {
    let response = err.into_response();
    response.status()
}

#[test]
fn conflict_error_becomes_409() {
    let app_err = AppError::from(DomainError::AlreadyExists {
        email: "ada@example.com".to_string(),
    });
    assert_eq!(status_of(app_err), StatusCode::CONFLICT);
}

#[test]
fn validation_error_becomes_400() {
    let app_err = AppError::from(DomainError::WeakPassword(PasswordError::TooShort));
    assert_eq!(status_of(app_err), StatusCode::BAD_REQUEST);
}

#[test]
fn not_found_becomes_404() {
    let app_err = AppError::from(DomainError::NotFound);
    assert_eq!(status_of(app_err), StatusCode::NOT_FOUND);
}

#[test]
fn rate_limited_becomes_429() {
    let app_err = AppError::new(
        AppErrorKind::RateLimited {
            retry_after_seconds: Some(60),
        },
        Uuid::nil(),
    );
    assert_eq!(status_of(app_err), StatusCode::TOO_MANY_REQUESTS);
}

#[test]
fn rate_limited_includes_retry_after_header() {
    let app_err = AppError::new(
        AppErrorKind::RateLimited {
            retry_after_seconds: Some(42),
        },
        Uuid::nil(),
    );
    let response = app_err.into_response();
    let retry_after = response
        .headers()
        .get(axum::http::header::RETRY_AFTER)
        .expect("Retry-After header missing");
    assert_eq!(retry_after, "42");
}

#[test]
fn rate_limited_without_retry_after_omits_header() {
    let app_err = AppError::new(
        AppErrorKind::RateLimited {
            retry_after_seconds: None,
        },
        Uuid::nil(),
    );
    let response = app_err.into_response();
    assert!(response
        .headers()
        .get(axum::http::header::RETRY_AFTER)
        .is_none());
}

#[test]
fn authentication_required_becomes_401() {
    let app_err = AppError::from(DomainError::AuthenticationRequired);
    assert_eq!(status_of(app_err), StatusCode::UNAUTHORIZED);
}

#[test]
fn bad_request_preserves_inner_message() {
    let app_err = AppError::from(DomainError::InvalidName(NameError::Empty));
    match app_err.kind {
        AppErrorKind::BadRequest(msg) => assert_eq!(msg, "name is empty"),
        other => panic!("expected BadRequest, got {other:?}"),
    }
}

#[test]
fn conflict_preserves_inner_message() {
    let app_err = AppError::from(DomainError::AlreadyExists {
        email: "ada@example.com".to_string(),
    });
    match app_err.kind {
        AppErrorKind::Conflict(msg) => assert!(msg.contains("email already registered")),
        other => panic!("expected Conflict, got {other:?}"),
    }
}

#[test]
fn internal_error_becomes_500() {
    let app_err = AppError::from(DomainError::internal_msg("secrets"));
    match app_err.kind {
        kind @ AppErrorKind::Internal(_) => {
            assert_eq!(
                status_of(AppError::new(kind, Uuid::nil())),
                StatusCode::INTERNAL_SERVER_ERROR
            );
        }
        other => panic!("expected Internal, got {other:?}"),
    }
}

#[test]
fn request_id_attached_via_extensions() {
    let request_id = Uuid::new_v4();
    let app_err = AppError::new(AppErrorKind::BadRequest("boom".to_string()), request_id);
    let response = app_err.into_response();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let attached = response
        .extensions()
        .get::<AppError>()
        .expect("AppError in extensions");
    assert_eq!(attached.request_id, request_id);
}
