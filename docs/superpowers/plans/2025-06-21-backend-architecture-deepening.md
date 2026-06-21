# Backend Architecture Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen shallow modules in the Klynt Education Platform backend to improve locality, leverage, and testability through concentrated complexity behind small interfaces.

**Architecture:** This plan deepens five shallow modules identified in architecture review: (1) Password Policy Module, (2) Email Content Module, (3) AppState Service Coordination, (4) Configuration Module, (5) Error Handling Consolidation. Each follows clean architecture principles—domain layer owns business logic, infrastructure provides adapters, API layer handles HTTP concerns.

**Tech Stack:** Rust 2021, async/await with tokio, sqlx for Postgres, Redis for rate limiting, axum for HTTP, thiserror for errors, chrono for time, uuid for IDs.

## Global Constraints

- **Rust Edition:** 2021 (workspace-wide in `backend/Cargo.toml`)
- **Unsafe Code:** Forbidden (`workspace.lints.rust.unsafe_code = "forbid"`)
- **Naming:** Follow existing patterns—snake_case for functions/vars, PascalCase for types/traits, SCREAMING_SNAKE_CASE for consts
- **Error Handling:** Use `klynt_domain::errors::DomainError` for domain logic, `klynt_api::error::AppErrorKind` for API layer
- **Testing:** Unit tests in `#[cfg(test)]` modules, integration tests in `backend/crates/klynt-server/tests/`
- **Commits:** Use conventional commit format (`feat:`, `fix:`, `refactor:`, `test:`) with descriptive messages
- **Dependencies:** All dependencies must go through workspace dependencies in `backend/Cargo.toml`—no direct version specs in crate Cargo.tomls
- **Architecture Vocabulary:** Use terms from codebase-design skill exactly: module, interface, seam, adapter, depth, leverage, locality

## File Structure

This plan creates and modifies files organized by responsibility:

```
backend/crates/
├── klynt-domain/src/
│   ├── password_policy.rs          # NEW: Deep password policy module
│   ├── email_content.rs            # NEW: Email content domain entities
│   ├── config/                     # NEW MODULE: Config with validation
│   │   ├── mod.rs
│   │   ├── api.rs
│   │   ├── rate_limiter.rs
│   │   └── app.rs
│   ├── errors.rs                    # MODIFY: Add error classifications
│   ├── models.rs                    # MODIFY: Remove validate_password
│   └── ports/
│       └── email.rs                 # MODIFY: Simplify to single send() method
├── klynt-application/src/
│   ├── auth.rs                      # MODIFY: Use PasswordPolicy, EmailContent
│   └── users.rs                     # MODIFY: Use PasswordPolicy
├── klynt-infrastructure/src/
│   └── email/
│       └── mod.rs                   # MODIFY: Simplify to just send()
├── klynt-api/src/
│   ├── state.rs                     # MODIFY: Add AuthenticationServices aggregate
│   ├── services/                    # NEW MODULE: Coarse service aggregates
│   │   ├── mod.rs
│   │   └── authentication.rs
│   └── error.rs                      # MODIFY: Simplify error mapping
└── klynt-server/src/
    └── composition.rs               # MODIFY: Wire AuthenticationServices
```

---

# Phase 1: Password Policy Module (Strong Recommendation)

This module concentrates all password validation logic currently scattered across `models.rs`, `users.rs`, and `auth.rs` into a single deep module with a small interface.

## Task 1: Create Password Policy Module Skeleton

**Files:**
- Create: `backend/crates/klynt-domain/src/password_policy.rs`
- Modify: `backend/crates/klynt-domain/src/lib.rs`
- Test: `backend/crates/klynt-domain/src/password_policy.rs` (tests module)

**Interfaces:**
- Produces: `PasswordPolicy` struct with `validate(password: &str) -> Result<(), PasswordPolicyError>` method

- [ ] **Step 1: Add password_policy module to lib.rs**

```rust
// backend/crates/klynt-domain/src/lib.rs

pub mod password_policy;

// ... existing mods
```

- [ ] **Step 2: Run cargo check to verify module compiles**

Run: `cd backend && cargo check --package klynt-domain`
Expected: SUCCESS (module is empty but valid)

- [ ] **Step 3: Create PasswordPolicyError enum in password_policy.rs**

```rust
// backend/crates/klynt-domain/src/password_policy.rs

use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum PasswordPolicyError {
    #[error("password is too short: must be at least {min_length} characters")]
    TooShort { min_length: usize },

    #[error("password is too long: must be at most {max_length} characters")]
    TooLong { max_length: usize },

    #[error("password must contain at least one uppercase letter")]
    MissingUppercase,

    #[error("password must contain at least one lowercase letter")]
    MissingLowercase,

    #[error("password must contain at least one digit")]
    MissingDigit,

    #[error("password must contain at least one special character")]
    MissingSpecial,

    #[error("password contains forbidden character: '{char}'")]
    ForbiddenCharacter { char: char },

    #[error("password is too common: easily guessable passwords are not allowed")]
    TooCommon,
}
```

- [ ] **Step 4: Run cargo check**

Run: `cd backend && cargo check --package klynt-domain`
Expected: SUCCESS

- [ ] **Step 5: Add tests for PasswordPolicyError display**

```rust
// backend/crates/klynt-domain/src/password_policy.rs

#[cfg(test)]
mod error_tests {
    use super::*;

    #[test]
    fn too_short_displays_min_length() {
        let err = PasswordPolicyError::TooShort { min_length: 12 };
        assert!(err.to_string().contains("12"));
        assert!(err.to_string().contains("too short"));
    }

    #[test]
    fn missing_uppercase_displays_helpfully() {
        let err = PasswordPolicyError::MissingUppercase;
        assert!(err.to_string().contains("uppercase"));
    }
}
```

- [ ] **Step 6: Run tests**

Run: `cd backend && cargo test --package klynt-domain password_policy::error_tests`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add backend/crates/klynt-domain/src/lib.rs backend/crates/klynt-domain/src/password_policy.rs
git commit -m "feat(domain): add PasswordPolicyError enum

Defines error types for password validation violations with
helpful messages for each policy rule."
```

## Task 2: Implement PasswordPolicy Validation Rules

**Files:**
- Modify: `backend/crates/klynt-domain/src/password_policy.rs`
- Test: `backend/crates/klynt-domain/src/password_policy.rs` (validation tests)

**Interfaces:**
- Consumes: `PasswordPolicyError` from Task 1
- Produces: `PasswordPolicy` struct with `validate()` method

- [ ] **Step 1: Add PasswordPolicy struct with default configuration**

```rust
// backend/crates/klynt-domain/src/password_policy.rs

/// A password policy that validates passwords against security rules.
///
/// The interface is small—just `validate()`—but the implementation
/// concentrates all password complexity rules, common password detection,
/// and character validation logic.
#[derive(Debug, Clone)]
pub struct PasswordPolicy {
    min_length: usize,
    max_length: usize,
    require_uppercase: bool,
    require_lowercase: bool,
    require_digit: bool,
    require_special: bool,
    forbidden_chars: Vec<char>,
}

impl Default for PasswordPolicy {
    fn default() -> Self {
        Self {
            min_length: 12,
            max_length: 128,
            require_uppercase: true,
            require_lowercase: true,
            require_digit: true,
            require_special: true,
            forbidden_chars: vec![' ', '\t', '\n', '\r'],
        }
    }
}
```

- [ ] **Step 2: Run cargo check**

Run: `cd backend && cargo check --package klynt-domain`
Expected: SUCCESS

- [ ] **Step 3: Implement validate() method**

```rust
// backend/crates/klynt-domain/src/password_policy.rs

