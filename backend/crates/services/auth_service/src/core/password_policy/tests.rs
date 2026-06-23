use super::*;

#[test]
fn too_short_displays_min_length() {
    let err = PasswordPolicyError::TooShort { min_length: 8 };
    assert!(err.to_string().contains("8"));
    assert!(err.to_string().contains("too short"));
}

#[test]
fn missing_uppercase_displays_helpfully() {
    let err = PasswordPolicyError::MissingUppercase;
    assert!(err.to_string().contains("uppercase"));
}

#[test]
fn default_policy_accepts_strong_password() {
    let policy = PasswordPolicy::default();
    assert!(policy.validate("Str0ng!Pass#123").is_ok());
}

#[test]
fn default_policy_accepts_password_without_special_char() {
    let policy = PasswordPolicy::default();
    assert!(policy.validate("ValidPass123").is_ok());
}

#[test]
fn default_policy_rejects_short_password() {
    let policy = PasswordPolicy::default();
    let result = policy.validate("Short1");
    assert_eq!(result, Err(PasswordPolicyError::TooShort { min_length: 8 }));
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
fn custom_policy_can_require_special() {
    let policy = PasswordPolicy::builder().require_special(true).build();
    let result = policy.validate("NoSpecialChars123");
    assert_eq!(result, Err(PasswordPolicyError::MissingSpecial));
}

#[test]
fn default_policy_rejects_common_passwords() {
    let policy = PasswordPolicy::default();
    assert_eq!(
        policy.validate("Password1234!"),
        Err(PasswordPolicyError::TooCommon)
    );
    assert_eq!(
        policy.validate("pAssword1234!"),
        Err(PasswordPolicyError::TooCommon)
    );
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
