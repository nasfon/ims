import type { NextRequest } from "next/server";

import {
  apiError,
  apiSuccess,
  guardApiRole,
  guardApiUser,
} from "@/lib/api";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import {
  CUSTOMER_FIELDS,
  mapCustomerRow,
  type CustomerRow,
} from "@/lib/customers";
import { getClientIp } from "@/lib/request";
import { ROLES } from "@/lib/roles";
import { createServerAdminClient } from "@/lib/supabase/server";
import {
  UUID_RE,
  parseCustomerUpdate,
} from "@/lib/validation/customers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const { customerId } = await params;
  if (!UUID_RE.test(customerId)) return apiError("Invalid customer id.", 400);

  const { data: customer, error: dbError } = await session.supabase
    .from("customers")
    .select(CUSTOMER_FIELDS)
    .eq("id", customerId)
    .is("deleted_at", null)
    .single();

  if (dbError || !customer) {
    return apiError("Customer not found.", 404);
  }

  return apiSuccess(mapCustomerRow(customer as CustomerRow), "Customer loaded.");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { customerId } = await params;
  if (!UUID_RE.test(customerId)) return apiError("Invalid customer id.", 400);

  const body = await request.json().catch(() => ({}));
  const { value, errors } = parseCustomerUpdate(body);
  if (Object.keys(errors).length > 0) {
    return apiError("Validation failed.", 422, errors);
  }
  if (Object.keys(value).length === 0) {
    return apiError("No fields to update.", 400);
  }

  const admin = createServerAdminClient();

  const { data: target, error: targetError } = await admin
    .from("customers")
    .select("id, shop_id")
    .eq("id", customerId)
    .single();

  if (targetError || !target) return apiError("Customer not found.", 404);

  const actorRole = session.user.role_slug;
  if (actorRole === ROLES.SHOP_ADMIN && target.shop_id !== session.user.shop_id) {
    return apiError("Customer not found.", 404);
  }

  const { data, error: dbError } = await admin
    .from("customers")
    .update(value)
    .eq("id", customerId)
    .select(CUSTOMER_FIELDS)
    .single();

  if (dbError || !data) {
    return apiError("Unable to update customer.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: target.shop_id,
    action: AUDIT_ACTIONS.CUSTOMER_UPDATED,
    entity: "customer",
    entity_id: customerId,
    ip: getClientIp(request),
  });

  return apiSuccess(mapCustomerRow(data as CustomerRow), "Customer updated.");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { session, error } = await guardApiUser();
  if (error) return error;

  const forbidden = guardApiRole(session, [ROLES.SUPER_ADMIN, ROLES.SHOP_ADMIN]);
  if (forbidden) return forbidden;

  const { customerId } = await params;
  if (!UUID_RE.test(customerId)) return apiError("Invalid customer id.", 400);

  const admin = createServerAdminClient();

  const { data: target, error: targetError } = await admin
    .from("customers")
    .select("id, shop_id, total_credit")
    .eq("id", customerId)
    .is("deleted_at", null)
    .single();

  if (targetError || !target) return apiError("Customer not found.", 404);

  const actorRole = session.user.role_slug;
  if (actorRole === ROLES.SHOP_ADMIN && target.shop_id !== session.user.shop_id) {
    return apiError("Customer not found.", 404);
  }

  // Never silently drop an outstanding debt.
  if (Number(target.total_credit) > 0) {
    return apiError("Cannot delete a customer with outstanding credit.", 409);
  }

  // Soft delete: mark the row, keeping purchase and payment history intact
  // (Database Design §7). No physical delete.
  const { error: dbError } = await admin
    .from("customers")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user.id,
    })
    .eq("id", customerId)
    .is("deleted_at", null);

  if (dbError) {
    return apiError("Unable to delete customer.", 500);
  }

  await recordAudit(admin, {
    user_id: session.user.id,
    shop_id: target.shop_id,
    action: AUDIT_ACTIONS.CUSTOMER_DELETED,
    entity: "customer",
    entity_id: customerId,
    ip: getClientIp(request),
  });

  return apiSuccess({ id: customerId }, "Customer deleted.");
}