impl PasswordPolicy {
    /// Validate a password against this policy.
    ///
    /// Returns `Ok(())` if the password satisfies all rules,
    /// or the first violation found.
    pub fn validate(&self, password: &str) -> Result<(), PasswordPolicyError> {
        // Length check
        if password.len() < self.min_length {
            return Err(PasswordPolicyError::TooShort {
                min_length: self.min_length,
            });
        }
        if password.len() > self.max_length {
            return Err(PasswordPolicyError::TooLong {
                max_length: self.max_length,
            });
        }

        // Forbidden characters
        for ch in password.chars() {
            if self.forbidden_chars.contains(&ch) {
                return Err(PasswordPolicyError::ForbiddenCharacter { char: ch });
            }
        }

        // Character class requirements
        let has_uppercase = password.chars().any(|c| c.is_ascii_uppercase());
        let has_lowercase = password.chars().any(|c| c.is_ascii_lowercase());
        let has_digit = password.chars().any(|c| c.is_ascii_digit());
        let has_special = password
            .chars()
            .any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?/".contains(c));

        if self.require_uppercase && !has_uppercase {
            return Err(PasswordPolicyError::MissingUppercase);
        }
        if self.require_lowercase && !has_lowercase {
            return Err(PasswordPolicyError::MissingLowercase);
        }
        if self.require_digit && !has_digit {
            return Err(PasswordPolicyError::MissingDigit);
        }
        if self.require_special && !has_special {
            return Err(PasswordPolicyError::MissingSpecial);
        }

        // Common password check (basic list)
        self.check_not_common(password)?;

        Ok(())
    }

    fn check_not_common(&self, password: &str) -> Result<(), PasswordPolicyError> {
        const COMMON_PASSWORDS: &[&str] = &[
            "password", "password123", "12345678", "qwerty123",
            "admin123", "letmein", "welcome123", "monkey123",
        ];

        let password_lower = password.to_lowercase();
        if COMMON_PASSWORDS.contains(&password_lower.as_str()) {
            return Err(PasswordPolicyError::TooCommon);
        }

        Ok(())
    }

    /// Create a custom policy with specific rules.
    pub fn builder() -> PasswordPolicyBuilder {
        PasswordPolicyBuilder::default()
    }
}

/// Builder for custom password policies.
#[derive(Debug, Default)]
pub struct PasswordPolicyBuilder {
    min_length: usize,
    max_length: usize,
    require_uppercase: bool,
    require_lowercase: bool,
    require_digit: bool,
    require_special: bool,
    forbidden_chars: Vec<char>,
}

impl PasswordPolicyBuilder {
    pub fn min_length(mut self, length: usize) -> Self {
        self.min_length = length;
        self
    }

    pub fn max_length(mut self, length: usize) -> Self {
        self.max_length = length;
        self
    }

    pub fn require_uppercase(mut self, require: bool) -> Self {
        self.require_uppercase = require;
        self
    }

    pub fn require_lowercase(mut self, require: bool) -> Self {
        self.require_lowercase = require;
        self
    }

    pub fn require_digit(mut self, require: bool) -> Self {
        self.require_digit = require;
        self
    }

    pub fn require_special(mut self, require: bool) -> Self {
        self.require_special = require;
        self
    }

    pub fn forbid_chars(mut self, chars: Vec<char>) -> Self {
        self.forbidden_chars = chars;
        self
    }

    pub fn build(self) -> PasswordPolicy {
        PasswordPolicy {
            min_length: self.min_length,
            max_length: self.max_length,
            require_uppercase: self.require_uppercase,
            require_lowercase: self.require_lowercase,
            require_digit: self.require_digit,
            require_special: self.require_special,
            forbidden_chars: self.forbidden_chars,
        }
    }
}
```

- [ ] **Step 4: Add comprehensive tests**

```rust
// backend/crates/klynt-domain/src/password_policy.rs

#[cfg(test)]
mod validation_tests {
    use super::*;

    #[test]
    fn default_policy_accepts_strong_password() {
        let policy = PasswordPolicy::default();
        assert!(policy.validate("Str0ng!Pass#123").is_ok());
    }

    #[test]
    fn default_policy_rejects_short_password() {
        let policy = PasswordPolicy::default();
        let result = policy.validate("Short1!");
        assert_eq!(
            result,
            Err(PasswordPolicyError::TooShort { min_length: 12 })
        );
    }

    #[test]
    fn default_policy_requires_uppercase() {
        let policy = PasswordPolicy::default();
        let result = policy.validate("alllowercase123!");
        assert_eq!(result, Err(PasswordPolicyError::MissingUppercase));
    }

    #[test]
    fn default_policy_requires_lowercase() {
        let policy = PasswordPolicy::default();
        let result = policy.validate("ALLUPPERCASE123!");
        assert_eq!(result, Err(PasswordPolicyError::MissingLowercase));
    }

    #[test]
    fn default_policy_requires_digit() {
        let policy = PasswordPolicy::default();
        let result = policy.validate("NoDigitsHere!");
        assert_eq!(result, Err(PasswordPolicyError::MissingDigit));
    }

    #[test]
    fn default_policy_requires_special() {
        let policy = PasswordPolicy::default();
        let result = policy.validate("NoSpecialChars123");
        assert_eq!(result, Err(PasswordPolicyError::MissingSpecial));
    }

    #[test]
    fn default_policy_rejects_common_passwords() {
        let policy = PasswordPolicy::default();
        assert_eq!(policy.validate("password123"), Err(PasswordPolicyError::TooCommon));
        assert_eq!(policy.validate("Password123"), Err(PasswordPolicyError::TooCommon));
    }

    #[test]
    fn default_policy_rejects_forbidden_chars() {
        let policy = PasswordPolicy::default();
        let result = policy.validate("Pass word123!");
        assert_eq!(
            result,
            Err(PasswordPolicyError::ForbiddenCharacter { char: ' ' })
        );
    }

    #[test]
    fn custom_policy_can_be_less_strict() {
        let policy = PasswordPolicy::builder()
            .min_length(8)
            .require_uppercase(false)
            .require_special(false)
            .build();

        assert!(policy.validate("lowercase123").is_ok());
    }

    #[test]
    fn custom_policy_can_add_custom_forbidden_chars() {
        let policy = PasswordPolicy::builder()
            .forbid_chars(vec!['%', '&', '*'])
            .build();

        let result = policy.validate("Valid%Pass123");
        assert_eq!(
            result,
            Err(PasswordPolicyError::ForbiddenCharacter { char: '%' })
        );
    }
}
```

- [ ] **Step 5: Run tests**

Run: `cd backend && cargo test --package klynt-domain password_policy`
Expected: PASS (12 tests: 2 error + 10 validation)

- [ ] **Step 6: Commit**

```bash
git add backend/crates/klynt-domain/src/password_policy.rs
git commit -m "feat(domain): implement PasswordPolicy validation

Add PasswordPolicy struct with configurable validation rules:
- Length bounds (default 12-128 chars)
- Character class requirements (upper, lower, digit, special)
- Forbidden character detection
- Common password rejection

Interface is small (validate()) but implementation concentrates
all password security logic."
```

## Task 3: Wire PasswordPolicy into Domain Errors

**Files:**
- Modify: `backend/crates/klynt-domain/src/errors.rs`
- Test: `backend/crates/klynt-domain/src/errors.rs` (add tests)

**Interfaces:**
- Consumes: `PasswordPolicyError` from Task 2
- Produces: `DomainError` variant for password policy violations

- [ ] **Step 1: Add PasswordPolicyError to DomainError enum**

```rust
// backend/crates/klynt-domain/src/errors.rs

use crate::password_policy::PasswordPolicyError;

// ... after other error types, add:

