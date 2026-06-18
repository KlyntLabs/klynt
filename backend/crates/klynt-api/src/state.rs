use std::sync::Arc;

use klynt_application::request_gate::RequestGate;
use klynt_domain::config::AppConfig;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
    pub request_gate: Arc<RequestGate>,
}

impl AppState {
    pub fn new(config: AppConfig, request_gate: Arc<RequestGate>) -> Self {
        Self {
            config: Arc::new(config),
            request_gate,
        }
    }
}
