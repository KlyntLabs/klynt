//! Helpers for creating execution contexts in tests.

use crate::ctx::{ExecutionContext, RequestContext};

/// Return a generic execution context for tests.
///
/// The context has a fresh request ID, no actor, and no metadata.
pub fn test_ctx() -> ExecutionContext {
    ExecutionContext::new(RequestContext::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ctx_has_request_id() {
        let ctx = test_ctx();
        assert!(!ctx.request.request_id.to_string().is_empty());
    }
}
