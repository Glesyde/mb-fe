// Who may see reproductive data. No insurer, employer or payer access, ever, whatever else
// the account holds. Checks the raw backend role names: AuthContext maps unknown roles to
// "Admin" for display, so `user.role` must not be used here.

const DENIED_ROLE_PATTERNS: RegExp[] = [/insur/i, /employer/i, /hmo/i, /payer/i, /underwrit/i];

export interface AccessDecision {
  allowed: boolean;
  reason: "DENIED_ROLE" | "NO_EMR_ACCESS" | null;
}

/**
 * @param roles raw role names from AuthContext `roles`
 * @param hasEmrAccess result of hasAnyPermission(NAV_PERMISSION_RULES.emr) for this user
 */
export function canAccessReproductive(roles: string[], hasEmrAccess: boolean): AccessDecision {
  if (roles.some((r) => DENIED_ROLE_PATTERNS.some((p) => p.test(r)))) return { allowed: false, reason: "DENIED_ROLE" };
  if (!hasEmrAccess) return { allowed: false, reason: "NO_EMR_ACCESS" };
  return { allowed: true, reason: null };
}
