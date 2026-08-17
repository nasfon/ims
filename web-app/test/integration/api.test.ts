import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  admin,
  createTestShop,
  createTestUser,
  deleteTestShop,
  deleteTestUser,
  getRoleIds,
  type CreatedUser,
} from "./supabase-helpers";
import { api, login } from "./http";

/**
 * Integration tests for API endpoints exercised over a real Next.js server.
 * Verifies auth enforcement, role restriction, shop scoping, and cross-shop
 * isolation end-to-end through the HTTP layer.
 */
describe("API endpoints", () => {
  let shopA: string;
  let shopB: string;
  let roleIds: Record<string, string>;

  let adminA: CreatedUser; // shop_admin in shop A
  let superA: CreatedUser; // super_admin in shop A
  let cashierA: CreatedUser; // cashier in shop A
  let adminB: CreatedUser; // shop_admin in shop B

  let cookiesAdminA: string;
  let cookiesSuperA: string;
  let cookiesCashierA: string;
  let cookiesAdminB: string;

  const createdProductIds: string[] = [];
  const password = "TestP@ssw0rd123";
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  async function loginUser(user: CreatedUser): Promise<string> {
    const res = await login(user.email, user.password);
    expect(res.status).toBe(200);
    expect(res.cookies.length).toBeGreaterThan(0);
    return res.cookies;
  }

  beforeAll(async () => {
    roleIds = await getRoleIds();
    shopA = await createTestShop(`int-api-shop-a-${suffix}`);
    shopB = await createTestShop(`int-api-shop-b-${suffix}`);

    adminA = await createTestUser({
      email: `api-a.${suffix}@example.com`,
      password,
      fullName: "API Shop A Admin",
      shopId: shopA,
      roleId: roleIds.shop_admin,
    });
    superA = await createTestUser({
      email: `api-s.${suffix}@example.com`,
      password,
      fullName: "API Super Admin",
      shopId: shopA,
      roleId: roleIds.super_admin,
    });
    cashierA = await createTestUser({
      email: `api-c.${suffix}@example.com`,
      password,
      fullName: "API Cashier",
      shopId: shopA,
      roleId: roleIds.cashier,
    });
    adminB = await createTestUser({
      email: `api-b.${suffix}@example.com`,
      password,
      fullName: "API Shop B Admin",
      shopId: shopB,
      roleId: roleIds.shop_admin,
    });

    cookiesAdminA = await loginUser(adminA);
    cookiesSuperA = await loginUser(superA);
    cookiesCashierA = await loginUser(cashierA);
    cookiesAdminB = await loginUser(adminB);
  }, 120_000);

  afterAll(async () => {
    for (const id of createdProductIds) {
      await admin.from("products").delete().eq("id", id);
    }
    for (const u of [adminA, superA, cashierA, adminB]) {
      if (u) await deleteTestUser(u.authId);
    }
    if (shopA) await deleteTestShop(shopA);
    if (shopB) await deleteTestShop(shopB);
  });

  it("rejects unauthenticated GET with 401", async () => {
    const res = await api("/api/v1/products");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("allows an authenticated shop admin to list products (200)", async () => {
    const res = await api("/api/v1/products", { cookies: cookiesAdminA });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("lets a shop admin create a product in their own shop (201)", async () => {
    const res = await api("/api/v1/products", {
      method: "POST",
      cookies: cookiesAdminA,
      body: {
        shop_id: shopA,
        name: `API Prod A ${suffix}`,
        sku: `API-SKU-A-${suffix}`,
        quantity: 7,
        selling_price: 250,
        minimum_stock: 3,
        is_active: true,
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTruthy();
    createdProductIds.push(res.body.data.id);
  });

  it("blocks a cashier from creating a product (403)", async () => {
    const res = await api("/api/v1/products", {
      method: "POST",
      cookies: cookiesCashierA,
      body: {
        shop_id: shopA,
        name: `API Prod blocked ${suffix}`,
        sku: `API-SKU-X-${suffix}`,
        quantity: 1,
        selling_price: 10,
      },
    });
    expect(res.status).toBe(403);
  });

  it("blocks a shop admin from creating a product in another shop (403)", async () => {
    const res = await api("/api/v1/products", {
      method: "POST",
      cookies: cookiesAdminA,
      body: {
        shop_id: shopB,
        name: `API cross-shop ${suffix}`,
        sku: `API-SKU-CROSS-${suffix}`,
        quantity: 1,
        selling_price: 10,
      },
    });
    expect(res.status).toBe(403);
  });

  it("allows a super admin to create a product in any shop (201)", async () => {
    const res = await api("/api/v1/products", {
      method: "POST",
      cookies: cookiesSuperA,
      body: {
        shop_id: shopB,
        name: `API Prod super ${suffix}`,
        sku: `API-SKU-SUPER-${suffix}`,
        quantity: 4,
        selling_price: 99,
        minimum_stock: 1,
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeTruthy();
    createdProductIds.push(res.body.data.id);
  });

  it("enforces duplicate-SKU uniqueness per shop (409)", async () => {
    const first = await api("/api/v1/products", {
      method: "POST",
      cookies: cookiesAdminA,
      body: {
        shop_id: shopA,
        name: `Dup A ${suffix}`,
        sku: `API-DUP-${suffix}`,
        quantity: 2,
        selling_price: 5,
      },
    });
    expect(first.status).toBe(201);
    createdProductIds.push(first.body.data.id);

    const second = await api("/api/v1/products", {
      method: "POST",
      cookies: cookiesAdminA,
      body: {
        shop_id: shopA,
        name: `Dup A again ${suffix}`,
        sku: `API-DUP-${suffix}`,
        quantity: 2,
        selling_price: 5,
      },
    });
    expect(second.status).toBe(409);
  });

  it("isolates products by shop through the API (shop B cannot see shop A's product)", async () => {
    // Ensure a product exists in shop A.
    const created = await api("/api/v1/products", {
      method: "POST",
      cookies: cookiesAdminA,
      body: {
        shop_id: shopA,
        name: `Isolated A ${suffix}`,
        sku: `API-ISO-A-${suffix}`,
        quantity: 3,
        selling_price: 15,
      },
    });
    expect(created.status).toBe(201);
    const productId = created.body.data.id;
    createdProductIds.push(productId);

    const res = await api("/api/v1/products", { cookies: cookiesAdminB });
    expect(res.status).toBe(200);
    const ids = (res.body.data.items ?? []).map((i: { id: string }) => i.id);
    expect(ids).not.toContain(productId);
  });
});
