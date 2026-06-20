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
pub enum PasswordError {
    #[error("password must be at least 12 characters")]
    TooShort,
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
    #[error("token has already been used")]
    AlreadyUsed,
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
    WeakPassword(#[from] PasswordError),
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
            | DomainError::WeakPassword(_)
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
    fn weak_password_is_validation() {
        let err = DomainError::WeakPassword(PasswordError::TooShort);
        assert_eq!(err.kind(), ErrorKind::Validation);
        assert_eq!(err.to_string(), "password must be at least 12 characters");
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