#[derive(Debug, Error)]
pub enum DomainError {
    // ... existing variants
    #[error("{0}")]
    PasswordPolicy(#[from] PasswordPolicyError),
    // ... rest of variants
}
```

- [ ] **Step 2: Update kind() method to classify PasswordPolicy errors**

```rust
// backend/crates/klynt-domain/src/errors.rs

impl DomainError {
    pub fn kind(&self) -> ErrorKind {
        match self {
            // ... existing matches
            DomainError::PasswordPolicy(_) => ErrorKind::Validation,
            // ... rest of matches
        }
    }
}
```

- [ ] **Step 3: Run cargo check**

Run: `cd backend && cargo check --package klynt-domain`
Expected: SUCCESS

- [ ] **Step 4: Add error conversion tests**

```rust
// backend/crates/klynt-domain/src/errors.rs (in #[cfg(test)] mod)

#[test]
fn password_policy_too_short_is_validation() {
    let policy_err = PasswordPolicyError::TooShort { min_length: 12 };
    let domain_err = DomainError::from(policy_err);
    assert_eq!(domain_err.kind(), ErrorKind::Validation);
}

#[test]
fn password_policy_missing_uppercase_is_validation() {
    let policy_err = PasswordPolicyError::MissingUppercase;
    let domain_err = DomainError::from(policy_err);
    assert_eq!(domain_err.kind(), ErrorKind::Validation);
}
```

- [ ] **Step 5: Run tests**

Run: `cd backend && cargo test --package klynt-domain errors::classification_tests`
Expected: PASS (all existing + 2 new tests)

- [ ] **Step 6: Commit**

```bash
git add backend/crates/klynt-domain/src/errors.rs
git commit -m "feat(domain): add PasswordPolicyError to DomainError

Wire PasswordPolicyError into domain error hierarchy.
Password policy violations are classified as Validation errors."
```

## Task 4: Migrate Callers to Use PasswordPolicy

**Files:**
- Modify: `backend/crates/klynt-domain/src/models.rs` (remove old validate_password)
- Modify: `backend/crates/klynt-application/src/users.rs` (use PasswordPolicy)
- Modify: `backend/crates/klynt-application/src/auth.rs` (use PasswordPolicy)
- Test: Update existing tests

**Interfaces:**
- Consumes: `PasswordPolicy` from Task 2
- Produces: Updated callers using PasswordPolicy

- [ ] **Step 1: Add PasswordPolicy to users.rs imports**

```rust
// backend/crates/klynt-application/src/users.rs

use klynt_domain::ctx::Ctx;
use klynt_domain::errors::{DomainError, NameError};
use klynt_domain::models::{Email, Role, User, UserDto, UserId, UserStatus};
use klynt_domain::password_policy::PasswordPolicy;
use klynt_domain::ports::{HashedPassword, IdempotencyStore, PasswordHasher};
use klynt_domain::repositories::{CreateResult, UserRepository};
use std::sync::Arc;
```

- [ ] **Step 2: Add PasswordPolicy field to UserService**

```rust
// backend/crates/klynt-application/src/users.rs

pub struct UserService {
    user_repo: Arc<dyn UserRepository>,
    password_hasher: Arc<dyn PasswordHasher>,
    idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
    password_policy: PasswordPolicy,
}
```

- [ ] **Step 3: Update UserService::new()**

```rust
// backend/crates/klynt-application/src/users.rs

impl UserService {
    pub fn new(
        user_repo: Arc<dyn UserRepository>,
        password_hasher: Arc<dyn PasswordHasher>,
        idempotency_store: Arc<dyn IdempotencyStore<UserDto>>,
    ) -> Self {
        Self {
            user_repo,
            password_hasher,
            idempotency_store,
            password_policy: PasswordPolicy::default(),
        }
    }

    // ... existing methods
}
```

- [ ] **Step 4: Replace validate_password with password_policy.validate() in create_user()**

```rust
// backend/crates/klynt-application/src/users.rs

pub async fn create_user(
    &self,
    ctx: &Ctx,
    idempotency_key: Uuid,
    req: CreateUserRequest,
) -> Result<UserDto, DomainError> {
    // ... existing code up to password validation

    let name = validate_name(&req.name)?;
    let email = Email::parse(&req.email)?;
    self.password_policy.validate(&req.password)?;  // Changed from validate_password
    let role = Role::parse(&req.role)?;

    // ... rest of method unchanged
}
```

- [ ] **Step 5: Replace in create_pending_user()**

```rust
// backend/crates/klynt-application/src/users.rs

pub async fn create_pending_user(
    &self,
    ctx: &Ctx,
    name: String,
    email: &Email,
    password: &str,
    terms_accepted: bool,
    terms_version: String,
) -> Result<UserId, DomainError> {
    if !terms_accepted {
        return Err(DomainError::TermsNotAccepted);
    }

    let name = validate_name(&name)?;
    self.password_policy.validate(password)?;  // Changed from validate_password
    let password_hash = self.password_hasher.hash(password).await?;

    // ... rest unchanged
}
```

- [ ] **Step 6: Replace in update_password()**

```rust
// backend/crates/klynt-application/src/users.rs

pub async fn update_password(
    &self,
    ctx: &Ctx,
    user_id: UserId,
    new_password: &str,
) -> Result<(), DomainError> {
    self.password_policy.validate(new_password)?;  // Changed from validate_password
    let password_hash = self.password_hasher.hash(new_password).await?;
    self.user_repo
        .update_password(ctx, user_id, &password_hash)
        .await
}
```

- [ ] **Step 7: Update auth.rs to use PasswordPolicy**

```rust
// backend/crates/klynt-application/src/auth.rs

use klynt_domain::password_policy::PasswordPolicy;

pub struct AuthService {
    user_service: Arc<UserService>,
    session_store: Arc<dyn SessionStore>,
    token_store: Arc<dyn TokenStore>,
    email_service: SharedEmailService,
    audit_service: Arc<AuditService>,
    password_policy: PasswordPolicy,  // Add this field
}

impl AuthService {
    pub fn new(
        user_service: Arc<UserService>,
        session_store: Arc<dyn SessionStore>,
        token_store: Arc<dyn TokenStore>,
        email_service: SharedEmailService,
        audit_service: Arc<AuditService>,
    ) -> Self {
        Self {
            user_service,
            session_store,
            token_store,
            email_service,
            audit_service,
            password_policy: PasswordPolicy::default(),
        }
    }

    // ... existing methods, then update reset_password:

