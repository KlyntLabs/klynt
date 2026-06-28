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
        let row: Option<UserRow> = sqlx::query_as!(
            UserRow,
            r#"
            SELECT
                id, email, username, name, password_hash,
                status, email_verified_at, global_role,
                created_at, updated_at, terms_accepted_at, terms_version,
                role, institution_id,
                deleted_at
            FROM users
            WHERE email = $1 AND deleted_at IS NULL
            "#,
            email.as_str()
        )
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| r.into_user()).transpose().map_err(map_error)
    }

    async fn find_by_id(
        &self,
        _ctx: &ExecutionContext,
        id: UserId,
    ) -> Result<Option<User>, RepositoryError> {
        let row: Option<UserRow> = sqlx::query_as!(
            UserRow,
            r#"
            SELECT
                id, email, username, name, password_hash,
                status, email_verified_at, global_role,
                created_at, updated_at, terms_accepted_at, terms_version,
                role, institution_id,
                deleted_at
            FROM users
            WHERE id = $1
            "#,
            id.0
        )
        .fetch_optional(&self.pool)
        .await?;

        row.map(|r| r.into_user()).transpose().map_err(map_error)
    }

    async fn create_pending_user(
        &self,
        _ctx: &ExecutionContext,
        full_name: String,
        username: String,
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
            username: username.clone(),
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

        let inserted = sqlx::query_scalar!(
            r#"
            INSERT INTO users (
                id, email, username, name, password_hash,
                status, email_verified_at, global_role,
                created_at, updated_at, terms_accepted_at, terms_version,
                role, institution_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (email) DO NOTHING
            RETURNING id AS "id!"
            "#,
            user.id.0,
            user.email.as_str(),
            &user.username,
            user.full_name.as_deref().unwrap_or(""),
            &user.password_hash,
            status_to_db(user.status).as_str(),
            None::<DateTime<Utc>>,
            None::<String>,
            user.created_at,
            user.updated_at,
            user.terms_accepted_at,
            &user.terms_version,
            role_to_db(user.role).as_str(),
            user.institution_id
        )
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
        let result = sqlx::query!(
            r#"
            UPDATE users
            SET status = 'active', email_verified_at = NOW()
            WHERE id = $1
            "#,
            user_id.0
        )
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
        let result = sqlx::query!(
            r#"
            UPDATE users
            SET password_hash = $1
            WHERE id = $2
            "#,
            &password_hash,
            user_id.0
        )
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Err(RepositoryError::NotFound);
        }
        Ok(())
    }

    async fn update(&self, _ctx: &ExecutionContext, user: User) -> Result<User, RepositoryError> {
        let result = sqlx::query!(
            r#"
            UPDATE users
            SET
                username = $1,
                name = $2,
                status = $3,
                role = $4,
                password_hash = $5,
                global_role = $6,
                email_verified_at = $7,
                institution_id = $8,
                terms_accepted_at = $9,
                terms_version = $10,
                updated_at = NOW()
            WHERE id = $11
            "#,
            &user.username,
            user.full_name.as_deref().unwrap_or(""),
            status_to_db(user.status).as_str(),
            role_to_db(user.role).as_str(),
            &user.password_hash,
            user.global_role.map(|r| r.as_str()),
            user.email_verified_at,
            user.institution_id,
            user.terms_accepted_at,
            &user.terms_version,
            user.id.0
        )
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
        let result = sqlx::query!(
            r#"
            UPDATE users
            SET deleted_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            "#,
            user_id.0
        )
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
        let rows: Vec<UserRow> = sqlx::query_as!(
            UserRow,
            r#"
            SELECT
                id, email, username, name, password_hash,
                status, email_verified_at, global_role,
                created_at, updated_at, terms_accepted_at, terms_version,
                role, institution_id,
                deleted_at
            FROM users
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC, id DESC
            LIMIT $1 OFFSET $2
            "#,
            pagination.page_size as i64,
            pagination.offset() as i64
        )
        .fetch_all(&self.pool)
        .await?;

        let total: i64 = sqlx::query_scalar!(
            r#"
            SELECT COUNT(*) AS "count!"
            FROM users
            WHERE deleted_at IS NULL
            "#
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
