#[cfg(test)]
mod tests {
    use super::super::*;
    use crate::ctx::ExecutionContext;
    use async_trait::async_trait;
    use chrono::Utc;
    use klynt_common::domain::{Email, PaginationRequest, User, UserRole, UserStatus};
    use klynt_common::util::UserId;

    #[test]
    fn test_user_repository_trait_exists() {
        // The trait is defined and object-safe: dyn UserRepository.
        let _repo: Box<dyn UserRepository> = Box::new(FakeUserRepo);
    }

    #[test]
    fn test_user_repository_has_required_methods() {
        // Validate the canonical error variants used by every repository method.
        // This mirrors the expected method outcomes without requiring an async
        // runtime; the async fake exercise below covers the actual signatures.
        let not_found = RepositoryError::NotFound.to_string();
        let conflict = RepositoryError::Conflict("ada@example.com".to_string()).to_string();
        let validation = RepositoryError::Validation("fk".to_string()).to_string();
        let database = RepositoryError::Database("connection lost".to_string()).to_string();
        let internal = RepositoryError::Internal("oops".to_string()).to_string();

        assert_eq!(not_found, "User not found");
        assert_eq!(conflict, "User already exists with email: ada@example.com");
        assert_eq!(validation, "Validation error: fk");
        assert_eq!(database, "Database error: connection lost");
        assert_eq!(internal, "Internal error: oops");
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
            _email: Email,
            _password_hash: String,
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
            .create_pending_user(&ctx, "Ada".to_string(), email.clone(), "hash".to_string())
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

        let user = User {
            id: user_id,
            email,
            full_name: Some("Ada".to_string()),
            password_hash: "hash".to_string(),
            status: UserStatus::Active,
            role: UserRole::Student,
            created_at: Utc::now(),
            updated_at: None,
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
}
