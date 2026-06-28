//! Change password use case.

use base::ctx::ExecutionContext;
use base::ports::audit::PasswordChangeSnapshot;
use domain::UserId;

use crate::error::UserError;
use crate::UserService;

pub(crate) async fn execute(
    service: &UserService,
    ctx: &ExecutionContext,
    user_id: UserId,
    current_password: &str,
    new_password: &str,
) -> Result<(), UserError> {
    let user = service
        .internal()
        .persistence_facade
        .user_repository
        .find_by_id(ctx, user_id)
        .await?
        .ok_or(UserError::NotFound)?;

    if user.is_deleted() {
        return Err(UserError::UserDeleted);
    }

    let password_valid = service
        .internal()
        .infra_facade
        .password_hasher
        .verify(current_password, &user.password_hash)
        .await?;

    if !password_valid {
        return Err(UserError::invalid_password());
    }

    let new_hash = service
        .internal()
        .infra_facade
        .password_hasher
        .hash(new_password)
        .await?;

    service
        .internal()
        .persistence_facade
        .user_repository
        .update_password(ctx, user_id, new_hash)
        .await?;

    service
        .internal()
        .persistence_facade
        .audit_logger
        .log_password_changed(
            ctx,
            user_id,
            PasswordChangeSnapshot { changed: false },
            PasswordChangeSnapshot { changed: true },
        )
        .await;

    Ok(())
}
