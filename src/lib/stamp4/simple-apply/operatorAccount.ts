/**
 * Stamp4's browser extension still authenticates via the shared
 * STAMP4_ACCESS_SECRET bearer token (see checkAccessSecret.ts), not a
 * per-user Supabase session - docs/auth-migration.md's "Remaining sequence"
 * step 5 (hashed, revocable, user-owned extension tokens) hasn't happened
 * yet. Routes reachable only through that path (generate/route.ts) have no
 * caller identity to resolve a per-user row from. Until personal extension
 * tokens exist, they fall back to this one known account - the same
 * single-operator boundary RAJ_PROFILE already represented before the
 * per-user migration, just for account identity instead of career-search
 * preferences.
 */
export const OPERATOR_USER_ID = '0e4cb719-8e9a-45ff-841a-dbd177f97b47'
