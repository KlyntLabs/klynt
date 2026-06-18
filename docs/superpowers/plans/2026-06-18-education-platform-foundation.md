# Education Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a production-grade monorepo foundation for an education platform with a Rust + Axum backend, React + Vite + TypeScript frontend, CI/CD, pre-commit hooks, and documentation.

**Architecture:** Root-level monorepo (`backend/`, `frontend/`, `docs/`, `.github/`) with a single Cargo crate using Clean Architecture modules and a Vite React SPA using feature-based folders. CI runs on `dev` and `main` only, with path-filtered backend/frontend jobs and a required aggregate status check.

**Tech Stack:** Rust 2021, Axum 0.7, Tokio, Tower-HTTP, Tracing, Config, Thiserror, Anyhow, Validator; React 18, Vite 6, TypeScript 5, React Router v7, TanStack Query v5, Tailwind CSS v4, shadcn/ui, Vitest, React Testing Library, MSW, Playwright; GitHub Actions; `just` task runner; Lefthook; ESLint 9 + Prettier.

---

## File Structure

```text
klynt-edu/
├── backend/
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── config.rs
│   │   ├── error.rs
│   │   ├── state.rs
│   │   ├── telemetry.rs
│   │   ├── startup.rs
│   │   ├── api/
│   │   │   ├── mod.rs
│   │   │   ├── extractors.rs
││   │   ├── middleware.rs
│   │   │   ├── responses.rs
│   │   │   └── v1/
│   │   │       ├── mod.rs
│   │   │       └── health.rs
│   │   ├── application/
│   │   │   └── mod.rs
│   │   ├── domain/
│   │   │   ├── mod.rs
│   │   │   ├── models.rs
│   │   │   └── repositories.rs
│   │   └── infrastructure/
│   │       ├── mod.rs
│   │       └── repositories/
│   │           └── mod.rs
│   └── tests/
│       ├── health_check.rs
│       └── helpers.rs
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── eslint.config.mjs
│   ├── prettier.config.mjs
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── env.d.ts
│   │   ├── index.css
│   │   ├── routes/
│   │   │   ├── index.tsx
│   │   │   └── route-paths.ts
│   │   ├── app/
│   │   │   ├── providers/
│   │   │   │   └── index.tsx
│   │   │   ├── layout/
│   │   │   │   └── root-layout.tsx
│   │   │   └── error-boundary/
│   │   │       └── index.tsx
│   │   ├── features/
│   │   │   └── auth/
│   │   │       ├── api/
│   │   │       │   └── types.ts
│   │   │       └── index.ts
│   │   ├── components/
│   │   │   └── ui/
│   │   │       └── button.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   ├── query-client.ts
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── types/
│   │   └── test/
│   │       ├── setup.ts
│   │       └── render.tsx
│   └── public/
├── docs/
│   ├── architecture/
│   │   └── OVERVIEW.md
│   ├── adr/
│   │   ├── ADR-001-rust-and-axum.md
│   │   ├── ADR-002-react-and-vite.md
│   │   ├── ADR-003-monorepo-structure.md
│   │   ├── ADR-004-ci-cd-strategy.md
│   │   └── ADR-005-pre-commit-and-dx.md
│   ├── ONBOARDING.md
│   ├── ARCHITECTURE.md
│   ├── CI_CD_GUIDE.md
│   └── SECURITY_BASELINE.md
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── audit.yml
│   │   ├── deploy-staging.yml
│   │   └── deploy-production.yml
│   ├── dependabot.yml
│   └── pull_request_template.md
├── scripts/
│   └── setup.sh
├── .vscode/
│   ├── extensions.json
│   └── settings.json
├── .editorconfig
├── .env.example
├── .gitignore
├── lefthook.yml
├── justfile
├── rust-toolchain.toml
├── .nvmrc
├── README.md
└── CONTRIBUTING.md
```

---

## Task List

### Phase 1: Root Repository & DX Foundation

#### Task 1: Create root DX files

**Files:**
- Create: `.editorconfig`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `justfile`
- Create: `lefthook.yml`
- Create: `rust-toolchain.toml`
- Create: `.nvmrc`
- Create: `.vscode/extensions.json`
- Create: `.vscode/settings.json`

**Steps:**

- [ ] **Step 1.1: Write `.editorconfig`**

```ini
root = true

[*]
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
charset = utf-8
indent_style = space
indent_size = 2

[*.rs]
indent_size = 4

[justfile]
indent_style = tab
```