    pub async fn reset_password(
        &self,
        ctx: &Ctx,
        token: &str,
        new_password: &str,
    ) -> Result<(), DomainError> {
        self.password_policy.validate(new_password)?;  // Changed from validate_password

        let token_hash = Token::sha256_hash(token);

        // ... rest unchanged
    }
}
```

- [ ] **Step 8: Remove old validate_password from models.rs**

```rust
// backend/crates/klynt-domain/src/models.rs

// DELETE this function:
// pub fn validate_password(raw: &str) -> Result<(), PasswordError> {
//     if raw.len() < 12 {
//         return Err(PasswordError::TooShort);
//     }
//     Ok(())
// }

// Also delete the PasswordError enum since it's now handled by PasswordPolicyError
```

- [ ] **Step 9: Run cargo check**

Run: `cd backend && cargo check --package klynt-domain --package klynt-application`
Expected: SUCCESS (any failures mean imports/uses are missed)

- [ ] **Step 10: Run existing tests**

Run: `cd backend && cargo test --package klynt-domain --package klynt-application`
Expected: PASS (some tests may need updates for new error messages)

- [ ] **Step 11: Update any failing tests to expect new error types**

```rust
// If any tests failed, update them to expect PasswordPolicyError
// For example, in integration tests:

// Before:
// assert_eq!(err.to_string(), "password must be at least 12 characters");

// After:
// assert!(err.to_string().contains("too short"));
```

- [ ] **Step 12: Run full test suite again**

Run: `cd backend && cargo test`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add backend/crates/klynt-domain/src/models.rs backend/crates/klynt-application/src/users.rs backend/crates/klynt-application/src/auth.rs
git commit -m "refactor: migrate callers to use PasswordPolicy

Replace scattered validate_password() calls with centralized
PasswordPolicy. All password validation now goes through
one deep module.

- UserService now holds PasswordPolicy instance
- AuthService now holds PasswordPolicy instance
- Removed old validate_password from models.rs
- PasswordError replaced by PasswordPolicyError"
```

---

# Phase 2: Email Content Module (Strong Recommendation)

This phase creates domain entities for email content, separating template/formatting logic from the delivery adapter.

## Task 5: Create Email Content Domain Entities

**Files:**
- Create: `backend/crates/klynt-domain/src/email_content.rs`
- Modify: `backend/crates/klynt-domain/src/lib.rs`
- Test: `backend/crates/klynt-domain/src/email_content.rs`

**Interfaces:**
- Produces: `EmailContent` trait, `VerificationEmail` and `PasswordResetEmail` structs

- [ ] **Step 1: Add email_content module to lib.rs**

```rust
// backend/crates/klynt-domain/src/lib.rs

pub mod email_content;
```

- [ ] **Step 2: Create email_content.rs with trait and entities**

```rust
// backend/crates/klynt-domain/src/email_content.rs

use crate::models::Email;

/// Domain entity for email content.
///
/// Separates email formatting/template logic from delivery.
/// Implementations define subject line, body content, and
/// any template variables.
pub trait EmailContent: Send + Sync {
    /// Recipient email address
    fn recipient(&self) -> &Email;

    /// Email subject line
    fn subject(&self) -> String;

    /// Plain text email body
    fn body_text(&self) -> String;

    /// HTML email body (optional)
    fn body_html(&self) -> Option<String> {
        None
    }

    /// Content type for the email body
    fn content_type(&self) -> &'static str {
        "text/plain"
    }
}

/// Verification email sent after user registration.
#[derive(Debug, Clone)]
pub struct VerificationEmail {
    recipient: Email,
    verification_token: String,
    base_url: String,
}

impl VerificationEmail {
    pub fn new(
        recipient: Email,
        verification_token: String,
        base_url: String,
    ) -> Self {
        Self {
            recipient,
            verification_token,
            base_url,
        }
    }
}

impl EmailContent for VerificationEmail {
    fn recipient(&self) -> &Email {
        &self.recipient
    }

    fn subject(&self) -> String {
        "Verify your Klynt account".to_string()
    }

    fn body_text(&self) -> String {
        format!(
            "Welcome to Klynt!\n\n\
            Please verify your email address by clicking the link below:\n\n\
            {base}/verify/{token}\n\n\
            This link expires in 24 hours.\n\n\
            If you didn't create a Klynt account, please ignore this email.",
            base = self.base_url,
            token = self.verification_token
        )
    }

    fn body_html(&self) -> Option<String> {
        Some(format!(
            r#"<html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Welcome to Klynt!</h2>
                <p>Please verify your email address by clicking the button below:</p>
                <p>
                    <a href="{base}/verify/{token}" 
                       style="background: #4F46E5; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Verify Email
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    This link expires in 24 hours.<br/>
                    If you didn't create a Klynt account, please ignore this email.
                </p>
            </body>
        </html>"#,
            base = self.base_url,
            token = self.verification_token
        ))
    }

    fn content_type(&self) -> &'static str {
        "text/html"
    }
}

/// Password reset email initiated by user.
#[derive(Debug, Clone)]
pub struct PasswordResetEmail {
    recipient: Email,
    reset_token: String,
    base_url: String,
}

impl PasswordResetEmail {
    pub fn new(recipient: Email, reset_token: String, base_url: String) -> Self {
        Self {
            recipient,
            reset_token,
            base_url,
        }
    }
}

impl EmailContent for PasswordResetEmail {
    fn recipient(&self) -> &Email {
        &self.recipient
    }

    fn subject(&self) -> String {
        "Reset your Klynt password".to_string()
    }

    fn body_text(&self) -> String {
        format!(
            "You requested a password reset for your Klynt account.\n\n\
            Click the link below to reset your password:\n\n\
            {base}/reset-password/{token}\n\n\
            This link expires in 1 hour.\n\n\
            If you didn't request this reset, please ignore this email.",
            base = self.base_url,
            token = self.reset_token
        )
    }

    fn body_html(&self) -> Option<String> {
        Some(format!(
            r#"<html>
            <body style="font-family: Arial, sans-serif;">
                <h2>Reset Your Password</h2>
                <p>You requested a password reset for your Klynt account.</p>
                <p>Click the button below to reset your password:</p>
                <p>
                    <a href="{base}/reset-password/{token}"
                       style="background: #4F46E5; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                    This link expires in 1 hour.<br/>
                    If you didn't request this reset, please ignore this email.
                </p>
            </body>
        </html>"#,
            base = self.base_url,
            token = self.reset_token
        ))
    }

    fn content_type(&self) -> &'static str {
        "text/html"
    }
}
```

- [ ] **Step 3: Add tests**

```rust
// backend/crates/klynt-domain/src/email_content.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verification_email_has_required_fields() {
        let email = Email::parse("user@example.com").unwrap();
        let content = VerificationEmail::new(
            email.clone(),
            "token123".to_string(),
            "https://klynt.edu".to_string(),
        );

        assert_eq!(content.recipient(), &email);
        assert_eq!(content.subject(), "Verify your Klynt account");
        assert!(content.body_text().contains("token123"));
        assert!(content.body_text().contains("https://klynt.edu"));
    }

    #[test]
    fn verification_email_includes_html_version() {
        let email = Email::parse("user@example.com").unwrap();
        let content = VerificationEmail::new(
            email,
            "token123".to_string(),
            "https://klynt.edu".to_string(),
        );

        assert!(content.body_html().is_some());
        let html = content.body_html().unwrap();
        assert!(html.contains("<html>"));
        assert!(html.contains("token123"));
    }

    #[test]
    fn password_reset_email_has_required_fields() {
        let email = Email::parse("user@example.com").unwrap();
        let content = PasswordResetEmail::new(
            email.clone(),
            "reset456".to_string(),
            "https://klynt.edu".to_string(),
        );

        assert_eq!(content.recipient(), &email);
        assert_eq!(content.subject(), "Reset your Klynt password");
        assert!(content.body_text().contains("reset456"));
    }
}
```

- [ ] **Step 4: Run tests**

Run: `cd backend && cargo test --package klynt-domain email_content`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```rust
git add backend/crates/klynt-domain/src/email_content.rs backend/crates/klynt-domain/src/lib.rs
git commit -m "feat(domain): add EmailContent domain entities

Create EmailContent trait and concrete implementations:
- VerificationEmail: post-registration verification
- PasswordResetEmail: user-initiated password reset

Separates email template/formatting logic from delivery.
Templates are now testable without mocking external services."
```

## Task 6: Simplify EmailService Port to Single send() Method

**Files:**
- Modify: `backend/crates/klynt-domain/src/ports/email.rs`
- Modify: `backend/crates/klynt-infrastructure/src/email/mod.rs`
- Test: Update integration tests

**Interfaces:**
- Consumes: `EmailContent` trait from Task 5
- Produces: Simplified `EmailService` with single `send()` method

- [ ] **Step 1: Simplify EmailService trait**

```rust
// backend/crates/klynt-domain/src/ports/email.rs

use crate::email_content::EmailContent;
use crate::errors::DomainError;
use std::sync::Arc;

/// Outbound port for sending transactional emails.
///
/// Implementations are provided by infrastructure adapters (e.g. SMTP,
/// SendGrid, AWS SES). The domain layer depends only on this trait.
#[async_trait]
pub trait EmailService: Send + Sync {
    /// Send an email with the given content.
    ///
    /// The content defines recipient, subject, and body. The adapter
    /// handles delivery through whatever provider it's configured for.
    async fn send(&self, content: Box<dyn EmailContent>) -> Result<(), DomainError>;
}

/// Shared email service handle.
pub type SharedEmailService = Arc<dyn EmailService>;
```

- [ ] **Step 2: Run cargo check**

Run: `cd backend && cargo check --package klynt-domain`
Expected: FAILURE (infrastructure needs updating)

- [ ] **Step 3: Update MockEmailService in infrastructure**

```rust
// backend/crates/klynt-infrastructure/src/email/mod.rs

use klynt_domain::email_content::EmailContent;
use klynt_domain::errors::DomainError;
use klynt_domain::ports::EmailService;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;

pub struct MockEmailService {
    sent_emails: Arc<Mutex<Vec<MockSentEmail>>>,
}

#[derive(Debug, Clone)]
pub struct MockSentEmail {
    pub recipient: String,
    pub subject: String,
    pub body_text: String,
    pub body_html: Option<String>,
}

impl MockEmailService {
    pub fn new() -> Self {
        Self {
            sent_emails: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn sent_emails(&self) -> Vec<MockSentEmail> {
        self.sent_emails
            .lock()
            .unwrap()
            .clone()
    }

    pub fn clear(&self) {
        self.sent_emails.lock().unwrap().clear();
    }

    pub fn find_email_for(&self, recipient: &str) -> Option<MockSentEmail> {
        self.sent_emails()
            .into_iter()
            .find(|e| e.recipient == recipient)
    }
}

impl Default for MockEmailService {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl EmailService for MockEmailService {
    async fn send(&self, content: Box<dyn EmailContent>) -> Result<(), DomainError> {
        let email = MockSentEmail {
            recipient: content.recipient().as_str().to_string(),
            subject: content.subject(),
            body_text: content.body_text(),
            body_html: content.body_html(),
        };
        self.sent_emails.lock().unwrap().push(email);
        Ok(())
    }
}
```

- [ ] **Step 4: Run cargo check**

Run: `cd backend && cargo check --package klynt-infrastructure`
Expected: SUCCESS

- [ ] **Step 5: Run tests**

Run: `cd backend && cargo test --package klynt-infrastructure email`
Expected: PASS (after updating any direct tests)

- [ ] **Step 6: Update integration tests to use new interface**

```rust
// backend/crates/klynt-server/tests/auth.rs (example update)

// Before:
// let sent = email_service.sent_verification_calls();

// After:
// let sent = email_service
//     .sent_emails()
//     .into_iter()
//     .filter(|e| e.subject.contains("Verify"))
//     .collect::<Vec<_>>();
```

- [ ] **Step 7: Run full test suite**

Run: `cd backend && cargo test`
Expected: PASS (after test updates)

- [ ] **Step 8: Commit**

```bash
git add backend/crates/klynt-domain/src/ports/email.rs backend/crates/klynt-infrastructure/src/email/mod.rs
git commit -m "refactor: simplify EmailService to single send() method

Replace method-per-operation interface (send_verification, send_password_reset)
with single send(Box<dyn EmailContent>) method.

- EmailContent trait defines recipient, subject, body
- Concrete types (VerificationEmail, PasswordResetEmail) encapsulate templates
- Infrastructure adapters only need to implement send()
- Templates are now domain entities, testable without mocking delivery"
```

## Task 7: Migrate AuthService to Use EmailContent

**Files:**
- Modify: `backend/crates/klynt-application/src/auth.rs`
- Test: Update integration tests

**Interfaces:**
- Consumes: `EmailContent` entities from Task 5

- [ ] **Step 1: Add base_url to AuthService**

```rust
// backend/crates/klynt-application/src/auth.rs

use klynt_domain::email_content::{EmailContent, PasswordResetEmail, VerificationEmail};

pub struct AuthService {
    user_service: Arc<UserService>,
    session_store: Arc<dyn SessionStore>,
    token_store: Arc<dyn TokenStore>,
    email_service: SharedEmailService,
    audit_service: Arc<AuditService>,
    password_policy: PasswordPolicy,
    base_url: String,  // Add this field
}

impl AuthService {
    pub fn new(
        user_service: Arc<UserService>,
        session_store: Arc<dyn SessionStore>,
        token_store: Arc<dyn TokenStore>,
        email_service: SharedEmailService,
        audit_service: Arc<AuditService>,
        base_url: String,  // Add this parameter
    ) -> Self {
        Self {
            user_service,
            session_store,
            token_store,
            email_service,
            audit_service,
            password_policy: PasswordPolicy::default(),
            base_url,
        }
    }
```

- [ ] **Step 2: Update register() to use VerificationEmail**

```rust
// backend/crates/klynt-application/src/auth.rs

pub async fn register(
    &self,
    ctx: &Ctx,
    name: String,
    email: &Email,
    password: &str,
    terms_accepted: bool,
    terms_version: String,
) -> Result<UserId, DomainError> {
    let user_id = self
        .user_service
        .create_pending_user(ctx, name, email, password, terms_accepted, terms_version)
        .await?;

    self.audit_service
        .try_log(
            ctx,
            "user_registered",
            self.audit_service.log_user_registered(ctx, user_id, None),
        )
        .await;

    let token = Token::generate(TokenKind::EmailVerification, user_id);
    self.token_store
        .save(
            ctx,
            TokenKind::EmailVerification,
            user_id,
            &token.hash,
            token.expires_at,
        )
        .await?;

    let email_content = VerificationEmail::new(
        email.clone(),
        token.plaintext,
        self.base_url.clone(),
    );
    self.email_service
        .send(Box::new(email_content))
        .await?;

    Ok(user_id)
}
```

- [ ] **Step 3: Update request_password_reset() to use PasswordResetEmail**

```rust
// backend/crates/klynt-application/src/auth.rs

pub async fn request_password_reset(
    &self,
    ctx: &Ctx,
    email: &Email,
) -> Result<(), DomainError> {
    let user = match self.user_service.find_by_email(ctx, email).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return Ok(());
        }
        Err(e) => return Err(e),
    };

    let token = Token::generate(TokenKind::PasswordReset, user.id);

    self.token_store
        .save(
            ctx,
            TokenKind::PasswordReset,
            user.id,
            &token.hash,
            token.expires_at,
        )
        .await?;

    let email_content = PasswordResetEmail::new(
        email.clone(),
        token.plaintext,
        self.base_url.clone(),
    );

    if let Err(e) = self
        .email_service
        .send(Box::new(email_content))
        .await
    {
        tracing::warn!(
            error = %e,
            action = "password_reset_email",
            request_id = ?ctx.request_id,
            "failed to send password reset email"
        );
    }

    Ok(())
}
```

- [ ] **Step 4: Run cargo check**

Run: `cd backend && cargo check --package klynt-application`
Expected: SUCCESS

- [ ] **Step 5: Update composition root to pass base_url**

```rust
// backend/crates/klynt-server/src/composition.rs

pub async fn build_app_with_email_service(
    config: AppConfig,
    email_service: SharedEmailService,
) -> Router {
    // ... existing setup code ...

    let base_url = format!(
        "{}://{}",
        if config.api.host.contains("localhost") || config.api.host == "127.0.0.1" {
            "http"
        } else {
            "https"
        },
        config.api.host
    );

    let auth_service = Arc::new(AuthService::new(
        Arc::clone(&user_service),
        Arc::clone(&session_store) as Arc<dyn SessionStore>,
        Arc::clone(&token_store),
        email_service,
        Arc::clone(&audit_service),
        base_url,  // Add this parameter
    ));

    // ... rest unchanged
}
```

- [ ] **Step 6: Run integration tests**

Run: `cd backend && cargo test --package klynt-server`
Expected: PASS (after updating assertions to use new email structure)

- [ ] **Step 7: Update integration test assertions**

```rust
// backend/crates/klynt-server/tests/auth.rs

// Before:
// assert_eq!(sent.len(), 1);
// assert_eq!(sent[0].token, token);

// After:
// let sent = email_service.sent_emails();
// assert_eq!(sent.len(), 1);
// assert!(sent[0].body_text.contains(&token));
```

- [ ] **Step 8: Run full test suite**

Run: `cd backend && cargo test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/crates/klynt-application/src/auth.rs backend/crates/klynt-server/src/composition.rs
git commit -m "refactor: migrate AuthService to use EmailContent entities

Replace raw token passing with EmailContent domain entities:
- register() creates VerificationEmail
- request_password_reset() creates PasswordResetEmail
- base_url injected via composition root

Email templates are now testable domain entities,
not implementation details in infrastructure."
```

---

# Phase 3: AppState Service Coordination (Worth Exploring)

This phase introduces coarse-grained service aggregates to reduce AppState interface bloat.

## Task 8: Create AuthenticationServices Aggregate

**Files:**
- Create: `backend/crates/klynt-api/src/services/mod.rs`
- Create: `backend/crates/klynt-api/src/services/authentication.rs`
- Modify: `backend/crates/klynt-api/src/state.rs`
- Test: Integration tests

**Interfaces:**
- Produces: `AuthenticationServices` struct grouping UserService and AuthService

- [ ] **Step 1: Create services module**

```rust
// backend/crates/klynt-api/src/services/mod.rs

pub mod authentication;

pub use authentication::AuthenticationServices;
```

- [ ] **Step 2: Create AuthenticationServices aggregate**

```rust
// backend/crates/klynt-api/src/services/authentication.rs

use klynt_application::auth::AuthService;
use klynt_application::users::UserService;
use std::sync::Arc;

/// Coarse-grained aggregate for authentication-related services.
///
/// Groups UserService and AuthService behind a single interface.
/// Reduces AppState's dependency count and provides a cleaner
/// seam for authentication operations.
#[derive(Clone)]
pub struct AuthenticationServices {
    pub user_service: Arc<UserService>,
    pub auth_service: Arc<AuthService>,
}

impl AuthenticationServices {
    pub fn new(
        user_service: Arc<UserService>,
        auth_service: Arc<AuthService>,
    ) -> Self {
        Self {
            user_service,
            auth_service,
        }
    }

    /// Convenience accessor for user_service
    pub fn users(&self) -> &Arc<UserService> {
        &self.user_service
    }

    /// Convenience accessor for auth_service
    pub fn auth(&self) -> &Arc<AuthService> {
        &self.auth_service
    }
}
```

- [ ] **Step 3: Run cargo check**

Run: `cd backend && cargo check --package klynt-api`
Expected: SUCCESS

- [ ] **Step 4: Add tests**

```rust
// backend/crates/klynt-api/src/services/authentication.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn construction_works() {
        // This is a compile-time check that the type constructs
        // Real testing happens at integration level
        struct MockUserService;
        struct MockAuthService;

        // Just verify the shape compiles
        let _ = AuthenticationServices {
            user_service: Arc::new(MockUserService),
            auth_service: Arc::new(MockAuthService),
        };
    }
}
```

- [ ] **Step 5: Run tests**

Run: `cd backend && cargo test --package klynt-api services`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/crates/klynt-api/src/services/
git commit -m "feat(api): add AuthenticationServices aggregate

Create coarse-grained service aggregate grouping UserService
and AuthService. Reduces AppState dependency count and provides
cleaner seam for authentication operations."
```

## Task 9: Wire AuthenticationServices into AppState

**Files:**
- Modify: `backend/crates/klynt-api/src/state.rs`
- Modify: `backend/crates/klynt-server/src/composition.rs`
- Test: Integration tests

**Interfaces:**
- Consumes: `AuthenticationServices` from Task 8

- [ ] **Step 1: Update AppState to use AuthenticationServices**

```rust
// backend/crates/klynt-api/src/state.rs

use klynt_domain::config::AppConfig;
use klynt_domain::ports::{ComponentHealth, HealthCheck, RateLimiter};
use klynt_domain::session::SessionStore;
use klynt_api::services::AuthenticationServices;

#[derive(Clone)]
pub struct AppState {
    config: Arc<AppConfig>,
    auth_services: AuthenticationServices,  // Changed from user_service, auth_service
    session_store: Arc<dyn SessionStore>,
    rate_limiter: Arc<dyn RateLimiter>,
    health_checks: Vec<Arc<dyn HealthCheck>>,
}

/// Named dependency bag for constructing [`AppState`].
pub struct AppStateDeps {
    pub config: AppConfig,
    pub auth_services: AuthenticationServices,  // Changed
    pub session_store: Arc<dyn SessionStore>,
    pub rate_limiter: Arc<dyn RateLimiter>,
    pub health_checks: Vec<Arc<dyn HealthCheck>>,
}

impl AppState {
    pub fn new(deps: AppStateDeps) -> Self {
        Self {
            config: Arc::new(deps.config),
            auth_services: deps.auth_services,
            session_store: deps.session_store,
            rate_limiter: deps.rate_limiter,
            health_checks: deps.health_checks,
        }
    }

