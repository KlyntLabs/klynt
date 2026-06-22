//! Canonical [`base::ports::repository::UserRepository`] implementation
//! for [`PgUserRepository`].

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use uuid::Uuid;

use super::{role_to_db, status_to_db, PgUserRepository, UserRow};
use base::ctx::ExecutionContext;
use base::ports::repository::{RepositoryError, UserRepository};
use domain::{DomainError, Email, PaginationRequest, User, UserId, UserRole, UserStatus};

#[async_trait]
impl UserRepository for PgUserRepository {
    async fn find_by_email(
        &self,
        _ctx: &ExecutionContext,
        email: &Email,
    ) -> Result<Option<User>, RepositoryError> {
        let row: Option<UserRow> = sqlx::query_as(
            r#"
            SELECT
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, updated_at, terms_accepted_at, terms_version,
                role, institution_id
            FROM users
            WHERE email = $1
            "#,
        )
        .bind(email.as_str())
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| r.into_user()).transpose().map_err(map_error)
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        id: UserId,
    ) -> Result<Option<User>, RepositoryError> {
        let row: Option<UserRow> = sqlx::query_as(
            r#"
            SELECT
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, updated_at, terms_accepted_at, terms_version,
                role, institution_id,
                deleted_at
            FROM users
            WHERE id = $1
            "#,
        )
        .bind(id.0)
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| r.into_user()).transpose().map_err(map_error)
    }

    async fn create_pending_user(
        &self,
        _ctx: &ExecutionContext,
        full_name: String,
        email: Email,
        password_hash: String,
        role: UserRole,
        institution_id: Option<Uuid>,
    ) -> Result<UserId, RepositoryError> {
        let user_id = UserId::new();
        let now = Utc::now();
        let user = User {
            id: user_id,
            email,
            full_name: Some(full_name).filter(|n| !n.is_empty()),
            password_hash,
            status: UserStatus::Pending,
            role,
            global_role: None,
            email_verified_at: None,
            institution_id,
            terms_accepted_at: now,
            terms_version: "1.0".to_string(),
            created_at: now,
            updated_at: now,
            deleted_at: None,
        };

        let inserted = sqlx::query_scalar::<_, uuid::Uuid>(
            r#"
            INSERT INTO users (
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, updated_at, terms_accepted_at, terms_version,
                role, institution_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (email) DO NOTHING
            RETURNING id
            "#,
        )
        .bind(user.id.0)
        .bind(user.email.as_str())
        .bind(user.full_name.as_deref().unwrap_or(""))
        .bind(&user.password_hash)
        .bind(status_to_db(user.status).as_str())
        .bind(None::<DateTime<Utc>>)
        .bind(None::<String>)
        .bind(user.created_at)
        .bind(user.updated_at)
        .bind(user.terms_accepted_at)
        .bind(&user.terms_version)
        .bind(role_to_db(user.role).as_str())
        .bind(user.institution_id)
        .fetch_optional(&self.pool)
        .await?;

        if inserted.is_some() {
            Ok(user_id)
        } else {
            Err(RepositoryError::Conflict(format!(
                "email already registered: {}",
                user.email
            )))
        }
    }

    async fn activate_user(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET status = 'active', email_verified_at = NOW()
            WHERE id = $1
            "#,
        )
        .bind(user_id.0)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(RepositoryError::NotFound);
        }
        Ok(())
    }

    async fn update_password(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
        password_hash: String,
    ) -> Result<(), RepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET password_hash = $1
            WHERE id = $2
            "#,
        )
        .bind(&password_hash)
        .bind(user_id.0)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(RepositoryError::NotFound);
        }
        Ok(())
    }

    async fn update(&self, _ctx: &ExecutionContext, user: User) -> Result<User, RepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET
                name = $1,
                status = $2,
                role = $3,
                password_hash = $4,
                global_role = $5,
                email_verified_at = $6,
                institution_id = $7,
                terms_accepted_at = $8,
                terms_version = $9,
                updated_at = NOW()
            WHERE id = $10
            "#,
        )
        .bind(user.full_name.as_deref().unwrap_or(""))
        .bind(status_to_db(user.status).as_str())
        .bind(role_to_db(user.role).as_str())
        .bind(&user.password_hash)
        .bind(user.global_role.map(|r| r.as_str()))
        .bind(user.email_verified_at)
        .bind(user.institution_id)
        .bind(user.terms_accepted_at)
        .bind(&user.terms_version)
        .bind(user.id.0)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(RepositoryError::NotFound);
        }
        Ok(user)
    }

    async fn delete(
        &self,
        _ctx: &ExecutionContext,
        user_id: UserId,
    ) -> Result<(), RepositoryError> {
        let result = sqlx::query(
            r#"
            UPDATE users
            SET deleted_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(user_id.0)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(RepositoryError::NotFound);
        }
        Ok(())
    }

    async fn list(
        &self,
        _ctx: &ExecutionContext,
        pagination: PaginationRequest,
    ) -> Result<(Vec<User>, u64), RepositoryError> {
        let rows: Vec<UserRow> = sqlx::query_as(
            r#"
            SELECT
                id, email, name, password_hash,
                status, email_verified_at, global_role,
                created_at, updated_at, terms_accepted_at, terms_version,
                role, institution_id,
                deleted_at
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC, id DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(pagination.page_size as i64)
        .bind(pagination.offset() as i64)
        .fetch_all(&self.pool)
        .await?;

        let total: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM users
            WHERE deleted_at IS NULL
            "#,
        )
        .fetch_one(&self.pool)
        .await?;

        // Defensive: skip rows that cannot be mapped to the domain model. A
        // single corrupt row (e.g. an invalid role inserted out-of-band) should
        // not break the list endpoint for every caller.
        let mut users = Vec::with_capacity(rows.len());
        for row in rows {
            match row.into_user() {
                Ok(user) => users.push(user),
                Err(err) => {
                    tracing::warn!(error = %err, "skipping corrupt user row in list");
                }
            }
        }

        Ok((users, total as u64))
    }
}

/// Maps errors produced by [`UserRow::into_user`] into repository errors.
fn map_error(err: DomainError) -> RepositoryError {
    match err {
        DomainError::Conflict(msg) => RepositoryError::Conflict(msg),
        DomainError::Validation(msg) => RepositoryError::Validation(msg),
        DomainError::InvalidInput(msg) => RepositoryError::Validation(msg),
        e => RepositoryError::Internal(e.to_string()),
    }
}
