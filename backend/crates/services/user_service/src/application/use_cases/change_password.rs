//! Change password use case.

use base::ctx::ExecutionContext;
use domain::UserId;
use serde_json::json;

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

    let before_json = json!({ "password_hash": user.password_hash });

    let new_hash = service
        .internal()
        .password_hasher
        .hash(new_password)
        .await?;

    service
        .internal()
        .user_repository
        .update_password(ctx, user_id, new_hash.clone())
        .await?;

    let after_json = json!({ "password_hash": new_hash });

    service
        .internal()
        .audit_logger
        .log_password_changed(ctx, user_id, before_json, after_json)
        .await;

    Ok(())
}