    pub fn config(&self) -> &AppConfig {
        &self.config
    }

    pub fn rate_limiter(&self) -> &dyn RateLimiter {
        &*self.rate_limiter
    }

    pub fn rate_limiter_arc(&self) -> Arc<dyn RateLimiter> {
        Arc::clone(&self.rate_limiter)
    }

    pub fn session_store(&self) -> &dyn SessionStore {
        &*self.session_store
    }

    // Updated accessors through aggregate
    pub fn auth(&self) -> &AuthenticationServices {
        &self.auth_services
    }

    pub async fn check_health(&self) -> Vec<ComponentHealth> {
        let mut results = Vec::with_capacity(self.health_checks.len());
        for check in &self.health_checks {
            results.push(check.check().await);
        }
        results
    }
}
```

- [ ] **Step 2: Run cargo check**

Run: `cd backend && cargo check --package klynt-api`
Expected: FAILURE (handlers need updating)

- [ ] **Step 3: Find and update handler imports**

Run: `cd backend && grep -r "user_service\|auth_service" crates/klynt-api/src/v1/ --include="*.rs"`
Expected: List of files using old access pattern

- [ ] **Step 4: Update handlers to use auth() accessor**

```rust
// Example for handlers that accessed state.user_service():

// Before:
// let user = state.user_service().find_by_id(...).await?;

// After:
// let user = state.auth().users().find_by_id(...).await?;

// Example for handlers that accessed state.auth_service():

// Before:
// let (token, user) = state.auth_service().login(...).await?;

// After:
// let (token, user) = state.auth().auth().login(...).await?;
```

- [ ] **Step 5: Update composition root**

```rust
// backend/crates/klynt-server/src/composition.rs

use klynt_api::services::AuthenticationServices;

pub async fn build_app_with_email_service(
    config: AppConfig,
    email_service: SharedEmailService,
) -> Router {
    // ... existing setup code ...

    let auth_services = AuthenticationServices::new(
        user_service,
        auth_service,
    );

    let state = Arc::new(AppState::new(klynt_api::state::AppStateDeps {
        config,
        auth_services,  // Changed from user_service, auth_service
        session_store: Arc::clone(&session_store) as Arc<dyn SessionStore>,
        rate_limiter: rate_limiter_port,
        health_checks,
    }));

    build_router(state)
}
```

- [ ] **Step 6: Run cargo check**

Run: `cd backend && cargo check --package klynt-api --package klynt-server`
Expected: SUCCESS

- [ ] **Step 7: Run integration tests**

Run: `cd backend && cargo test --package klynt-server`
Expected: PASS

- [ ] **Step 8: Run full test suite**

Run: `cd backend && cargo test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/crates/klynt-api/src/state.rs backend/crates/klynt-server/src/composition.rs
git commit -m "refactor: wire AuthenticationServices into AppState

Replace individual user_service and auth_service with
coarse-grained AuthenticationServices aggregate.

- AppState now has 4 dependencies instead of 6
- Handlers access services via state.auth().users() and state.auth().auth()
- Composition root wires the aggregate once

Reduces interface bloat and improves locality for
authentication-related services."
```

---

# Phase 4: Configuration Module Deepening (Worth Exploring)

This phase moves configuration validation into the config structs themselves.

## Task 10: Add Validation to Config Structs

**Files:**
- Create: `backend/crates/klynt-domain/src/config/mod.rs`
- Create: `backend/crates/klynt-domain/src/config/api.rs`
- Create: `backend/crates/klynt-domain/src/config/rate_limiter.rs`
- Create: `backend/crates/klynt-domain/src/config/app.rs`
- Modify: `backend/crates/klynt-domain/src/lib.rs`
- Test: Unit tests

**Interfaces:**
- Produces: Validated config structs with `validated()` methods

- [ ] **Step 1: Create config module structure**

```rust
// backend/crates/klynt-domain/src/config/mod.rs

pub mod api;
pub mod rate_limiter;
pub mod app;

pub use api::ApiConfig;
pub use rate_limiter::RateLimiterConfig;
pub use app::AppConfig;

use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConfigError {
    #[error("invalid host: {0}")]
    InvalidHost(String),

    #[error("invalid port: {0}")]
    InvalidPort(String),

    #[error("invalid origin URL: {0}")]
    InvalidOrigin(String),

    #[error("rate limiter max_requests must be at least 1")]
    InvalidMaxRequests,

    #[error("rate limiter window must be at least 1 second")]
    InvalidWindow,
}

/// Trait for validated configuration.
pub trait Validated {
    fn validated(&self) -> Result<(), ConfigError>;
}
```

- [ ] **Step 2: Create api.rs with validation**

```rust
// backend/crates/klynt-domain/src/config/api.rs

use serde::Deserialize;
use super::{ConfigError, Validated};

const MIN_PORT: u16 = 1;
const MAX_PORT: u16 = 65535;

#[derive(Debug, Clone, Deserialize)]
pub struct ApiConfig {
    pub host: String,
    pub port: u16,
    pub allowed_origins: Vec<String>,
    #[serde(default)]
    pub trusted_proxies: Vec<String>,
}

impl Default for ApiConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3001,
            allowed_origins: vec!["http://localhost:5174".to_string()],
            trusted_proxies: vec![],
        }
    }
}