- [ ] **Step 1.2: Write `.env.example`**

```bash
# Backend
RUST_LOG=debug
KLYNT_API_HOST=127.0.0.1
KLYNT_API_PORT=3000
KLYNT_API_ALLOWED_ORIGINS=http://localhost:5173

# Frontend
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Klynt
```

- [ ] **Step 1.3: Write `.gitignore`**

```gitignore
# Environment
.env
.env.local
.env.*.local
*.pem
*.key

# Rust
backend/target/
backend/Cargo.lock
!backend/Cargo.lock

# Node
frontend/node_modules/
frontend/dist/
frontend/coverage/
frontend/.vite/

# Logs
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.idea/
*.swp
*.swo

# Playwright
frontend/test-results/
frontend/playwright-report/
```

- [ ] **Step 1.4: Write `justfile`**

```just
set shell := ["bash", "-uc"]

# Show available commands
default:
    @just --list

# One-time setup for new contributors
setup:
    rustup component add rustfmt clippy
    cargo install cargo-watch
    cd frontend && npm install

# Copy environment template
env:
    cp .env.example .env

# Run backend + frontend together
dev:
    cd frontend && npx concurrently --names "api,web" --prefix-colors "cyan,yellow" \
        "cd ../backend && cargo watch -x run" \
        "npm run dev"

# Run backend only (hot reload)
dev-backend:
    cd backend && cargo watch -x run

# Run frontend only
dev-frontend:
    cd frontend && npm run dev

# Run all tests
test:
    cd backend && cargo test
    cd frontend && npm run test

# Format everything (mutating)
fmt:
    cd backend && cargo fmt --all
    cd frontend && npm run format

# Check formatting without mutating
fmt-check:
    cd backend && cargo fmt --all -- --check
    cd frontend && npm run format:check

# Run all linters
lint:
    cd backend && cargo clippy --all-targets --all-features -- -D warnings
    cd frontend && npm run lint

# Type-check frontend
typecheck:
    cd frontend && npm run typecheck

# Build production artifacts
build:
    cd frontend && npm run build
    cd backend && cargo build --release

# Run all fast checks (useful before pushing)
check:
    just fmt-check
    just lint
    just typecheck
```

- [ ] **Step 1.5: Write `lefthook.yml`**

```yaml
# Install: lefthook install
# Docs: https://lefthook.dev/configuration/

pre-commit:
  parallel: true
  commands:
    rustfmt:
      glob: "*.rs"
      run: cd backend && cargo fmt --all -- --check
    frontend-format-check:
      glob: "*.{js,ts,tsx,json,jsonc,css}"
      run: cd frontend && npm run format:check -- --no-errors-on-unmatched {staged_files}
    frontend-lint:
      glob: "*.{js,ts,tsx}"
      run: cd frontend && npm run lint -- --no-errors-on-unmatched {staged_files}

pre-push:
  commands:
    clippy:
      glob: "*.rs"
      run: cd backend && cargo clippy --all-targets --all-features -- -D warnings
    rust-tests:
      glob: "*.rs"
      run: cd backend && cargo test
    frontend-typecheck:
      glob: "*.{js,ts,tsx}"
      run: cd frontend && npm run typecheck
```

- [ ] **Step 1.6: Write `rust-toolchain.toml`**

```toml
[toolchain]
channel = "stable"
components = ["rustfmt", "clippy"]
profile = "default"
```

- [ ] **Step 1.7: Write `.nvmrc`**

```text
22
```

- [ ] **Step 1.8: Write `.vscode/extensions.json`**

```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "tamasfe.even-better-toml",
    "editorconfig.editorconfig"
  ]
}
```

- [ ] **Step 1.9: Write `.vscode/settings.json`**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "[toml]": {
    "editor.defaultFormatter": "tamasfe.even-better-toml"
  },
  "rust-analyzer.check.command": "clippy",
  "rust-analyzer.check.extraArgs": ["--", "-D", "warnings"],
  "eslint.workingDirectories": ["frontend"]
}
```

**Verification:** Run `just --list` and confirm all commands are listed.

---

### Phase 2: Rust Backend Scaffold

#### Task 2: Initialize Cargo project and dependencies

**Files:**
- Create: `backend/Cargo.toml`
- Create: `backend/rustfmt.toml`

**Steps:**

- [ ] **Step 2.1: Write `backend/Cargo.toml`**

```toml
[package]
name = "klynt-api"
version = "0.1.0"
edition = "2021"
authors = ["Klynt Engineering <engineering@klynt.edu>"]
license = "MIT OR Apache-2.0"

