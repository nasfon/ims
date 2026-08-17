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
import { api, login, serverUrl } from "./http";

/**
 * Integration tests for cross-cutting user flows exercised over the real
 * Next.js server + dev Supabase:
 *  - auth/session lifecycle (login, session restore, logout, failure modes)
 *  - receipt PDF generation (real sale → 80mm PDF bytes)
 *  - logo handling (Supabase Storage round-trip + business_settings.logo_url)
 *
 * These mutate the dev project but create uniquely named shops/users and
 * clean up after themselves in afterAll.
 */
describe("auth/session, receipt PDF & logo upload flows", () => {
  const password = "TestP@ssw0rd123";
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  let shop: string;
  let roleIds: Record<string, string>;

  let authUser: CreatedUser; // shop_admin — auth/session/logout flow
  let inactiveUser: CreatedUser; // shop_admin, deactivated
  let receiptAdmin: CreatedUser; // shop_admin — sale + receipt + settings

  let productId: string;
  let saleId: string;
  let receiptAdminCookies = "";
  let bucket = "";

  const PNG_B64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
  const logoPath = `logos/int-${suffix}.png`;

  async function loginUser(user: CreatedUser): Promise<string> {
    const res = await login(user.email, user.password);
    expect(res.status).toBe(200);
    expect(res.cookies.length).toBeGreaterThan(0);
    return res.cookies;
  }

  beforeAll(async () => {
    roleIds = await getRoleIds();
    shop = await createTestShop(`int-flow-shop-${suffix}`);

    authUser = await createTestUser({
      email: `flow-auth.${suffix}@example.com`,
      password,
      fullName: "Flow Auth Admin",
      shopId: shop,
      roleId: roleIds.shop_admin,
    });
    inactiveUser = await createTestUser({
      email: `flow-inactive.${suffix}@example.com`,
      password,
      fullName: "Flow Inactive Admin",
      shopId: shop,
      roleId: roleIds.shop_admin,
    });
    await admin.from("users").update({ is_active: false }).eq("id", inactiveUser.authId);

    receiptAdmin = await createTestUser({
      email: `flow-receipt.${suffix}@example.com`,
      password,
      fullName: "Flow Receipt Admin",
      shopId: shop,
      roleId: roleIds.shop_admin,
    });

    const { data: product } = await admin
      .from("products")
      .insert({
        shop_id: shop,
        name: `Flow Product ${suffix}`,
        sku: `FLOW-SKU-${suffix}`,
        quantity: 10,
        selling_price: 100,
        minimum_stock: 0,
      })
      .select("id")
      .single();
    productId = product!.id;

    // Create a real sale through the API (exercises create_sale RPC + RLS).
    receiptAdminCookies = await loginUser(receiptAdmin);
    const saleRes = await api("/api/v1/sales", {
      method: "POST",
      cookies: receiptAdminCookies,
      body: {
        items: [{ product_id: productId, quantity: 2 }],
        discount: 0,
        payment_method: "cash",
        amount_paid: 200,
      },
    });
    expect(saleRes.status).toBe(201);
    saleId = saleRes.body.data.id;

    // Fresh Storage bucket for the logo round-trip (deleted in afterAll).
    bucket = `int-flow-logos-${suffix}`;
    await admin.storage.createBucket(bucket, { public: false }).catch(() => {});
  }, 120000);

  afterAll(async () => {
    if (saleId) {
      try {
        await admin.from("sales").delete().eq("id", saleId);
      } catch {}
    }
    if (productId) {
      try {
        await admin.from("products").delete().eq("id", productId);
      } catch {}
    }
    if (bucket) {
      await admin.storage.from(bucket).remove([logoPath]).catch(() => {});
      await admin.storage.deleteBucket(bucket).catch(() => {});
    }
    if (authUser) await deleteTestUser(authUser.authId);
    if (inactiveUser) await deleteTestUser(inactiveUser.authId);
    if (receiptAdmin) await deleteTestUser(receiptAdmin.authId);
    if (shop) await deleteTestShop(shop);
  }, 120000);

  describe("auth/session flow", () => {
    it("GET /auth/session without a session → 401", async () => {
      const res = await api("/api/v1/auth/session");
      expect(res.status).toBe(401);
    });

    it("POST /auth/login with wrong password → 401", async () => {
      const res = await login(authUser.email, "wrong-password");
      expect(res.status).toBe(401);
    });

    it("POST /auth/login for a deactivated account → 403", async () => {
      const res = await login(inactiveUser.email, password);
      expect(res.status).toBe(403);
    });

    it(
      "login → session reachable → logout invalidates the session",
      async () => {
      const { cookies } = await login(authUser.email, password);
      expect(cookies.length).toBeGreaterThan(0);

      const sess = await api("/api/v1/auth/session", { cookies });
      expect(sess.status).toBe(200);
      expect(sess.body.data.user.email).toBe(authUser.email);

      const out = await api("/api/v1/auth/logout", { method: "POST", cookies });
      expect(out.status).toBe(200);

      const after = await api("/api/v1/auth/session", { cookies });
      expect(after.status).toBe(401);
    },
    120000,
    );
  });

  describe("receipt PDF generation", () => {
    it(
      "GET /sales/:id/receipt/pdf returns a valid PDF for an owned sale",
      async () => {
        const res = await fetch(`${serverUrl()}/api/v1/sales/${saleId}/receipt/pdf`, {
          headers: { cookie: receiptAdminCookies },
        });
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toContain("application/pdf");

        const buf = new Uint8Array(await res.arrayBuffer());
        expect(buf.length).toBeGreaterThan(4);
        expect(new TextDecoder().decode(buf.slice(0, 5))).toBe("%PDF-");
      },
      240000,
    );

    it("unauthenticated receipt request → 401", async () => {
      const res = await api(`/api/v1/sales/${saleId}/receipt/pdf`);
      expect(res.status).toBe(401);
    });
  });

  describe("logo upload (Supabase Storage)", () => {
    it("uploads, retrieves, and deletes a logo through Storage", async () => {
      const png = Buffer.from(PNG_B64, "base64");
      const upload = await admin.storage
        .from(bucket)
        .upload(logoPath, png, { contentType: "image/png", upsert: true });
      expect(upload.error).toBeNull();

      const dl = await admin.storage.from(bucket).download(logoPath);
      expect(dl.error).toBeNull();
      expect(dl.data).toBeTruthy();
      const bytes = new Uint8Array(await (dl.data as Blob).arrayBuffer());
      expect(bytes.length).toBeGreaterThan(0);

      const del = await admin.storage.from(bucket).remove([logoPath]);
      expect(del.error).toBeNull();
    });

    it("persists a logo_url through business settings", async () => {
      const cookies = receiptAdminCookies;
      const logo = `https://cdn.example.com/logo-${suffix}.png`;

      const patch = await api("/api/v1/settings/business", {
        method: "PATCH",
        cookies,
        body: { logo_url: logo },
      });
      expect(patch.status).toBe(200);

      const get = await api("/api/v1/settings/business", { cookies });
      expect(get.status).toBe(200);
      expect(get.body.data.logo_url).toBe(logo);
    });
  });
});
