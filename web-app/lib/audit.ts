export const AUDIT_ACTIONS = {
  LOGIN: "login",
  LOGOUT: "logout",
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DEACTIVATED: "user_deactivated",
  SHOP_CREATED: "shop_created",
  SHOP_UPDATED: "shop_updated",
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