[dependencies]
axum = "0.7"
tokio = { version = "1", features = ["rt-multi-thread", "macros", "signal"] }
tower = { version = "0.5", features = ["util"] }
tower-http = { version = "0.6", features = ["cors", "trace", "timeout", "compression-gzip", "request-id", "sensitive-headers", "validate-request"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
config = "0.15"
dotenvy = "0.15"
thiserror = "2"
anyhow = "1"
validator = { version = "0.20", features = ["derive"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }

[dev-dependencies]
http-body-util = "0.1"
reqwest = { version = "0.12", features = ["json"] }
```

- [ ] **Step 2.2: Write `backend/rustfmt.toml`**

```toml
edition = "2021"
max_width = 100
```

**Verification:** Run `cd backend && cargo check` and confirm it compiles.

#### Task 3: Implement backend core modules

**Files:**
- Create: `backend/src/config.rs`
- Create: `backend/src/error.rs`
- Create: `backend/src/state.rs`
- Create: `backend/src/telemetry.rs`
- Create: `backend/src/startup.rs`
- Create: `backend/src/lib.rs`
- Create: `backend/src/main.rs`

**Steps:**

- [ ] **Step 3.1: Write `backend/src/config.rs`**

```rust
use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct ApiConfig {
    pub host: String,
    pub port: u16,
    pub allowed_origins: Vec<String>,
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3000,
            allowed_origins: vec!["http://localhost:5173".to_string()],
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub api: ApiConfig,
    pub log_level: String,
}

impl AppConfig {
    pub fn load() -> Result<Self, ConfigError> {
        let base_path = std::env::current_dir().expect("failed to determine current directory");
        let config_dir = base_path.join("config");

        let config = Config::builder()
            .add_source(File::from(config_dir.join("default")).required(false))
            .add_source(File::from(config_dir.join("local")).required(false))
            .add_source(
                Environment::with_prefix("KLYNT")
                    .prefix_separator("_")
                    .separator("__"),
            )
            .set_default("log_level", "info")?
            .build()?;

        config.try_deserialize()
    }
}
```

- [ ] **Step 3.2: Write `backend/src/error.rs`**

```rust
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use tracing::error;

#[derive(Debug, Serialize)]
pub struct ApiErrorBody {
    pub code: String,
    pub message: String,
}

impl ApiErrorBody {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("resource not found")]
    NotFound,
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error("unprocessable entity: {0}")]
    Validation(String),
    #[error("internal server error")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let request_id = ""; // populated via extension in production

        let (status, body) = match &self {
            AppError::NotFound => (
                StatusCode::NOT_FOUND,
                ApiErrorBody::new("not_found", self.to_string()),
            ),
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                ApiErrorBody::new("bad_request", msg.clone()),
            ),
            AppError::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ApiErrorBody::new("validation_error", msg.clone()),
            ),
            AppError::Internal(err) => {
                error!(error = ?err, request_id, "internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiErrorBody::new("internal_error", "something went wrong"),
                )
            }
        };

        (status, Json(body)).into_response()
    }
}
```

- [ ] **Step 3.3: Write `backend/src/state.rs`**

```rust
use crate::config::AppConfig;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<AppConfig>,
}

impl AppState {
    pub fn new(config: AppConfig) -> Self {
        Self {
            config: Arc::new(config),
        }
    }
}
```

- [ ] **Step 3.4: Write `backend/src/telemetry.rs`**

```rust
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

pub fn init_telemetry(log_level: &str) {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(log_level));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer().json())
        .init();
}
```

- [ ] **Step 3.5: Write `backend/src/startup.rs`**

```rust
use std::sync::Arc;
use std::time::Duration;

use axum::{
    http::{HeaderValue, Method},
    routing::get,
    Router,
};
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

use crate::api;
use crate::state::AppState;