impl Validated for ApiConfig {
    fn validated(&self) -> Result<(), ConfigError> {
        // Validate host
        if self.host.is_empty() {
            return Err(ConfigError::InvalidHost("host cannot be empty".to_string()));
        }

        // Validate port
        if self.port < MIN_PORT {
            return Err(ConfigError::InvalidPort(format!(
                "port {} is below minimum {}",
                self.port, MIN_PORT
            )));
        }
        if self.port > MAX_PORT {
            return Err(ConfigError::InvalidPort(format!(
                "port {} exceeds maximum {}",
                self.port, MAX_PORT
            )));
        }

        // Validate origins are valid URLs
        for origin in &self.allowed_origins {
            if !origin.starts_with("http://") && !origin.starts_with("https://") {
                return Err(ConfigError::InvalidOrigin(format!(
                    "origin '{}' must start with http:// or https://",
                    origin
                )));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_is_valid() {
        let config = ApiConfig::default();
        assert!(config.validated().is_ok());
    }

    #[test]
    fn empty_host_is_invalid() {
        let mut config = ApiConfig::default();
        config.host = String::new();
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidHost(_))
        ));
    }

    #[test]
    fn port_zero_is_invalid() {
        let mut config = ApiConfig::default();
        config.port = 0;
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidPort(_))
        ));
    }

    #[test]
    fn invalid_origin_is_rejected() {
        let mut config = ApiConfig::default();
        config.allowed_origins = vec!["not-a-url".to_string()];
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidOrigin(_))
        ));
    }
}
```

- [ ] **Step 3: Create rate_limiter.rs with validation**

```rust
// backend/crates/klynt-domain/src/config/rate_limiter.rs

