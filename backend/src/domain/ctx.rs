use uuid::Uuid;

#[derive(Debug, Clone, Copy)]
pub struct Ctx {
    pub request_id: Uuid,
}

impl Ctx {
    pub fn new(request_id: Uuid) -> Self {
        Self { request_id }
    }
}