pub fn build_router(state: Arc<AppState>) -> Router {
    let origins: Vec<HeaderValue> = state
        .config
        .api
        .allowed_origins
        .iter()
        .filter_map(|o| o.parse().ok())
        .collect();

    let cors = if origins.is_empty() {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers(Any)
    } else {
        CorsLayer::new()
            .allow_origin(origins)
            .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
            .allow_headers(Any)
    };

    Router::new()
        .nest("/api/v1", api::v1::router())
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .layer(cors)
        .with_state(state)
}
```

- [ ] **Step 3.6: Write `backend/src/lib.rs`**

```rust
pub mod api;
pub mod application;
pub mod config;
pub mod domain;
pub mod error;
pub mod infrastructure;
pub mod startup;
pub mod state;
pub mod telemetry;
```

- [ ] **Step 3.7: Write `backend/src/main.rs`**

```rust
use std::sync::Arc;

use axum::serve;
use klynt_api::{config::AppConfig, startup::build_router, state::AppState, telemetry};
use tokio::net::TcpListener;
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = AppConfig::load()?;
    telemetry::init_telemetry(&config.log_level);

    let state = Arc::new(AppState::new(config.clone()));
    let app = build_router(state);

    let addr = format!("{}:{}", config.api.host, config.api.port);
    let listener = TcpListener::bind(&addr).await?;

    info!("server listening on http://{}", addr);

    serve(listener, app).await?;
    Ok(())
}
```

**Verification:** Run `cd backend && cargo check`.

#### Task 4: Implement backend API layer

**Files:**
- Create: `backend/src/api/mod.rs`
- Create: `backend/src/api/responses.rs`
- Create: `backend/src/api/v1/mod.rs`
- Create: `backend/src/api/v1/health.rs`
- Create: `backend/src/application/mod.rs`
- Create: `backend/src/domain/mod.rs`
- Create: `backend/src/domain/models.rs`
- Create: `backend/src/domain/repositories.rs`
- Create: `backend/src/infrastructure/mod.rs`
- Create: `backend/src/infrastructure/repositories/mod.rs`

**Steps:**

- [ ] **Step 4.1: Write `backend/src/api/responses.rs`**

```rust
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub data: T,
}

impl<T> ApiResponse<T> {
    pub fn new(data: T) -> Self {
        Self { data }
    }
}
```

- [ ] **Step 4.2: Write `backend/src/api/mod.rs`**

```rust
pub mod responses;
pub mod v1;
```

- [ ] **Step 4.3: Write `backend/src/api/v1/health.rs`**

```rust
use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct HealthStatus {
    pub status: String,
    pub version: String,
}

pub async fn liveness() -> impl IntoResponse {
    let status = HealthStatus {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    (StatusCode::OK, Json(status))
}

pub async fn readiness() -> impl IntoResponse {
    // TODO: check database connectivity when database is added
    let status = HealthStatus {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    };
    (StatusCode::OK, Json(status))
}
```

- [ ] **Step 4.4: Write `backend/src/api/v1/mod.rs`**

```rust
use axum::{routing::get, Router};

pub mod health;

pub fn router() -> Router {
    Router::new()
        .route("/health/live", get(health::liveness))
        .route("/health/ready", get(health::readiness))
}
```

- [ ] **Step 4.5: Write placeholder modules**

`backend/src/application/mod.rs`: `// Application services will live here.`
`backend/src/domain/mod.rs`: `pub mod models; pub mod repositories;`
`backend/src/domain/models.rs`: `// Domain models will live here.`
`backend/src/domain/repositories.rs`: `// Repository traits will live here.`
`backend/src/infrastructure/mod.rs`: `pub mod repositories;`
`backend/src/infrastructure/repositories/mod.rs`: `// Repository implementations will live here.`

**Verification:** Run `cd backend && cargo check`.

#### Task 5: Implement backend integration tests

**Files:**
- Create: `backend/tests/helpers.rs`
- Create: `backend/tests/health_check.rs`

**Steps:**

- [ ] **Step 5.1: Write `backend/tests/helpers.rs`**

```rust
use axum::Router;
use klynt_api::{config::AppConfig, startup::build_router, state::AppState};
use std::sync::Arc;

pub fn test_config() -> AppConfig {
    AppConfig {
        api: klynt_api::config::ApiConfig {
            host: "127.0.0.1".to_string(),
            port: 0,
            allowed_origins: vec!["http://localhost:5173".to_string()],
        },
        log_level: "error".to_string(),
    }
}

pub fn test_app() -> Router {
    let config = test_config();
    let state = Arc::new(AppState::new(config));
    build_router(state)
}
```

- [ ] **Step 5.2: Write `backend/tests/health_check.rs`**

```rust
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use tower::ServiceExt;

mod helpers;

#[tokio::test]
async fn liveness_returns_ok() {
    let app = helpers::test_app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/health/live")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = response.into_body().collect().await.unwrap().to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(json["status"], "ok");
}

#[tokio::test]
async fn readiness_returns_ok() {
    let app = helpers::test_app();

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/v1/health/ready")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
```

**Verification:** Run `cd backend && cargo test`.

---

### Phase 3: React + Vite Frontend Scaffold

#### Task 6: Initialize Vite React TypeScript project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.app.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/env.d.ts`

**Steps:**

- [ ] **Step 6.1: Write `frontend/package.json`**

```json
{
  "name": "klynt-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "@tanstack/react-query": "^5.66.0",
    "@tanstack/react-query-devtools": "^5.66.0",
    "axios": "^1.7.9",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-error-boundary": "^4.1.2",
    "react-hook-form": "^7.54.2",
    "react-router-dom": "^7.1.5",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.19.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^22.13.1",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.19.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.18",
    "globals": "^15.14.0",
    "jsdom": "^26.0.0",
    "msw": "^2.7.0",
    "playwright": "^1.50.1",
    "postcss": "^8.5.2",
    "prettier": "^3.4.2",
    "tailwindcss": "^4.0.5",
    "typescript": "~5.7.3",
    "typescript-eslint": "^8.23.0",
    "vite": "^6.1.0",
    "vite-tsconfig-paths": "^5.1.4",
    "vitest": "^3.0.5"
  }
}
```

- [ ] **Step 6.2: Write `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Klynt Education Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6.3: Write `frontend/vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
  },
});
```

- [ ] **Step 6.4: Write TypeScript configs**

`frontend/tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`frontend/tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

`frontend/tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 6.5: Write `frontend/src/env.d.ts`**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 6.6: Write `frontend/src/main.tsx`**

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@/app/providers";
import { App } from "@/App";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>
);
```

- [ ] **Step 6.7: Write `frontend/src/App.tsx`**

```typescript
import { AppRoutes } from "@/routes";

