use thiserror::Error;

use crate::models::Role;

#[derive(Debug, Error, PartialEq)]
pub enum EmailError {
    #[error("email is empty")]
    Empty,
    #[error("invalid email format")]
    InvalidFormat,
}

#[derive(Debug, Error, PartialEq)]
pub enum NameError {
    #[error("name is empty")]
    Empty,
    #[error("name is too long")]
    TooLong,
}

#[derive(Debug, Error, PartialEq)]
pub enum RoleError {
    #[error("unknown role")]
    Unknown,
}

#[derive(Debug, Error, PartialEq)]
pub enum TokenError {
    #[error("token is expired")]
    Expired,
    #[error("invalid token")]
    Invalid,
    #[error("token not found")]
    NotFound,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorKind {
    Validation,
    Conflict,
    NotFound,
    RateLimited,
    AuthenticationRequired,
    Internal,
}

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("email already registered: {email}")]
    AlreadyExists { email: String },
    #[error("{0}")]
    InvalidEmail(#[from] EmailError),
    #[error("{0}")]
    InvalidRole(#[from] RoleError),
    #[error("{0}")]
    InvalidToken(#[from] TokenError),
    #[error("{0}")]
    InvalidName(#[from] NameError),
    #[error("not found")]
    NotFound,
    #[error("institution_id is required for role {0:?}")]
    InstitutionRequired(Role),
    #[error("terms must be accepted")]
    TermsNotAccepted,
    #[error("too many requests")]
    RateLimited,
    #[error("invalid session token")]
    InvalidSessionToken,
    #[error("authentication required")]
    AuthenticationRequired,
    #[error("internal domain error")]
    Internal(Box<dyn std::error::Error + Send + Sync>),
}

#[derive(Debug)]
struct InternalError(String);

impl std::fmt::Display for InternalError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for InternalError {}

impl DomainError {
    pub fn internal<E>(error: E) -> Self
    where
        E: std::error::Error + Send + Sync + 'static,
    {
        Self::Internal(Box::new(error))
    }

    pub fn internal_msg<S: Into<String>>(message: S) -> Self {
        Self::Internal(Box::new(InternalError(message.into())))
    }

    pub fn kind(&self) -> ErrorKind {
        match self {
            DomainError::NotFound => ErrorKind::NotFound,
            DomainError::AlreadyExists { .. } => ErrorKind::Conflict,
            DomainError::InvalidEmail(_)
            | DomainError::InvalidRole(_)
            | DomainError::InvalidToken(_)
            | DomainError::InvalidName(_)
            | DomainError::InstitutionRequired(_)
            | DomainError::TermsNotAccepted
            | DomainError::InvalidSessionToken => ErrorKind::Validation,
            DomainError::RateLimited => ErrorKind::RateLimited,
            DomainError::AuthenticationRequired => ErrorKind::AuthenticationRequired,
            DomainError::Internal(_) => ErrorKind::Internal,
        }
    }

    /// Get HTTP status code for this error.
    pub fn http_status_code(&self) -> axum::http::StatusCode {
        match self.kind() {
            ErrorKind::NotFound => axum::http::StatusCode::NOT_FOUND,
            ErrorKind::Conflict => axum::http::StatusCode::CONFLICT,
            ErrorKind::Validation => axum::http::StatusCode::BAD_REQUEST,
            ErrorKind::RateLimited => axum::http::StatusCode::TOO_MANY_REQUESTS,
            ErrorKind::AuthenticationRequired => axum::http::StatusCode::UNAUTHORIZED,
            ErrorKind::Internal => axum::http::StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    /// Get stable error code string for client responses.
    pub fn error_code(&self) -> &'static str {
        match self {
            DomainError::NotFound => "NOT_FOUND",
            DomainError::AlreadyExists { .. } => "ALREADY_EXISTS",
            DomainError::InvalidEmail(_) => "INVALID_EMAIL",
            DomainError::InvalidRole(_) => "INVALID_ROLE",
            DomainError::InvalidToken(_) => "INVALID_TOKEN",
            DomainError::InvalidName(_) => "INVALID_NAME",
            DomainError::InstitutionRequired(_) => "INSTITUTION_REQUIRED",
            DomainError::TermsNotAccepted => "TERMS_NOT_ACCEPTED",
            DomainError::RateLimited => "RATE_LIMITED",
            DomainError::InvalidSessionToken => "INVALID_SESSION_TOKEN",
            DomainError::AuthenticationRequired => "AUTHENTICATION_REQUIRED",
            DomainError::Internal(_) => "INTERNAL_ERROR",
        }
    }

    /// Get client-safe error message.
    pub fn client_message(&self) -> String {
        match self {
            DomainError::Internal(_) => "Something went wrong".to_string(),
            other => other.to_string(),
        }
    }

    /// Get full HTTP metadata for this error.
    pub fn http_metadata(&self) -> HttpMetadata {
        HttpMetadata {
            status_code: self.http_status_code(),
            error_code: self.error_code(),
            client_message: self.client_message(),
        }
    }
}

/// HTTP-facing metadata derived from a [`DomainError`].
#[derive(Debug)]
pub struct HttpMetadata {
    pub status_code: axum::http::StatusCode,
    pub error_code: &'static str,
    pub client_message: String,
}

#[cfg(test)]
mod classification_tests {
    use super::*;

    #[test]
    fn already_exists_is_conflict() {
        let err = DomainError::AlreadyExists {
            email: "ada@example.com".to_string(),
        };
        assert_eq!(err.kind(), ErrorKind::Conflict);
        assert!(err.to_string().contains("email already registered"));
    }

    #[test]
    fn invalid_email_is_validation() {
        let err = DomainError::InvalidEmail(EmailError::Empty);
        assert_eq!(err.kind(), ErrorKind::Validation);
        assert_eq!(err.to_string(), "email is empty");
    }

    #[test]
    fn invalid_role_is_validation() {
        let err = DomainError::InvalidRole(RoleError::Unknown);
        assert_eq!(err.kind(), ErrorKind::Validation);
        assert_eq!(err.to_string(), "unknown role");
    }

    #[test]
    fn invalid_token_is_validation() {
        let err = DomainError::InvalidToken(TokenError::Expired);
        assert_eq!(err.kind(), ErrorKind::Validation);
        assert_eq!(err.to_string(), "token is expired");
    }

    #[test]
    fn invalid_name_is_validation() {
        let err = DomainError::InvalidName(NameError::Empty);
        assert_eq!(err.kind(), ErrorKind::Validation);
        assert_eq!(err.to_string(), "name is empty");
    }

    #[test]
    fn institution_required_is_validation() {
        let err = DomainError::InstitutionRequired(Role::Teacher);
        assert_eq!(err.kind(), ErrorKind::Validation);
        assert!(err
            .to_string()
            .contains("institution_id is required for role"));
    }

    #[test]
    fn terms_not_accepted_is_validation() {
        let err = DomainError::TermsNotAccepted;
        assert_eq!(err.kind(), ErrorKind::Validation);
        assert_eq!(err.to_string(), "terms must be accepted");
    }

    #[test]
    fn not_found_maps_to_not_found() {
        assert_eq!(DomainError::NotFound.kind(), ErrorKind::NotFound);
        assert_eq!(DomainError::NotFound.to_string(), "not found");
    }

    #[test]
    fn rate_limited_maps_to_rate_limited() {
        assert_eq!(DomainError::RateLimited.kind(), ErrorKind::RateLimited);
    }

    #[test]
    fn internal_can_be_constructed_from_string() {
        let err = DomainError::internal_msg("something went wrong");
        assert_eq!(err.kind(), ErrorKind::Internal);
        assert!(err.to_string().contains("internal domain error"));
    }

    #[test]
    fn internal_maps_to_internal() {
        let err = DomainError::internal_msg("boom");
        assert_eq!(err.kind(), ErrorKind::Internal);
    }

    #[test]
    fn invalid_session_token_is_validation() {
        assert_eq!(
            DomainError::InvalidSessionToken.kind(),
            ErrorKind::Validation
        );
    }

    #[test]
    fn authentication_required_is_authentication_required() {
        assert_eq!(
            DomainError::AuthenticationRequired.kind(),
            ErrorKind::AuthenticationRequired
        );
    }
}

#[cfg(test)]
mod http_metadata_tests {
    use super::*;
    use axum::http::StatusCode;

    #[test]
    fn not_found_has_correct_http_metadata() {
        let err = DomainError::NotFound;
        let meta = err.http_metadata();
        assert_eq!(meta.status_code, StatusCode::NOT_FOUND);
        assert_eq!(meta.error_code, "NOT_FOUND");
    }

    #[test]
    fn internal_error_sanitizes_message() {
        let err = DomainError::internal_msg("database exploded");
        let meta = err.http_metadata();
        assert_eq!(meta.status_code, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(meta.client_message, "Something went wrong");
        assert_eq!(meta.error_code, "INTERNAL_ERROR");
    }
}
