#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::ctx::ExecutionContext;
    use async_trait::async_trait;
    use chrono::Utc;
    use domain::{
        AppType, DesktopApp, Email, LayoutScope, PaginationRequest, User, UserId, UserRole,
        UserStatus,
    };
    use uuid::Uuid;

    #[test]
    fn test_user_repository_trait_exists() {
        // The trait is defined and object-safe: dyn UserRepository.
        let _repo: Box<dyn UserRepository> = Box::new(FakeUserRepo);
    }

    #[test]
    fn test_repository_error_display_messages() {
        // Validate the canonical error variants used by every repository method.
        // This mirrors the expected method outcomes without requiring an async
        // runtime; the async fake exercise below covers the actual signatures.
        let not_found = RepositoryError::NotFound.to_string();
        let conflict = RepositoryError::Conflict("users_email_key".to_string()).to_string();
        let validation = RepositoryError::Validation("fk".to_string()).to_string();
        let database = RepositoryError::Database("connection lost".to_string()).to_string();
        let internal = RepositoryError::Internal("oops".to_string()).to_string();

        assert_eq!(not_found, "User not found");
        assert_eq!(conflict, "User already exists (users_email_key)");
        assert_eq!(validation, "Validation error: fk");
        assert_eq!(database, "Database error: connection lost");
        assert_eq!(internal, "Internal error: oops");
    }

    #[test]
    fn test_sqlx_error_conversion() {
        // RowNotFound maps to NotFound.
        let err: RepositoryError = sqlx::Error::RowNotFound.into();
        assert!(matches!(err, RepositoryError::NotFound));

        // Unique violation maps to Conflict with the constraint name.
        let unique_err = sqlx::Error::Database(Box::new(FakeDbError {
            unique: true,
            foreign_key: false,
            constraint: Some("users_email_key"),
            message: "duplicate key value violates unique constraint",
        }));
        let err: RepositoryError = unique_err.into();
        assert!(matches!(
            err,
            RepositoryError::Conflict(ref c) if c == "users_email_key"
        ));

        // Foreign-key violation maps to Validation with the constraint name.
        let fk_err = sqlx::Error::Database(Box::new(FakeDbError {
            unique: false,
            foreign_key: true,
            constraint: Some("users_role_id_fkey"),
            message: "insert or update on table users violates foreign key constraint",
        }));
        let err: RepositoryError = fk_err.into();
        assert!(matches!(
            err,
            RepositoryError::Validation(ref c) if c == "users_role_id_fkey"
        ));

        // Other database errors fall back to Database.
        let other_err = sqlx::Error::Database(Box::new(FakeDbError {
            unique: false,
            foreign_key: false,
            constraint: None,
            message: "connection lost",
        }));
        let err: RepositoryError = other_err.into();
        assert!(matches!(
            err,
            RepositoryError::Database(ref m) if m.contains("connection lost")
        ));
    }

    /// Fake database error for exercising `From<sqlx::Error>` without a real DB.
    #[derive(Debug)]
    struct FakeDbError {
        unique: bool,
        foreign_key: bool,
        constraint: Option<&'static str>,
        message: &'static str,
    }

    impl std::fmt::Display for FakeDbError {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "{}", self.message)
        }
    }

    impl std::error::Error for FakeDbError {}

    impl sqlx::error::DatabaseError for FakeDbError {
        fn message(&self) -> &str {
            self.message
        }

        fn as_error(&self) -> &(dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn as_error_mut(&mut self) -> &mut (dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn into_error(self: Box<Self>) -> Box<dyn std::error::Error + Send + Sync + 'static> {
            self
        }

        fn kind(&self) -> sqlx::error::ErrorKind {
            sqlx::error::ErrorKind::Other
        }

        fn is_unique_violation(&self) -> bool {
            self.unique
        }

        fn is_foreign_key_violation(&self) -> bool {
            self.foreign_key
        }

        fn constraint(&self) -> Option<&str> {
            self.constraint
        }
    }

    /// A fake implementation for testing the trait itself.
    struct FakeUserRepo;

    #[async_trait]
    impl UserRepository for FakeUserRepo {
        async fn find_by_email(
            &self,
            _ctx: &ExecutionContext,
            _email: &Email,
        ) -> Result<Option<User>, RepositoryError> {
            Ok(None)
        }

        async fn find_by_id(
            &self,
            _ctx: &ExecutionContext,
            _user_id: UserId,
        ) -> Result<Option<User>, RepositoryError> {
            Ok(None)
        }

        async fn create_pending_user(
            &self,
            _ctx: &ExecutionContext,
            _full_name: String,
            _username: String,
            _email: Email,
            _password_hash: String,
            _role: UserRole,
            _institution_id: Option<Uuid>,
        ) -> Result<UserId, RepositoryError> {
            Ok(UserId::new())
        }

        async fn activate_user(
            &self,
            _ctx: &ExecutionContext,
            _user_id: UserId,
        ) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn update_password(
            &self,
            _ctx: &ExecutionContext,
            _user_id: UserId,
            _password_hash: String,
        ) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn update(
            &self,
            _ctx: &ExecutionContext,
            user: User,
        ) -> Result<User, RepositoryError> {
            Ok(user)
        }

        async fn delete(
            &self,
            _ctx: &ExecutionContext,
            _user_id: UserId,
        ) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn list(
            &self,
            _ctx: &ExecutionContext,
            _pagination: PaginationRequest,
        ) -> Result<(Vec<User>, u64), RepositoryError> {
            Ok((vec![], 0))
        }
    }

    #[test]
    fn test_user_repository_is_object_safe() {
        // Verify trait can be used as dyn UserRepository.
        let _repo: Box<dyn UserRepository> = Box::new(FakeUserRepo);
    }

    #[tokio::test]
    async fn test_fake_user_repo_methods_execute() {
        let ctx = ExecutionContext::new(crate::ctx::RequestContext::new());
        let repo = FakeUserRepo;
        let email = Email::parse("ada@example.com").expect("valid email");

        let found = repo
            .find_by_email(&ctx, &email)
            .await
            .expect("find_by_email");
        assert!(found.is_none());

        let user_id = repo
            .create_pending_user(
                &ctx,
                "Ada".to_string(),
                "ada".to_string(),
                email.clone(),
                "hash".to_string(),
                UserRole::Student,
                None,
            )
            .await
            .expect("create_pending_user");
        assert!(!user_id.to_string().is_empty());

        repo.activate_user(&ctx, user_id)
            .await
            .expect("activate_user");
        repo.update_password(&ctx, user_id, "new_hash".to_string())
            .await
            .expect("update_password");

        let found_by_id = repo.find_by_id(&ctx, user_id).await.expect("find_by_id");
        assert!(found_by_id.is_none());

        let now = Utc::now();
        let user = User {
            id: user_id,
            email,
            username: "ada".to_string(),
            full_name: Some("Ada".to_string()),
            password_hash: "hash".to_string(),
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
        let updated = repo.update(&ctx, user.clone()).await.expect("update");
        assert_eq!(updated.id, user.id);

        repo.delete(&ctx, user_id).await.expect("delete");

        let (users, total) = repo
            .list(&ctx, PaginationRequest::first())
            .await
            .expect("list");
        assert!(users.is_empty());
        assert_eq!(total, 0);
    }

    /// A minimal fake implementation for the desktop app repository.
    struct FakeDesktopAppRepo;

    #[async_trait]
    impl DesktopAppRepository for FakeDesktopAppRepo {
        #[allow(clippy::too_many_arguments)]
        async fn create_with_position(
            &self,
            _ctx: &ExecutionContext,
            app: &DesktopApp,
            _icon_tree_app_id: &str,
            _icon_tree_x: i32,
            _icon_tree_y: i32,
            _icon_tree_parent_id: Option<&str>,
            _scope: LayoutScope,
        ) -> domain::DomainResult<DesktopApp> {
            Ok(app.clone())
        }

        async fn list_visible(
            &self,
            _ctx: &ExecutionContext,
            _tenant_id: Uuid,
            _caller_id: Uuid,
        ) -> domain::DomainResult<Vec<DesktopApp>> {
            Ok(vec![])
        }

        async fn find_by_id(
            &self,
            _ctx: &ExecutionContext,
            _tenant_id: Uuid,
            _app_id: Uuid,
        ) -> domain::DomainResult<Option<DesktopApp>> {
            Ok(None)
        }

        async fn update(
            &self,
            _ctx: &ExecutionContext,
            app: &DesktopApp,
            _expected_etag: &str,
        ) -> domain::DomainResult<DesktopApp> {
            Ok(app.clone())
        }

        async fn delete(
            &self,
            _ctx: &ExecutionContext,
            _tenant_id: Uuid,
            _app_id: Uuid,
        ) -> domain::DomainResult<()> {
            Ok(())
        }
    }

    #[test]
    fn test_desktop_app_repository_trait_exists() {
        // The trait is defined and object-safe: dyn DesktopAppRepository.
        let _repo: Box<dyn DesktopAppRepository> = Box::new(FakeDesktopAppRepo);
    }

    #[tokio::test]
    async fn test_fake_desktop_app_repo_methods_execute() {
        let ctx = ExecutionContext::new(crate::ctx::RequestContext::new());
        let repo = FakeDesktopAppRepo;
        let tenant_id = Uuid::new_v4();
        let caller_id = Uuid::new_v4();
        let now = Utc::now();

        let app = DesktopApp {
            id: Uuid::new_v4(),
            tenant_id,
            app_type: AppType::Markdown,
            title: "Notes".to_string(),
            content: Default::default(),
            menu_config: Default::default(),
            owner_id: Some(Uuid::new_v4()),
            created_by: Uuid::new_v4(),
            locked: false,
            etag: "etag-1".to_string(),
            created_at: now,
            updated_at: now,
        };

        let created = repo
            .create_with_position(&ctx, &app, "icon-1", 10, 20, None, LayoutScope::Shared)
            .await
            .expect("create_with_position");
        assert_eq!(created.id, app.id);

        let visible = repo
            .list_visible(&ctx, tenant_id, caller_id)
            .await
            .expect("list_visible");
        assert!(visible.is_empty());

        let found = repo
            .find_by_id(&ctx, tenant_id, app.id)
            .await
            .expect("find_by_id");
        assert!(found.is_none());

        let updated = repo.update(&ctx, &app, "etag-1").await.expect("update");
        assert_eq!(updated.id, app.id);

        repo.delete(&ctx, tenant_id, app.id).await.expect("delete");
    }
}
