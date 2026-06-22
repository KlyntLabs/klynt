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

impl PasswordPolicy {
    /// Validate a password against this policy.
    ///
    /// Returns `Ok(())` if the password satisfies all rules,
    /// or the first violation found.
    pub fn validate(&self, password: &str) -> Result<(), PasswordPolicyError> {
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

        for ch in password.chars() {
            if self.forbidden_chars.contains(&ch) {
                return Err(PasswordPolicyError::ForbiddenCharacter { char: ch });
            }
        }

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

        self.check_not_common(password)?;

        Ok(())
    }

    fn check_not_common(&self, password: &str) -> Result<(), PasswordPolicyError> {
        const COMMON_PASSWORDS: &[&str] = &[
            "password",
            "password123",
            "password1234!",
            "12345678",
            "qwerty123",
            "admin123",
            "letmein",
            "welcome123",
            "monkey123",
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
#[derive(Debug)]
pub struct PasswordPolicyBuilder {
    min_length: usize,
    max_length: usize,
    require_uppercase: bool,
    require_lowercase: bool,
    require_digit: bool,
    require_special: bool,
    forbidden_chars: Vec<char>,
}

impl Default for PasswordPolicyBuilder {
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

#[cfg(test)]
mod tests;
