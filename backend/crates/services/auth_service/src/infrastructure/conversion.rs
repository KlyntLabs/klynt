//! Type conversions between auth_service types and legacy klynt-domain types.

use klynt_base::ctx::ExecutionContext;

/// Convert new execution context to legacy `Ctx`.
pub fn to_legacy_ctx(ctx: &ExecutionContext) -> klynt_base::ctx::Ctx {
    let actor_id = ctx.actor_id.map(klynt_common::util::UserId);
    klynt_base::ctx::Ctx {
        request_id: ctx.request.request_id.0,
        user_id: actor_id,
    }
}

/// Convert new `UserId` to legacy `UserId`.
pub fn to_legacy_user_id(user_id: klynt_common::util::UserId) -> klynt_common::util::UserId {
    klynt_common::util::UserId(user_id.inner())
}

/// Convert legacy `UserId` to new `UserId`.
pub fn from_legacy_user_id(user_id: klynt_common::util::UserId) -> klynt_common::util::UserId {
    klynt_common::util::UserId::from_uuid(user_id.0)
}

#[cfg(test)]
mod tests {
    use klynt_base::ctx::RequestContext;
    use klynt_common::util::UserId;

    use super::*;

    #[test]
    fn user_id_round_trips_through_legacy() {
        let original = UserId::new();
        let legacy = to_legacy_user_id(original);
        let roundtrip = from_legacy_user_id(legacy);
        assert_eq!(original, roundtrip);
    }

    #[test]
    fn ctx_preserves_request_id() {
        let request_id = klynt_base::ctx::RequestId::new();
        let ctx =
            ExecutionContext::new(klynt_base::ctx::RequestContext::with_request_id(request_id));
        let legacy = to_legacy_ctx(&ctx);
        assert_eq!(legacy.request_id, request_id.0);
        assert!(legacy.user_id.is_none());
    }

    #[test]
    fn ctx_maps_actor_to_user_id() {
        let user_id = UserId::new();
        let ctx = ExecutionContext::new(RequestContext::new())
            .with_actor(user_id.inner(), klynt_base::ctx::ActorType::User);
        let legacy = to_legacy_ctx(&ctx);
        assert_eq!(legacy.user_id, Some(to_legacy_user_id(user_id)));
    }
}
