use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::DomainError;
use klynt_domain::models::{Email, GlobalRole, Role, User, UserId, UserStatus};
use klynt_domain::ports::HashedPassword;
use klynt_domain::repositories::{CreateResult, UserRepository};
use klynt_domain::unit_of_work::{Transaction, UnitOfWork};

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
struct UserRow {
    id: Uuid,
    email: String,
    name: String,
    password_hash: String,
    status: String,
    email_verified_at: Option<DateTime<Utc>>,
    global_role: Option<String>,
    created_at: DateTime<Utc>,
    terms_accepted_at: DateTime<Utc>,
    terms_version: String,
    role: String,
    institution_id: Option<Uuid>,
}

impl UserRow {
    fn into_user(self) -> Result<User, DomainError> {
        let role = Role::parse(&self.role)
            .map_err(|e| DomainError::internal_msg(format!("invalid role in database: {e:?}")))?;
        let status = UserStatus::parse(&self.status)
            .map_err(|e| DomainError::internal_msg(format!("invalid status in database: {e:?}")))?;
        let global_role = self
            .global_role
            .map(|r| {
                GlobalRole::parse(&r).map_err(|e| {
                    DomainError::internal_msg(format!("invalid global_role in database: {e:?}"))
                })
            })
            .transpose()?;

        Ok(User {
            id: UserId(self.id),
            email: Email::parse(&self.email).map_err(|e| {
                DomainError::internal_msg(format!("invalid email in database: {e}"))
            })?,
            name: self.name,
            role,
            institution_id: self.institution_id,
            status,
            email_verified_at: self.email_verified_at,
            global_role,
            password_hash: self.password_hash,
            terms_accepted_at: self.terms_accepted_at,
            terms_version: self.terms_version,
            created_at: self.created_at,
        })
    }
}

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn create_if_not_exists(
        &self,
        _ctx: &Ctx,
        email: &Email,
        user: &User,
    ) -> Result<CreateResult, DomainError> {
        let inserted = sqlx::query_scalar::<_, Uuid>(
            r#"
            INSERT INTO users (
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                terms_accepted_at, terms_version,
                role, institution_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (email) DO NOTHING
            RETURNING id
            "#,
        )
        .bind(user.id.0)
        .bind(email.as_str())
        .bind(&user.name)
        .bind(&user.password_hash)
        .bind(user.status.as_str())
        .bind(user.email_verified_at)
        .bind(user.global_role.map(|r| r.as_str().to_string()))
        .bind(user.terms_accepted_at)
        .bind(&user.terms_version)
        .bind(user.role.as_str())
        .bind(user.institution_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if inserted.is_some() {
            return Ok(CreateResult::Created);
        }

        let existing = self
            .find_by_email(_ctx, email)
            .await?
            .ok_or_else(|| DomainError::internal_msg("conflict user disappeared"))?;
        Ok(CreateResult::AlreadyExists(existing))
    }

    async fn find_by_email(&self, _ctx: &Ctx, email: &Email) -> Result<Option<User>, DomainError> {
        let row: Option<UserRow> = sqlx::query_as(
            r#"
            SELECT
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, terms_accepted_at, terms_version,
                role, institution_id
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email.as_str())
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        row.map(|r| r.into_user()).transpose()
    }

    async fn find_by_id(&self, _ctx: &Ctx, id: UserId) -> Result<Option<User>, DomainError> {
        let row: Option<UserRow> = sqlx::query_as(
            r#"
            SELECT
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, terms_accepted_at, terms_version,
                role, institution_id
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(id.0)
        .fetch_optional(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        row.map(|r| r.into_user()).transpose()
    }

    async fn set_email_verified(&self, _ctx: &Ctx, user_id: UserId) -> Result<(), DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET status = 'active', email_verified_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(user_id.0)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound);
        }
        Ok(())
    }

    async fn update_password(
        &self,
        _ctx: &Ctx,
        user_id: UserId,
        password_hash: &HashedPassword,
    ) -> Result<(), DomainError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET password_hash = $1
            WHERE id = $2
            "#,
        )
        .bind(password_hash.as_str())
        .bind(user_id.0)
        .execute(&self.pool)
        .await
        .map_err(DomainError::internal)?;

        if result.rows_affected() == 0 {
            return Err(DomainError::NotFound);
        }
        Ok(())
    }
}

// Simple helper to serialize enums consistently with the database.

/// PostgreSQL unit of work.
///
/// Phase 1 uses a connection-pool wrapper with no-op commit/rollback. Full
/// transaction semantics can be added later when operations span multiple
/// repositories.
pub struct PgUnitOfWork {
    pool: PgPool,
}

impl PgUnitOfWork {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }
}

#[async_trait]
impl UnitOfWork for PgUnitOfWork {
    async fn begin(&self) -> Result<Box<dyn Transaction>, DomainError> {
        Ok(Box::new(PgTransaction {
            user_repo: PgUserRepository::new(self.pool.clone()),
        }))
    }
}

struct PgTransaction {
    user_repo: PgUserRepository,
}

#[async_trait]
impl Transaction for PgTransaction {
    fn users(&self) -> &dyn UserRepository {
        &self.user_repo
    }

    async fn commit(self: Box<Self>) -> Result<(), DomainError> {
        Ok(())
    }

    async fn rollback(self: Box<Self>) -> Result<(), DomainError> {
        Ok(())
    }
}
