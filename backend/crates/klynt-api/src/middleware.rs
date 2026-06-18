use axum::{extract::Request, middleware::Next, response::Response};
use uuid::Uuid;

pub const REQUEST_ID_HEADER: &str = "x-request-id";

/// Request-scoped correlation identifier.
#[derive(Debug, Clone, Copy)]
pub struct RequestId(pub Uuid);

/// Ensures every request has a `RequestId` extension and that the ID is echoed
/// back in the response headers.
pub async fn propagate_request_id(mut request: Request, next: Next) -> Response {
    let request_id = request
        .headers()
        .get(REQUEST_ID_HEADER)
        .and_then(|value| value.to_str().ok())
        .and_then(|text| Uuid::parse_str(text).ok())
        .unwrap_or_else(Uuid::new_v4);

    request.extensions_mut().insert(RequestId(request_id));

    let mut response = next.run(request).await;
    if let Ok(value) = request_id.to_string().parse() {
        response.headers_mut().insert(REQUEST_ID_HEADER, value);
    }

    response
}
