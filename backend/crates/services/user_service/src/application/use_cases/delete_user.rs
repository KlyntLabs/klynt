//! Delete user use case.

use klynt_base::ctx::ExecutionContext;
use klynt_common::util::UserId;

use crate::domain::UserExt;
use crate::error::UserError;
use crate::UserService;

pub(crate) async fn execute(
    service: &UserService,
    ctx: &ExecutionContext,
    user_id: UserId,
) -> Result<(), UserError> {
    let mut user = service
        .internal()
        .user_repository
        .find_by_id(ctx, user_id)
        .await?
        .ok_or(UserError::NotFound)?;

    let is_self_delete = ctx.actor_id == Some(user_id.inner());
    if is_self_delete && !service.config().allow_self_delete {
        return Err(UserError::SelfDeleteNotAllowed);
    }

    let now = service.internal().clock.now();
    user.delete(now)?;

    service
        .internal()
        .user_repository
        .delete(ctx, user_id)
        .await?;

    service
        .internal()
        .audit_logger
        .log_user_deleted(ctx, user_id)
        .await;

    Ok(())
}
