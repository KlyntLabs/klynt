//! Delete user use case.

use base::ctx::ExecutionContext;
use domain::UserId;

use crate::core::UserExt;
use crate::error::UserError;
use crate::UserService;

pub(crate) async fn execute(
    service: &UserService,
    ctx: &ExecutionContext,
    user_id: UserId,
) -> Result<(), UserError> {
    let mut user = service
        .internal()
        .persistence_facade
        .user_repository
        .find_by_id(ctx, user_id)
        .await?
        .ok_or(UserError::NotFound)?;

    let is_self_delete = ctx.actor_id == Some(user_id.inner());
    if is_self_delete && !service.config().allow_self_delete {
        return Err(UserError::SelfDeleteNotAllowed);
    }

    let now = service.internal().infra_facade.clock.now();
    user.delete(now)?;

    service
        .internal()
        .persistence_facade
        .user_repository
        .delete(ctx, user_id)
        .await?;

    service
        .internal()
        .persistence_facade
        .audit_logger
        .log_user_deleted(ctx, user_id)
        .await;

    Ok(())
}