export function App() {
  return <AppRoutes />;
}
```

- [ ] **Step 6.8: Write `frontend/src/index.css`**

```css
@tailwind import "tailwindcss";

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
```

**Verification:** Run `cd frontend && npm install && npm run typecheck`.

#### Task 7: Implement frontend architecture modules

**Files:**
- Create: `frontend/src/routes/index.tsx`
- Create: `frontend/src/routes/route-paths.ts`
- Create: `frontend/src/app/providers/index.tsx`
- Create: `frontend/src/app/layout/root-layout.tsx`
- Create: `frontend/src/app/error-boundary/index.tsx`
- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/lib/query-client.ts`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/features/auth/api/types.ts`
- Create: `frontend/src/features/auth/index.ts`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/test/render.tsx`

**Steps:**

- [ ] **Step 7.1: Write `frontend/src/routes/route-paths.ts`**

```typescript
export const routePaths = {
  home: "/",
  dashboard: "/dashboard",
  login: "/login",
} as const;
```

- [ ] **Step 7.2: Write `frontend/src/routes/index.tsx`**

```typescript
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RootLayout } from "@/app/layout/root-layout";
import { routePaths } from "@/routes/route-paths";

const router = createBrowserRouter([
  {
    path: routePaths.home,
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <div className="p-6">Welcome to Klynt</div>,
      },
      {
        path: routePaths.dashboard,
        element: <div className="p-6">Dashboard (coming soon)</div>,
      },
      {
        path: routePaths.login,
        element: <div className="p-6">Login (coming soon)</div>,
      },
    ],
  },
]);

export function AppRoutes() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 7.3: Write `frontend/src/app/providers/index.tsx`**

```typescript
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/query-client";
import { ErrorBoundary } from "@/app/error-boundary";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 7.4: Write `frontend/src/app/layout/root-layout.tsx`**

```typescript
import { Outlet, Link } from "react-router-dom";
import { routePaths } from "@/routes/route-paths";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <nav className="flex gap-4">
          <Link to={routePaths.home} className="font-semibold hover:underline">
            Klynt
          </Link>
          <Link to={routePaths.dashboard} className="hover:underline">
            Dashboard
          </Link>
          <Link to={routePaths.login} className="hover:underline">
            Login
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 7.5: Write `frontend/src/app/error-boundary/index.tsx`**

```typescript
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

function Fallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-6" role="alert">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <pre className="mt-2 text-sm text-red-600">{error.message}</pre>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
      >
        Try again
      </button>
    </div>
  );
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={Fallback}
      onError={(error) => {
        // TODO: send to error tracking service
        console.error("Uncaught error:", error);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
```

- [ ] **Step 7.6: Write `frontend/src/lib/api-client.ts`**

```typescript
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: global error handling (toast, logout on 401, etc.)
    return Promise.reject(error);
  }
);
```

- [ ] **Step 7.7: Write `frontend/src/lib/query-client.ts`**

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 7.8: Write `frontend/src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Wait — `clsx` and `tailwind-merge` are not in `package.json`. Add them or simplify. Simplify:

```typescript
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Step 7.9: Write `frontend/src/components/ui/button.tsx`**

```typescript
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "rounded px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        variant === "primary" && "bg-slate-900 text-white hover:bg-slate-800",
        variant === "secondary" && "border border-slate-300 hover:bg-slate-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 7.10: Write `frontend/src/features/auth/api/types.ts`**

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
```

- [ ] **Step 7.11: Write `frontend/src/features/auth/index.ts`**

```typescript
export * from "@/features/auth/api/types";
```

- [ ] **Step 7.12: Write `frontend/src/test/setup.ts`**

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 7.13: Write `frontend/src/test/render.tsx`**

```typescript
import { render as rtlRender } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { queryClient } from "@/lib/query-client";

export function render(ui: React.ReactElement) {
  return rtlRender(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}
```

**Verification:** Run `cd frontend && npm run typecheck`.

#### Task 8: Configure frontend linting, formatting, and testing

**Files:**
- Create: `frontend/eslint.config.mjs`
- Create: `frontend/prettier.config.mjs`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/App.test.tsx`

**Steps:**

- [ ] **Step 8.1: Write `frontend/eslint.config.mjs`**

```javascript
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "playwright-report", "test-results"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      prettier,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  }
);
```

- [ ] **Step 8.2: Write `frontend/prettier.config.mjs`**

```javascript
/** @type {import("prettier").Config} */
export default {
  semi: true,
  trailingComma: "es5",
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
};
```

- [ ] **Step 8.3: Write `frontend/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
```

- [ ] **Step 8.4: Write `frontend/playwright.config.ts`**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run preview",
    port: 5173,
  },
});
```

- [ ] **Step 8.5: Write `frontend/tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 8.6: Write `frontend/src/App.test.tsx`**

```typescript
import { screen } from "@testing-library/react";
import { App } from "@/App";
import { render } from "@/test/render";

describe("App", () => {
  it("renders the home page", () => {
    render(<App />);
    expect(screen.getByText("Welcome to Klynt")).toBeInTheDocument();
  });
});
```

**Verification:** Run `cd frontend && npm run lint && npm run typecheck && npm run test`.

---

### Phase 4: CI/CD, Pre-commit, and Documentation

#### Task 9: Create GitHub Actions workflows

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/audit.yml`
- Create: `.github/workflows/deploy-staging.yml`
- Create: `.github/workflows/deploy-production.yml`
- Create: `.github/dependabot.yml`
- Create: `.github/pull_request_template.md`

**Steps:**

- [ ] **Step 9.1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [dev, main]
  pull_request:
    branches: [dev, main]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  checks: write

env:
  CARGO_TERM_COLOR: always
  CARGO_INCREMENTAL: 0
  CARGO_PROFILE_TEST_DEBUG: 0

jobs:
  detect-changes:
    name: Detect changed paths
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
      frontend: ${{ steps.filter.outputs.frontend }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Filter paths
        uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            backend:
              - 'backend/**'
              - '.github/workflows/ci.yml'
              - '.github/workflows/audit.yml'
              - 'rust-toolchain.toml'
            frontend:
              - 'frontend/**'
              - '.github/workflows/ci.yml'
              - '.github/workflows/audit.yml'
              - '.nvmrc'

  backend-checks:
    name: Backend checks
    needs: detect-changes
    if: needs.detect-changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt, clippy

      - name: Cache Rust dependencies
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: ./backend

      - name: Check formatting
        run: cargo fmt --all -- --check

      - name: Run Clippy
        run: cargo clippy --locked --all-targets --all-features -- -D warnings

      - name: Run tests
        run: cargo test --locked --all-features

      - name: Build release binary
        run: cargo build --locked --release

  frontend-checks:
    name: Frontend checks
    needs: detect-changes
    if: needs.detect-changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: ../.nvmrc
          cache: npm
          cache-dependency-path: ./package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Check formatting
        run: npm run format:check

      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Run tests
        run: npm run test

      - name: Production build
        run: npm run build

  ci-status:
    name: CI status
    needs: [detect-changes, backend-checks, frontend-checks]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Report status
        run: |
          results=(
            "${{ needs.detect-changes.result }}"
            "${{ needs.backend-checks.result }}"
            "${{ needs.frontend-checks.result }}"
          )
          for result in "${results[@]}"; do
            if [[ "$result" == "failure" || "$result" == "cancelled" ]]; then
              echo "Required job failed or was cancelled: $result"
              exit 1
            fi
          done
          echo "All required checks passed or were skipped"
```

