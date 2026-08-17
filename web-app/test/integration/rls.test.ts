import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  anonClient,
  authedClient,
  createTestShop,
  createTestUser,
  deleteTestShop,
  deleteTestUser,
  getRoleIds,
  signIn,
  type CreatedUser,
} from "./supabase-helpers";

/**
 * Integration tests for Row-Level Security policies.
 *
 * Verifies cross-shop data isolation, role-based access, and that unauthenticated
 * callers are denied. Exercises the real Supabase instance configured via env.
 */
describe("RLS policies", () => {
  let shopA: string;
  let shopB: string;
  let roleIds: Record<string, string>;

  let userA: CreatedUser; // shop_admin in shop A
  let userB: CreatedUser; // shop_admin in shop B
  let cashierA: CreatedUser; // cashier in shop A
  let superA: CreatedUser; // super_admin in shop A

  let clientA: Awaited<ReturnType<typeof authedClient>>;
  let clientB: Awaited<ReturnType<typeof authedClient>>;
  let clientCashierA: Awaited<ReturnType<typeof authedClient>>;
  let clientSuper: Awaited<ReturnType<typeof authedClient>>;

  let prodA: string;
  let prodB: string;
  const createdProductIds: string[] = [];

  const password = "TestP@ssw0rd123";
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  async function makeClientFor(user: CreatedUser) {
    const { accessToken, refreshToken } = await signIn(user.email, user.password);
    return authedClient(accessToken, refreshToken);
  }

  beforeAll(async () => {
    roleIds = await getRoleIds();
    shopA = await createTestShop(`int-test-shop-a-${suffix}`);
    shopB = await createTestShop(`int-test-shop-b-${suffix}`);

    userA = await createTestUser({
      email: `a.${suffix}@example.com`,
      password,
      fullName: "Shop A Admin",
      shopId: shopA,
      roleId: roleIds.shop_admin,
    });
    userB = await createTestUser({
      email: `b.${suffix}@example.com`,
      password,
      fullName: "Shop B Admin",
      shopId: shopB,
      roleId: roleIds.shop_admin,
    });
    cashierA = await createTestUser({
      email: `c.${suffix}@example.com`,
      password,
      fullName: "Shop A Cashier",
      shopId: shopA,
      roleId: roleIds.cashier,
    });
    superA = await createTestUser({
      email: `s.${suffix}@example.com`,
      password,
      fullName: "Super Admin",
      shopId: shopA,
      roleId: roleIds.super_admin,
    });

    clientA = await makeClientFor(userA);
    clientB = await makeClientFor(userB);
    clientCashierA = await makeClientFor(cashierA);
    clientSuper = await makeClientFor(superA);

    // Seed one product in each shop via the respective shop admin.
    const insertA = await clientA
      .from("products")
      .insert({
        shop_id: shopA,
        name: `Prod A ${suffix}`,
        sku: `SKU-A-${suffix}`,
        quantity: 10,
        selling_price: 100,
        minimum_stock: 2,
        is_active: true,
      })
      .select("id")
      .single();
    expect(insertA.error).toBeNull();
    prodA = insertA.data!.id as string;
    createdProductIds.push(prodA);

    const insertB = await clientB
      .from("products")
      .insert({
        shop_id: shopB,
        name: `Prod B ${suffix}`,
        sku: `SKU-B-${suffix}`,
        quantity: 5,
        selling_price: 50,
        minimum_stock: 1,
        is_active: true,
      })
      .select("id")
      .single();
    expect(insertB.error).toBeNull();
    prodB = insertB.data!.id as string;
    createdProductIds.push(prodB);
  }, 120_000);

  afterAll(async () => {
    for (const id of createdProductIds) {
      await admin.from("products").delete().eq("id", id);
    }
    for (const u of [userA, userB, cashierA, superA]) {
      if (u) await deleteTestUser(u.authId);
    }
    if (shopA) await deleteTestShop(shopA);
    if (shopB) await deleteTestShop(shopB);
  });

  it("shop A admin sees only shop A's product", async () => {
    const { data, error } = await clientA.from("products").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(prodA);
    expect(ids).not.toContain(prodB);
  });

  it("shop B admin cannot see shop A's product (cross-shop isolation)", async () => {
    const { data, error } = await clientB.from("products").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(prodB);
    expect(ids).not.toContain(prodA);
  });

  it("cashier in shop A can read shop A's product but not shop B's", async () => {
    const { data, error } = await clientCashierA.from("products").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(prodA);
    expect(ids).not.toContain(prodB);
  });

  it("super admin can see products across both shops", async () => {
    const { data, error } = await clientSuper.from("products").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(prodA);
    expect(ids).toContain(prodB);
  });

  it("unauthenticated (anon) caller sees no products", async () => {
    const client = anonClient();
    const { data, error } = await client.from("products").select("id");
    // RLS `to authenticated` does not apply to the anon role → empty result.
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);
  });

  it("shop B admin cannot insert a product into shop A (write isolation)", async () => {
    const { error } = await clientB
      .from("products")
      .insert({
        shop_id: shopA,
        name: "Illegal cross-shop insert",
        sku: `SKU-X-${suffix}`,
        quantity: 1,
        selling_price: 10,
        minimum_stock: 0,
        is_active: true,
      });
    expect(error).not.toBeNull();
    // 42501 = permission denied (RLS with check violation)
    expect(error!.code).toBe("42501");
  });

  it("shop B admin cannot update/delete shop A's product", async () => {
    const before = await admin.from("products").select("quantity").eq("id", prodA).single();
    const originalQty = before.data!.quantity as number;

    // UPDATE/DELETE are filtered by the policy's USING clause: the row is simply
    // not visible to shop B, so 0 rows are affected and no error is raised.
    const update = await clientB.from("products").update({ quantity: 999 }).eq("id", prodA);
    expect(update.error).toBeNull();
    const afterUpdate = await admin.from("products").select("quantity").eq("id", prodA).single();
    expect(afterUpdate.data!.quantity).toBe(originalQty); // unchanged by shop B

    const del = await clientB.from("products").delete().eq("id", prodA);
    expect(del.error).toBeNull();
    const afterDelete = await admin.from("products").select("id").eq("id", prodA);
    expect((afterDelete.data ?? []).length).toBe(1); // still present
  });

  it("shop A admin can manage only their own shop's users", async () => {
    // userB belongs to shop B — shop A admin must not be able to read it.
    const { data, error } = await clientA.from("users").select("id").eq("id", userB.authId);
    expect(error).toBeNull();
    expect((data ?? []).length).toBe(0);

    // But they can read their own profile.
    const self = await clientA.from("users").select("id").eq("id", userA.authId);
    expect(self.error).toBeNull();
    expect((self.data ?? []).length).toBe(1);
  });

  it("shop-scoped users cannot read a different shop's row (users table)", async () => {
    const { data } = await clientB.from("users").select("id").eq("id", userA.authId);
    expect((data ?? []).length).toBe(0);
  });

  it("shop admins see only their own shop in the shops table", async () => {
    const { data, error } = await clientA.from("shops").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(shopA);
    expect(ids).not.toContain(shopB);
  });

  it("super admin sees all shops", async () => {
    const { data, error } = await clientSuper.from("shops").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((r) => r.id);
    expect(ids).toContain(shopA);
    expect(ids).toContain(shopB);
  });
});
