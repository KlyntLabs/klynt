# klynt_contracts

Data transfer objects (DTOs) for service boundaries.

## Purpose

Defines request and response shapes for external and internal APIs:

- **Common**: `SuccessResponse`, `ErrorResponse`.
- **Auth**: `LoginRequest`, `LoginResponse`, `RegistrationRequest`,
  `RefreshTokenRequest`, `UserSessionInfo`.
- **User**: `UserDto`, `CreateUserRequest`, `UpdateUserRequest`.

All request types use `validator` derive macros for boundary validation.

## When to use it

Use `klynt_contracts` at HTTP handlers, message consumers, and any other
boundary where data enters or leaves a service.

## Example

```rust
use klynt_contracts::LoginRequest;
use validator::Validate;

let req = LoginRequest {
    email: "user@example.com".to_string(),
    password: "secure-password".to_string(),
    remember_me: Some(false),
};
req.validate().expect("valid request");
```