- [ ] **Step 9.2: Write `.github/workflows/audit.yml`**

```yaml
name: Security Audit

on:
  schedule:
    - cron: '0 9 * * 1'
  push:
    branches: [dev, main]
    paths:
      - '**/Cargo.lock'
      - '**/package-lock.json'
      - '.github/workflows/audit.yml'
  pull_request:
    branches: [dev, main]
    paths:
      - '**/Cargo.lock'
      - '**/package-lock.json'
      - '.github/workflows/audit.yml'
  workflow_dispatch:

permissions:
  contents: read
  checks: write

jobs:
  rust-audit:
    name: Rust dependency audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run cargo audit
        uses: rustsec/audit-check@v1.4.1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

  npm-audit:
    name: NPM dependency audit
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: ../.nvmrc
          cache: npm
          cache-dependency-path: ./package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=moderate
```

- [ ] **Step 9.3: Write deployment placeholders**

`deploy-staging.yml` triggered on `push` to `dev`.
`deploy-production.yml` triggered on `push` to `main`.

- [ ] **Step 9.4: Write `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: cargo
    directory: /backend
    schedule:
      interval: weekly
    open-pull-requests-limit: 5

  - package-ecosystem: npm
    directory: /frontend
    schedule:
      interval: weekly
    open-pull-requests-limit: 5

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
```

- [ ] **Step 9.5: Write `.github/pull_request_template.md`**

```markdown
## Summary

## Changes

## Security Checklist
- [ ] No secrets or credentials added
- [ ] New dependencies reviewed
- [ ] New environment variables documented in `.env.example`
- [ ] Input validation added for new endpoints/forms
```

**Verification:** Validate YAML syntax with `python -c 'import yaml; yaml.safe_load(open(".github/workflows/ci.yml"))'`.

#### Task 10: Create documentation

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `docs/ONBOARDING.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/CI_CD_GUIDE.md`
- Create: `docs/SECURITY_BASELINE.md`
- Create: `docs/architecture/OVERVIEW.md`
- Create: `docs/adr/ADR-001-rust-and-axum.md`
- Create: `docs/adr/ADR-002-react-and-vite.md`
- Create: `docs/adr/ADR-003-monorepo-structure.md`
- Create: `docs/adr/ADR-004-ci-cd-strategy.md`
- Create: `docs/adr/ADR-005-pre-commit-and-dx.md`

**Steps:**

- [ ] **Step 10.1: Write `README.md`**

```markdown
# Klynt Education Platform

A modern education platform built with Rust + Axum and React + Vite.

## Quick Start

```bash
git clone <repo-url> && cd klynt-edu
just setup
cp .env.example .env
just dev
```

Open http://localhost:5173 for the frontend and http://localhost:3000/api/v1/health/live for the backend health check.

## Commands

| Command | Description |
|---------|-------------|
| `just dev` | Run backend + frontend together |
| `just test` | Run all tests |
| `just fmt` | Format all code |
| `just lint` | Run all linters |
| `just check` | Run fast pre-push checks |
| `just build` | Build production artifacts |

## Documentation

- [Onboarding](docs/ONBOARDING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [CI/CD Guide](docs/CI_CD_GUIDE.md)
- [Security Baseline](docs/SECURITY_BASELINE.md)
- [ADRs](docs/adr/)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
```

- [ ] **Step 10.2: Write `CONTRIBUTING.md`**

