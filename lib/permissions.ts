// ─── Client-side view of the per-account issue restrictions ──────────────────
// The SERVER is the authority (see backend src/utils/issuePermissions.js). What
// lives here only stops a restricted user from being shown options that would
// come back 403 — it is convenience, never a security boundary.

/** Delivery methods an admin may choose when issuing a pass.
 *  Mirrors ASSIGNABLE_DELIVERY_METHODS in the backend's
 *  src/utils/issuePermissions.js — keep the two in sync. */
export const DELIVERY_METHODS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "both", label: "WhatsApp + Email" },
  { value: "mobile", label: "Mobile App" },
  { value: "mobile_whatsapp", label: "Mobile + WhatsApp" },
  // Issues the pass and sends nothing — the issuer downloads or prints the QR
  // from the confirmation screen.
  { value: "none", label: "No auto-send (download / print)" },
] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]["value"];

export const DELIVERY_METHOD_VALUES = DELIVERY_METHODS.map((m) => m.value) as DeliveryMethod[];

export function deliveryMethodLabel(value: string): string {
  return DELIVERY_METHODS.find((m) => m.value === value)?.label || value;
}

/** The permission block the API returns on /auth/login and /auth/profile. */
export interface Permissions {
  canOverride?: boolean;
  canManualEntry?: boolean;
  canBahumanaView?: boolean;
  allowedEvents?: any[];
  /** Turns allowedEvents into a hard limit rather than a label. */
  restrictToAllowedEvents?: boolean;
  /** Holder-type catCodes this account may issue. EMPTY = no restriction. */
  allowedHolderTypeCodes?: string[];
  /** Delivery methods this account may use. EMPTY = no restriction. */
  allowedDeliveryMethods?: string[];
  canViewAllHolders?: boolean;
  canViewReports?: boolean;
  canViewScanFeed?: boolean;
}

export interface AuthUserLike {
  role?: string;
  permissions?: Permissions;
}

/** super_admin is never restricted — matches the backend exactly. */
export function isUnrestricted(user?: AuthUserLike | null): boolean {
  return user?.role === "super_admin";
}

// ─── Staff role hierarchy ────────────────────────────────────────────────────
// Mirrors ROLE_RANK in the backend's src/utils/roles.js: an account may only
// assign roles, and manage accounts, that rank strictly below its own;
// super_admin outranks everyone. Again convenience only — the server decides.
const ROLE_RANK: Record<string, number> = {
  super_admin: 100,
  event_admin: 80,
  campaign_manager: 60,
  issuer: 40,
  announcer: 30,
  preacher: 20,
  volunteer: 10,
  self: 0,
};

const rankOf = (role?: string) => (role && role in ROLE_RANK ? ROLE_RANK[role] : -1);

/** Roles offered in the staff-user dropdowns. `create: false` = not offered
 *  when creating a new account (only when changing an existing one). */
export const STAFF_ROLE_OPTIONS: {
  value: string;
  label: string;
  createLabel?: string;
  create?: boolean;
}[] = [
  { value: "announcer", label: "🎁 Announcer", createLabel: "🎁 Announcer (Bahumana View only)" },
  { value: "issuer", label: "🎫 Issuer", createLabel: "🎫 Issuer (restricted pass issuing)" },
  { value: "event_admin", label: "Event Admin" },
  { value: "campaign_manager", label: "Campaign Manager" },
  { value: "volunteer", label: "Volunteer" },
  { value: "preacher", label: "Preacher", create: false },
  { value: "super_admin", label: "Super Admin", create: false },
];

/** May this user create an account with, or assign, `role`? */
export function canAssignRole(user: AuthUserLike | null | undefined, role: string): boolean {
  if (isUnrestricted(user)) return true;
  return rankOf(role) < rankOf(user?.role);
}

/** May this user edit or delete an account that currently has `targetRole`? */
export function canManageUser(user: AuthUserLike | null | undefined, targetRole?: string): boolean {
  if (isUnrestricted(user)) return true;
  return rankOf(targetRole) < rankOf(user?.role);
}

/** Holder types this user may issue, filtered from the event's full list.
 *  An empty allow-list means every type is available. */
export function filterHolderTypes<T extends { _id: string; catCode?: string }>(
  types: T[] | undefined,
  user?: AuthUserLike | null,
): T[] {
  const list = types || [];
  if (isUnrestricted(user)) return list;
  const codes = (user?.permissions?.allowedHolderTypeCodes || [])
    .map((c) => String(c).toUpperCase())
    .filter(Boolean);
  if (codes.length === 0) return list;
  return list.filter((t) => codes.includes(String(t?.catCode || "").toUpperCase()));
}

/** Delivery methods this user may choose. Empty allow-list means all. */
export function allowedDeliveryMethods(user?: AuthUserLike | null) {
  if (isUnrestricted(user)) return DELIVERY_METHODS.slice();
  const allowed = (user?.permissions?.allowedDeliveryMethods || []).filter(Boolean);
  if (allowed.length === 0) return DELIVERY_METHODS.slice();
  return DELIVERY_METHODS.filter((m) => allowed.includes(m.value));
}

/** Section access. A flag that is absent (older accounts) counts as allowed. */
export function can(user: AuthUserLike | null | undefined, flag: keyof Permissions): boolean {
  if (isUnrestricted(user)) return true;
  return user?.permissions?.[flag] !== false;
}

/** Where this account should land after login. A restricted issuer has no
 *  dashboard to speak of — send them straight to the issue form. */
export function landingRoute(user?: AuthUserLike | null): string {
  if (user?.role === "announcer" || user?.permissions?.canBahumanaView) {
    const eventId = (user?.permissions?.allowedEvents || [])[0];
    const id = typeof eventId === "string" ? eventId : eventId?._id;
    if (id) return `/events/${id}/bahumana`;
  }
  if (!can(user, "canViewReports")) return "/holders/create";
  return "/dashboard";
}
