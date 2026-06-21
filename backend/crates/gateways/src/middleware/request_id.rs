//! Request ID middleware.

use axum::{extract::Request, middleware::Next, response::Response};
use klynt_core::ctx::RequestId;

const REQUEST_ID_HEADER: &str = "x-request-id";

/// Request ID middleware.
///
/// Generates a new request ID if the client did not provide one, stores it in
/// request extensions, and echoes it back on the response.
pub async fn request_id_middleware(mut request: Request, next: Next) -> Response {
    let request_id = extract_or_generate_request_id(&request);
    request.extensions_mut().insert(request_id);

    let mut response = next.run(request).await;

    response
        .headers_mut()
        .insert(REQUEST_ID_HEADER, request_id.to_string().parse().unwrap());

    response
}

fn extract_or_generate_request_id(request: &Request) -> RequestId {
    request
        .headers()
        .get(REQUEST_ID_HEADER)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse().ok())
        .unwrap_or_default()
}