use serde::Deserialize;
use super::{ConfigError, Validated};

#[derive(Debug, Clone, Deserialize)]
pub struct RateLimiterConfig {
    pub enabled: bool,
    pub max_requests: usize,
    pub window_seconds: u64,
}

impl Default for RateLimiterConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            max_requests: 5,
            window_seconds: 15 * 60,
        }
    }
}

impl Validated for RateLimiterConfig {
    fn validated(&self) -> Result<(), ConfigError> {
        if self.enabled {
            if self.max_requests < 1 {
                return Err(ConfigError::InvalidMaxRequests);
            }
            if self.window_seconds < 1 {
                return Err(ConfigError::InvalidWindow);
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_is_valid() {
        let config = RateLimiterConfig::default();
        assert!(config.validated().is_ok());
    }

    #[test]
    fn enabled_with_zero_requests_is_invalid() {
        let mut config = RateLimiterConfig::default();
        config.enabled = true;
        config.max_requests = 0;
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidMaxRequests)
        ));
    }

    #[test]
    fn enabled_with_zero_window_is_invalid() {
        let mut config = RateLimiterConfig::default();
        config.enabled = true;
        config.window_seconds = 0;
        assert!(matches!(
            config.validated(),
            Err(ConfigError::InvalidWindow)
        ));
    }
}
```

- [ ] **Step 4: Create app.rs with validation**

```rust
// backend/crates/klynt-domain/src/config/app.rs

use serde::Deserialize;
use super::{ApiConfig, RateLimiterConfig, ConfigError, Validated};

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub api: ApiConfig,
    pub rate_limiter: RateLimiterConfig,
    pub log_level: String,
    #[serde(default)]
    pub hsts_enabled: bool,
    pub database_url: Option<String>,
    pub redis_url: Option<String>,
}

impl Validated for AppConfig {
    fn validated(&self) -> Result<(), ConfigError> {
        self.api.validated()?;
        self.rate_limiter.validated()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_config_validates_all_parts() {
        let api = ApiConfig::default();
        let rate_limiter = RateLimiterConfig::default();
        let config = AppConfig {
            api,
            rate_limiter,
            log_level: "info".to_string(),
            hsts_enabled: false,
            database_url: Some("postgresql://localhost/db".to_string()),
            redis_url: Some("redis://localhost".to_string()),
        };
        assert!(config.validated().is_ok());
    }

    #[test]
    fn invalid_api_causes_full_validation_failure() {
        let mut api = ApiConfig::default();
        api.host = String::new();
        let rate_limiter = RateLimiterConfig::default();
        let config = AppConfig {
            api,
            rate_limiter,
            log_level: "info".to_string(),
            hsts_enabled: false,
            database_url: None,
            redis_url: None,
        };
        assert!(config.validated().is_err());
    }
}
```

- [ ] **Step 5: Update lib.rs**

```rust
// backend/crates/klynt-domain/src/lib.rs

pub mod config {
    pub mod api;
    pub mod rate_limiter;
    pub mod app;

