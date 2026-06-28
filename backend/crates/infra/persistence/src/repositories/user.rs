use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use domain::{DomainError, Email, GlobalRole, User, UserId, UserRole, UserStatus};

/// PostgreSQL implementation of the user repository.
pub struct PgUserRepository {
    pool: PgPool,
}

impl PgUserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

#[derive(sqlx::FromRow)]
pub(crate) struct UserRow {
    id: Uuid,
    email: String,
    username: String,
    name: String,
    password_hash: String,
    status: String,
    email_verified_at: Option<DateTime<Utc>>,
    global_role: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    terms_accepted_at: DateTime<Utc>,
    terms_version: String,
    role: String,
    institution_id: Option<Uuid>,
    #[sqlx(default)]
    deleted_at: Option<DateTime<Utc>>,
}

impl UserRow {
    pub(crate) fn into_user(self) -> Result<User, DomainError> {
        let role: UserRole = self
            .role
            .parse()
            .map_err(|e| DomainError::internal_msg(format!("invalid role in database: {e:?}")))?;
        let status = DbUserStatus::parse(&self.status)
            .map_err(|e| DomainError::internal_msg(format!("invalid status in database: {e:?}")))?;
        let global_role = match self.global_role {
            Some(raw) => Some(raw.parse::<GlobalRole>().map_err(|e| {
                DomainError::internal_msg(format!("invalid global_role in database: {e:?}"))
            })?),
            None => None,
        };

        Ok(User {
            id: UserId(self.id),
            email: Email::parse(&self.email)?,
            username: self.username,
            full_name: if self.name.is_empty() {
                None
            } else {
                Some(self.name)
            },
            password_hash: self.password_hash,
            status: status_from_db(status),
            role,
            global_role,
            email_verified_at: self.email_verified_at,
            institution_id: self.institution_id,
            terms_accepted_at: self.terms_accepted_at,
            terms_version: self.terms_version,
            created_at: self.created_at,
            updated_at: self.updated_at,
            deleted_at: self.deleted_at,
        })
    }
}

/// Database-specific role mapping.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum DbRole {
    Student,
    Teacher,
    Admin,
}

impl DbRole {
    pub(crate) fn as_str(&self) -> &'static str {
        match self {
            DbRole::Student => "student",
            DbRole::Teacher => "teacher",
            DbRole::Admin => "admin",
        }
    }
}

/// Database-specific status mapping.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum DbUserStatus {
    PendingVerification,
    Active,
    Suspended,
}

impl DbUserStatus {
    pub(crate) fn parse(raw: &str) -> Result<Self, &'static str> {
        match raw.to_lowercase().as_str() {
            "pending_verification" => Ok(Self::PendingVerification),
            "active" => Ok(Self::Active),
            "suspended" => Ok(Self::Suspended),
            _ => Err("unknown status"),
        }
    }

    pub(crate) fn as_str(&self) -> &'static str {
        match self {
            DbUserStatus::PendingVerification => "pending_verification",
            DbUserStatus::Active => "active",
            DbUserStatus::Suspended => "suspended",
        }
    }
}

pub(crate) fn role_to_db(role: UserRole) -> DbRole {
    match role {
        UserRole::Student => DbRole::Student,
        UserRole::Instructor => DbRole::Teacher,
        UserRole::Admin => DbRole::Admin,
    }
}

pub(crate) fn status_to_db(status: UserStatus) -> DbUserStatus {
    match status {
        UserStatus::Active => DbUserStatus::Active,
        UserStatus::Inactive | UserStatus::Suspended => DbUserStatus::Suspended,
        UserStatus::Pending => DbUserStatus::PendingVerification,
    }
}

fn status_from_db(status: DbUserStatus) -> UserStatus {
    match status {
        DbUserStatus::Active => UserStatus::Active,
        DbUserStatus::PendingVerification => UserStatus::Pending,
        DbUserStatus::Suspended => UserStatus::Suspended,
    }
}

mod canonical;
