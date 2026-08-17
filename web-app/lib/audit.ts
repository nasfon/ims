import type { SupabaseClient } from "@supabase/supabase-js";

export const AUDIT_ACTIONS = {
  LOGIN: "login",
  LOGOUT: "logout",
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DEACTIVATED: "user_deactivated",
  USER_DELETED: "user_deleted",
  USER_ASSIGNED: "user_assigned",
  USER_UNASSIGNED: "user_unassigned",
  SHOP_CREATED: "shop_created",
  SHOP_UPDATED: "shop_updated",
  SHOP_DELETED: "shop_deleted",
  PRODUCT_CREATED: "product_created",
  PRODUCT_UPDATED: "product_updated",
  PRODUCT_DELETED: "product_deleted",
  CUSTOMER_CREATED: "customer_created",
  CUSTOMER_UPDATED: "customer_updated",
  CUSTOMER_DELETED: "customer_deleted",
  SALE_CREATED: "sale_created",
  SALE_CORRECTED: "sale_corrected",
  SALE_REVERSED: "sale_reversed",
  CREDIT_PAYMENT_RECORDED: "credit_payment_recorded",
  EXPENSE_CREATED: "expense_created",
  EXPENSE_UPDATED: "expense_updated",
  EXPENSE_DELETED: "expense_deleted",
  SETTINGS_UPDATED: "settings_updated",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditLog = {
  id: string;
  shop_id: string | null;
  user_id: string | null;
  role_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  reason: string | null;
  ip_address: string | null;
  created_at: string;
};

export type AuditLogWithDetails = AuditLog & {
  user?: { full_name: string | null } | null;
  role?: { name: string | null; slug: string | null } | null;
  shop?: { name: string | null } | null;
};

export type Auditor = {
  user_id: string;
  shop_id: string;
  role_slug: string;
};

/** Maps an audit_logs row (with embedded user/role/shop) to the API shape. */
export function mapAuditLogRow(
  row: Record<string, unknown>,
): AuditLogWithDetails {
  return {
    id: row.id as string,
    shop_id: (row.shop_id as string | null) ?? null,
    user_id: (row.user_id as string | null) ?? null,
    role_id: (row.role_id as string | null) ?? null,
    action: row.action as string,
    entity: row.entity as string,
    entity_id: (row.entity_id as string | null) ?? null,
    reason: (row.reason as string | null) ?? null,
    ip_address: (row.ip_address as string | null) ?? null,
    created_at: row.created_at as string,
    user: (row.user as { full_name: string | null } | null) ?? null,
    role: (row.role as { name: string | null; slug: string | null } | null) ?? null,
    shop: (row.shop as { name: string | null } | null) ?? null,
  };
}

export type RecordAuditInput = {
  user_id: string;
  shop_id: string | null;
  action: AuditAction;
  entity: string;
  entity_id?: string | null;
  reason?: string | null;
  ip?: string | null;
};

/**
 * Appends an audit entry via the service-role client (record_audit is granted
 * only to service_role). Call from server-side route handlers/actions.
 */
export async function recordAudit(
  admin: SupabaseClient,
  input: RecordAuditInput,
) {
  await admin.rpc("record_audit", {
    p_user_id: input.user_id,
    p_shop_id: input.shop_id,
    p_action: input.action,
    p_entity: input.entity,
    p_entity_id: input.entity_id ?? null,
    p_reason: input.reason ?? null,
    p_ip_address: input.ip ?? null,
  });
}