```markdown
# Contributing to Klynt

## Development Workflow

1. Create a feature branch from `dev`.
2. Make your changes.
3. Run `just check` before pushing.
4. Open a pull request to `dev`.
5. After review, merge to `dev`.
6. Releases are promoted from `dev` to `main` via pull request.

## Code Standards

- Rust: `cargo fmt` and `cargo clippy -D warnings`
- TypeScript: `prettier` and `eslint` with type-aware rules
- All code must pass pre-commit hooks (`lefthook install`)
- All PRs must pass CI

## Branching

- `main`: production-ready code
- `dev`: integration branch
- `feature/*`, `fix/*`, `chore/*`: short-lived branches
```

- [ ] **Step 10.3: Write `docs/ONBOARDING.md`**

```markdown
# Onboarding

## Prerequisites

- Rust (latest stable) via rustup
- Node.js 22+ (use `.nvmrc`)
- `just`: `cargo install just`
- `lefthook`: `cargo install lefthook`

## Quick start

```bash
git clone <repo>
cd klynt-edu
just setup
cp .env.example .env
just dev
```

## Common commands

- `just dev` — full stack
- `just dev-backend` — backend only
- `just dev-frontend` — frontend only
- `just test` — all tests
- `just fmt` — fix formatting
- `just check` — pre-push checks

## Editor setup

Open in VS Code and install recommended extensions.

## Troubleshooting

- Port 3000/5173 in use? Edit `.env`.
- Lefthook not running? Run `lefthook install`.
```

- [ ] **Step 10.4: Write `docs/ARCHITECTURE.md`**

```markdown
# Architecture Overview

## Repository Layout

- `backend/` — Rust + Axum API
- `frontend/` — React + Vite SPA
- `docs/` — documentation and ADRs
- `.github/` — CI/CD workflows

## Backend

Single Cargo crate with Clean Architecture modules:

- `api/` — HTTP handlers, routing, middleware, responses
- `application/` — use cases and orchestration
- `domain/` — entities, value objects, repository traits
- `infrastructure/` — concrete implementations (DB, external services)

## Frontend

Feature-based Vite SPA:

- `routes/` — React Router route tree
- `app/` — providers, layouts, error boundaries
- `features/` — business domains
- `components/ui/` — design system primitives
- `lib/` — API client, query client, utilities

## Communication

Frontend proxies `/api/*` to the backend in development. In production, the same origin or explicit CORS origins are used.
```

- [ ] **Step 10.5: Write `docs/CI_CD_GUIDE.md`**

```markdown
# CI/CD Guide

## Workflows

- `ci.yml` — format, lint, test, build on `dev`/`main` and PRs
- `audit.yml` — weekly dependency audit
- `deploy-staging.yml` — placeholder for `dev` deployments
- `deploy-production.yml` — placeholder for `main` deployments

## Branch Protection

- `dev`: require PR + 1 approval + CI status
- `main`: require PR + 2 approvals + CI status + up-to-date branch

## Path Filtering

CI skips backend checks if only frontend files changed, and vice versa.
```

- [ ] **Step 10.6: Write `docs/SECURITY_BASELINE.md`**

Summarize the security subagent output (no secrets, audits, CORS, headers, input validation, safe errors, logging redaction, request IDs, auth seam, rate-limit scaffolding, HTTPS).

- [ ] **Step 10.7: Write ADRs**

Each ADR follows the template: status, date, context, decision, alternatives, consequences.

**Verification:** All docs render correctly as Markdown.

---

## Phase 5: Validation

### Task 11: Run all checks

**Steps:**

- [ ] **Step 11.1: Backend checks**
  - `cd backend && cargo fmt --all -- --check`
  - `cd backend && cargo clippy --all-targets --all-features -- -D warnings`
  - `cd backend && cargo test`
  - `cd backend && cargo build --release`

- [ ] **Step 11.2: Frontend checks**
  - `cd frontend && npm ci`
  - `cd frontend && npm run format:check`
  - `cd frontend && npm run lint`
  - `cd frontend && npm run typecheck`
  - `cd frontend && npm run test`
  - `cd frontend && npm run build`

- [ ] **Step 11.3: Full stack smoke test**
  - Start backend: `just dev-backend`
  - Start frontend: `just dev-frontend`
  - Visit http://localhost:5173 and confirm page loads
  - Visit http://localhost:3000/api/v1/health/live and confirm JSON response

### Task 12: Validation report

**Files:**
- Create: `docs/VALIDATION_REPORT.md`

Document what passed, what failed, why, and remaining work.
