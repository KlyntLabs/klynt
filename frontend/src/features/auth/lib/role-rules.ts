export const INSTITUTION_REQUIRED_ROLES = ["teacher", "admin"] as const;

export function requiresInstitution(role: string): boolean {
  return INSTITUTION_REQUIRED_ROLES.includes(role as (typeof INSTITUTION_REQUIRED_ROLES)[number]);
}
