//! Tracing middleware for HTTP requests.

use base::RequestId;

/// Create a span for an incoming HTTP request
pub fn make_request_span(request_id: RequestId) -> tracing::Span {
    tracing::info_span!("http_request", request_id = %request_id)
}
