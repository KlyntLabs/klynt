use std::error::Error;

use super::*;

#[test]
fn service_error_trait_can_be_used_as_dyn() {
    let kind = AppErrorKind::NotFound;
    let dyn_err: &dyn ServiceError = &kind;
    assert_eq!(dyn_err.error_code(), "NOT_FOUND");
    assert_eq!(dyn_err.severity(), ErrorSeverity::Low);
    assert_eq!(dyn_err.status_code(), StatusCode::NOT_FOUND);
}

#[test]
fn app_error_implements_service_error() {
    let app_err = AppError::new(AppErrorKind::BadRequest("test".to_string()), Uuid::nil());
    let dyn_err: &dyn ServiceError = &app_err;
    assert_eq!(dyn_err.error_code(), "BAD_REQUEST");
    assert_eq!(dyn_err.client_message(), "bad request: test");
}

#[test]
fn service_error_sanitizes_internal_message() {
    let kind = AppErrorKind::Internal(std::sync::Arc::new(std::io::Error::other(
        "db password=secret",
    )));
    let dyn_err: &dyn ServiceError = &kind;
    assert_eq!(dyn_err.client_message(), "something went wrong");
    assert!(!dyn_err.client_message().contains("secret"));
}

#[test]
fn service_error_defaults_details_and_retry_after() {
    let kind = AppErrorKind::BadRequest("bad".to_string());
    let dyn_err: &dyn ServiceError = &kind;
    assert_eq!(dyn_err.details(), None);
    assert_eq!(dyn_err.retry_after_seconds(), None);
}

#[test]
fn internal_error_preserves_source_chain() {
    let inner = std::io::Error::other("db password=secret");
    let kind = AppErrorKind::Internal(std::sync::Arc::new(inner));
    let app_err = AppError::new(kind, Uuid::nil());
    assert!(app_err.source().is_some());
}

#[test]
fn not_found_classification() {
    assert_eq!(AppErrorKind::NotFound.severity(), ErrorSeverity::Low);
    assert_eq!(AppErrorKind::NotFound.category(), ErrorCategory::Validation);
    assert_eq!(AppErrorKind::NotFound.error_code(), "NOT_FOUND");
    assert_eq!(AppErrorKind::NotFound.retry_after_seconds(), None);
}

#[test]
fn bad_request_classification() {
    let kind = AppErrorKind::BadRequest("msg".to_string());
    assert_eq!(kind.severity(), ErrorSeverity::Low);
    assert_eq!(kind.category(), ErrorCategory::Validation);
    assert_eq!(kind.error_code(), "BAD_REQUEST");
}

#[test]
fn conflict_classification() {
    let kind = AppErrorKind::Conflict("msg".to_string());
    assert_eq!(kind.severity(), ErrorSeverity::Low);
    assert_eq!(kind.category(), ErrorCategory::Validation);
    assert_eq!(kind.error_code(), "CONFLICT");
}

#[test]
fn unauthorized_classification() {
    assert_eq!(AppErrorKind::Unauthorized.severity(), ErrorSeverity::Low);
    assert_eq!(
        AppErrorKind::Unauthorized.category(),
        ErrorCategory::Authentication
    );
    assert_eq!(
        AppErrorKind::Unauthorized.error_code(),
        "AUTHENTICATION_REQUIRED"
    );
}

#[test]
fn rate_limited_classification() {
    let kind = AppErrorKind::RateLimited {
        retry_after_seconds: Some(30),
    };
    assert_eq!(kind.severity(), ErrorSeverity::Medium);
    assert_eq!(kind.category(), ErrorCategory::Authorization);
    assert_eq!(kind.error_code(), "RATE_LIMITED");
    assert_eq!(kind.retry_after_seconds(), Some(30));
}

#[test]
fn internal_classification() {
    let kind = AppErrorKind::Internal(std::sync::Arc::new(std::io::Error::other("boom")));
    assert_eq!(kind.severity(), ErrorSeverity::High);
    assert_eq!(kind.category(), ErrorCategory::Infrastructure);
    assert_eq!(kind.error_code(), "INTERNAL_ERROR");
}