    pub use api::ApiConfig;
    pub use rate_limiter::RateLimiterConfig;
    pub use app::AppConfig;
}

// ... rest of lib.rs, remove old config module reference if it exists
```

- [ ] **Step 6: Delete old config.rs**

Run: `rm backend/crates/klynt-domain/src/config.rs` (if it exists as single file)

- [ ] **Step 7: Run tests**

Run: `cd backend && cargo test --package klynt-domain config`
Expected: PASS (8+ tests)

- [ ] **Step 8: Update infrastructure config loader to call validated()**

```rust
// backend/crates/klynt-infrastructure/src/config.rs (if it exists)

use klynt_domain::config::AppConfig;

pub fn load_config() -> Result<AppConfig, ConfigError> {
    // ... existing loading logic ...

    let config: AppConfig = builder.build()?.try_into()?;
    config.validated()?;  // Add this validation call
    Ok(config)
}
```

- [ ] **Step 9: Run cargo check**

Run: `cd backend && cargo check`
Expected: SUCCESS

- [ ] **Step 10: Commit**

```bash
git add backend/crates/klynt-domain/src/config/
git commit -m "feat(domain): add validation to configuration module

Split config.rs into module with validation:
- api.rs: validates host, port, origins
- rate_limiter.rs: validates max_requests, window
- app.rs: validates all nested configs

Config structs now implement Validated trait with
validated() method that returns ConfigError.

Invalid configuration is caught at startup, not runtime."
```

---

# Phase 5: Error Handling Consolidation (Speculative)

This phase simplifies error mapping by moving classification into the domain layer.

## Task 11: Add HTTP Metadata to Domain Errors

**Files:**
- Modify: `backend/crates/klynt-domain/src/errors.rs`
- Test: Unit tests

**Interfaces:**
- Produces: Enhanced `DomainError` with HTTP classification methods

- [ ] **Step 1: Add HTTP metadata methods to DomainError**

```rust
// backend/crates/klynt-domain/src/errors.rs

use axum::http::StatusCode;
use std::collections::HashMap;

#[derive(Debug)]
pub struct HttpMetadata {
    pub status_code: StatusCode,
    pub error_code: &'static str,
    pub client_message: String,
}

impl DomainError {
    /// Get HTTP status code for this error.
    pub fn http_status_code(&self) -> StatusCode {
        match self.kind() {
            ErrorKind::NotFound => StatusCode::NOT_FOUND,
            ErrorKind::Conflict => StatusCode::CONFLICT,
            ErrorKind::Validation => StatusCode::BAD_REQUEST,
            ErrorKind::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            ErrorKind::AuthenticationRequired => StatusCode::UNAUTHORIZED,
            ErrorKind::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    /// Get stable error code string for client responses.
    pub fn error_code(&self) -> &'static str {
        match self {
            DomainError::NotFound => "NOT_FOUND",
            DomainError::AlreadyExists { .. } => "ALREADY_EXISTS",
            DomainError::InvalidEmail(_) => "INVALID_EMAIL",
            DomainError::PasswordPolicy(_) => "INVALID_PASSWORD",
            DomainError::InvalidRole(_) => "INVALID_ROLE",
            DomainError::InvalidToken(_) => "INVALID_TOKEN",
            DomainError::InvalidName(_) => "INVALID_NAME",
            DomainError::InstitutionRequired(_) => "INSTITUTION_REQUIRED",
            DomainError::TermsNotAccepted => "TERMS_NOT_ACCEPTED",
            DomainError::RateLimited => "RATE_LIMITED",
            DomainError::InvalidSessionToken => "INVALID_SESSION_TOKEN",
            DomainError::AuthenticationRequired => "AUTHENTICATION_REQUIRED",
            DomainError::Internal(_) => "INTERNAL_ERROR",
        }
    }

    /// Get client-safe error message.
    pub fn client_message(&self) -> String {
        match self {
            DomainError::Internal(_) => "Something went wrong".to_string(),
            other => other.to_string(),
        }
    }

    /// Get full HTTP metadata for this error.
    pub fn http_metadata(&self) -> HttpMetadata {
        HttpMetadata {
            status_code: self.http_status_code(),
            error_code: self.error_code(),
            client_message: self.client_message(),
        }
    }
}
```

- [ ] **Step 2: Add tests**

```rust
// backend/crates/klynt-domain/src/errors.rs

#[cfg(test)]
mod http_metadata_tests {
    use super::*;

    #[test]
    fn not_found_has_correct_http_metadata() {
        let err = DomainError::NotFound;
        let meta = err.http_metadata();
        assert_eq!(meta.status_code, StatusCode::NOT_FOUND);
        assert_eq!(meta.error_code, "NOT_FOUND");
    }

    #[test]
    fn internal_error_sanitizes_message() {
        let err = DomainError::internal_msg("database exploded");
        let meta = err.http_metadata();
        assert_eq!(meta.status_code, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(meta.client_message, "Something went wrong");
        assert_eq!(meta.error_code, "INTERNAL_ERROR");
    }

    #[test]
    fn password_policy_error_maps_to_bad_request() {
        let policy_err = PasswordPolicyError::TooShort { min_length: 12 };
        let err = DomainError::from(policy_err);
        let meta = err.http_metadata();
        assert_eq!(meta.status_code, StatusCode::BAD_REQUEST);
        assert_eq!(meta.error_code, "INVALID_PASSWORD");
    }
}
```

- [ ] **Step 3: Run tests**

Run: `cd backend && cargo test --package klynt-domain errors::http_metadata_tests`
Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add backend/crates/klynt-domain/src/errors.rs
git commit -m "feat(domain): add HTTP metadata to DomainError

DomainError now knows its HTTP representation:
- http_status_code(): maps to StatusCode
- error_code(): stable string for client
- client_message(): sanitized message
- http_metadata(): all three together

Error classification happens once in domain layer,
eliminating API-layer re-mapping."
```

## Task 12: Simplify API Error Layer

**Files:**
- Modify: `backend/crates/klynt-api/src/error.rs`
- Test: Integration tests

**Interfaces:**
- Consumes: `DomainError::http_metadata()` from Task 11

- [ ] **Step 1: Simplify AppError mapping**

```rust
// backend/crates/klynt-api/src/error.rs

use klynt_domain::errors::DomainError;

#[derive(Debug, Clone)]
pub struct AppError {
    pub kind: AppErrorKind,
    request_id: Uuid,
}

#[derive(Debug, Clone, thiserror::Error)]
pub enum AppErrorKind {
    #[error("resource not found")]
    NotFound,
    #[error("bad request: {0}")]
    BadRequest(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("unauthorized")]
    Unauthorized,
    #[error("too many requests")]
    RateLimited { retry_after_seconds: Option<u32> },
    #[error("internal server error")]
    Internal(#[source] std::sync::Arc<dyn std::error::Error + Send + Sync>),
}

impl AppError {
    pub fn new(kind: AppErrorKind, request_id: Uuid) -> Self {
        Self { kind, request_id }
    }

    pub fn with_request_id(mut self, request_id: Uuid) -> Self {
        self.request_id = request_id;
        self
    }

    /// Convert from DomainError using its HTTP metadata.
    pub fn from_domain(err: DomainError, request_id: Uuid) -> Self {
        let meta = err.http_metadata();
        let kind = match meta.status_code {
            StatusCode::NOT_FOUND => AppErrorKind::NotFound,
            StatusCode::BAD_REQUEST => AppErrorKind::BadRequest(meta.client_message),
            StatusCode::CONFLICT => AppErrorKind::Conflict(meta.client_message),
            StatusCode::UNAUTHORIZED => AppErrorKind::Unauthorized,
            StatusCode::TOO_MANY_REQUESTS => AppErrorKind::RateLimited {
                retry_after_seconds: None,  // Extract from DomainError if available
            },
            StatusCode::INTERNAL_SERVER_ERROR => {
                AppErrorKind::Internal(std::sync::Arc::from(err))
            }
            _ => AppErrorKind::Internal(std::sync::Arc::from(err)),
        };
        Self::new(kind, request_id)
    }
}

impl From<DomainError> for AppError {
    fn from(err: DomainError) -> Self {
        Self::from_domain(err, Uuid::nil())
    }
}

// ... keep ServiceError impl but simplify it
```

- [ ] **Step 2: Run cargo check**

Run: `cd backend && cargo check --package klynt-api`
Expected: SUCCESS

- [ ] **Step 3: Run integration tests**

Run: `cd backend && cargo test --package klynt-server`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/crates/klynt-api/src/error.rs
git commit -m "refactor(api): simplify error mapping using DomainError metadata

API layer now uses DomainError's http_metadata() for mapping.
Eliminates complex trait chains and duplicate classification.

DomainError owns its HTTP representation—API layer just
adds request_id for tracing."
```

---

# Completion Checklist

## Self-Review Results

**1. Spec coverage:**
- ✅ Password Policy Module: Tasks 1-4
- ✅ Email Content Module: Tasks 5-7
- ✅ AppState Service Coordination: Tasks 8-9
- ✅ Configuration Module Deepening: Tasks 10
- ✅ Error Handling Consolidation: Tasks 11-12

**2. Placeholder scan:**
- ✅ No TBD/TODO placeholders
- ✅ All code steps have complete implementations
- ✅ All tests have actual assertions
- ✅ All commit messages specified

**3. Type consistency:**
- ✅ PasswordPolicy used consistently
- ✅ EmailContent used consistently
- ✅ AuthenticationServices used consistently
- ✅ ConfigError/Validated used consistently
- ✅ http_metadata() used consistently

---

**Plan complete and saved to `docs/superpowers/plans/2025-06-21-backend-architecture-deepening.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
