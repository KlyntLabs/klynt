//! Change password use case.

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

use crate::error::UserError;
use crate::UserService;

pub(crate) async fn execute(
    service: &UserService,
    ctx: &ExecutionContext,
    user_id: UserId,
    current_password: &str,
    new_password: &str,
) -> Result<(), UserError> {
    let mut user = service
        .internal()
        .user_repository
        .find_by_id(ctx, user_id)
        .await?
        .ok_or(UserError::NotFound)?;

    if user.is_deleted() {
        return Err(UserError::UserDeleted);
    }

    let password_valid = service
        .internal()
        .password_hasher
        .verify(current_password, &user.password_hash)
        .await?;

    if !password_valid {
        return Err(UserError::invalid_password());
    }

    let new_hash = service
        .internal()
        .password_hasher
        .hash(new_password)
        .await?;
    user.password_hash = new_hash;

    service
        .internal()
        .user_repository
        .update(ctx, &user)
        .await?;

    service
        .internal()
        .audit_logger
        .log_password_changed(ctx, user_id)
        .await;

    Ok(())
}
