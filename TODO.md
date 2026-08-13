# IMS (Inventory Management System) — Task Manager

Build tracker from start to deployment. Mark tasks `[x]` when done.
Source of requirements: `docs/` (PRD, Architecture, Database, API, UI, Security, Tests, Deployment).

---

## Phase 0 — Planning & Setup

- [x] Write all planning documents (docs folder, 12 files)
- [x] Initialize Git repository (commit `4ec49bb` exists with docs + old `sayyif-ims/` skeleton)
- [x] Scaffold base Next.js template (`web-app/`) with TypeScript + Tailwind + eslint (default create-next-app only)
- [x] Install core dependencies (supabase-js, lucide-react)
- [x] Commit current `web-app/` to Git (commit `8d3d0e6`: removed `sayyif-ims/`, added `web-app/` + folder structure)
- [x] Confirm business rules — discounts removed; no credit limit; receipts A4 + 80mm; currency NGN (see PRD §2.5)
- [x] Install remaining stack: TanStack Query, shadcn/ui (Nova/Base UI preset), jsPDF
- [x] Create IMS folder structure in `web-app/`: `app/(auth)/`, `app/(dashboard)/`, `app/api/v1/`, `components/`, `lib/`, `server/`, `hooks/`, `types/`, `public/uploads/`, `supabase/{functions,migrations}`
- [x] Provision Supabase project (dev)
- [x] Create Vercel project (dev/staging)
- [x] Define environment variables and secrets management
- [x] Configure Supabase `config.toml` / migrations tooling

## Phase 1 — Authentication & Core Setup

- [x] Create `roles` table and seed roles (Super Admin, Shop Admin, Cashier)
- [x] Create `shops` table (CRUD for Super Admin)
- [x] Create `users` table (shop_id, role_id, is_active)
- [x] Create `audit_logs` table + audit logging function
- [x] Implement Supabase Auth login/logout/session handling
- [x] Implement `POST /auth/login` and `POST /auth/logout`
- [x] Implement shops API (GET/POST/PATCH/DELETE `/shops`)
- [x] Implement users API (GET/POST/PATCH/DELETE `/users`) with pagination/search/role filter
- [x] Implement user onboarding and role assignment
- [x] Build dashboard layout shell (top bar, sidebar, navigation, breadcrumb)
- [x] Implement login page (email, password, error message)
- [x] Implement route protection (proxy) for unauthenticated users
- [x] Implement role-based route guards
- [x] Enforce inactive users cannot log in

## Phase 2 — Product & Inventory

- [x] Create `products` table (shop_id, sku, quantity, selling_price, minimum_stock, is_active)
- [x] Create `stock_history` table + trigger for inventory movements
- [x] Add indexes (shop_id, sku unique per shop, created_at) and constraints (quantity >= 0, price > 0)
- [x] Implement products API (CRUD) with search/sort/filter/pagination
- [x] Implement `GET /products?lowStock=true`
- [x] Implement `GET /stock/low` and `GET /stock/history`
- [x] Implement stock deduction/adjustment logic (atomic, with stock history record)
- [x] Implement soft delete for products (deleted_at, deleted_by)
- [x] Build product list page (search, pagination, sort, filter, columns, actions)
- [x] Build product form page (create/edit with validation)
- [x] Implement low stock flagging and low stock list

## Phase 3 — Customers & Credit

- [ ] Create `customers` table (shop_id, full_name, phone, email, address, total_credit)
- [ ] Create `credit_payments` table (customer_id, sale_id, amount, payment_method, received_by)
- [ ] Add indexes (shop_id, phone, customer_id)
- [ ] Implement customers API (CRUD) with search by name/phone
- [ ] Implement `GET /customers/{customerId}/sales` (purchase history)
- [ ] Implement `GET /customers/{customerId}/credit`
- [ ] Implement credit payments API (`GET /credits`, `POST /credits/payments`, history)
- [ ] Enforce payment cannot exceed outstanding balance; mark fully paid sets balance to zero
- [ ] Implement soft delete for customers
- [ ] Build customer list page (name, phone, outstanding credit, total purchases)
- [ ] Build customer details page (info, purchase history, credit, payment history)
- [ ] Build credit book page (customer list, record payment, mark fully paid)

## Phase 4 — Sales, Receipts & Expenses

- [ ] Create `sales` table (customer_id nullable, cashier_id, receipt_number unique, subtotal, discount, total, amount_paid, remaining_credit, payment_method, status)
- [ ] Create `sale_items` table (sale_id, product_id, quantity, unit_price, total_price)
- [ ] Create `expenses` table (shop_id, description, amount, expense_date, recorded_by)
- [ ] Implement sequential/unique receipt numbering trigger
- [ ] Implement sales API: GET/POST `/sales`, GET `/sales/{saleId}`
- [ ] Implement sale creation with multiple products, discount, payment methods (cash, bank transfer, POS)
- [ ] Implement automatic stock deduction on sale (in transaction)
- [ ] Prevent sale when stock insufficient
- [ ] Support walk-in sales (no customer)
- [ ] Implement credit balance update when amount paid < total
- [ ] Implement `PATCH /sales/{saleId}` (correct, requires reason)
- [ ] Implement `POST /sales/{saleId}/reverse` (restores stock, requires reason)
- [ ] Prevent correcting/reversing an already corrected/reversed sale
- [ ] Implement expenses API (CRUD) with date filter
- [ ] Build sales list page (columns: receipt, date, customer, cashier, payment method, total, status)
- [ ] Build new sale page (customer section, product search/add, quantity, discount, summary, payment)
- [ ] Build receipt display (all PRD section 4.7 fields, print, download PDF)
- [ ] Implement receipt print + PDF generation (`GET /sales/{saleId}/receipt`, `/receipt/pdf`)
- [ ] Implement sale correction/reversal UI (reason prompt, role restricted)
- [ ] Build expenses page (list, record/edit/delete form)

## Phase 5 — Reports, Dashboard & Settings

- [ ] Create `business_settings` table (shop_id, business_name, phone, address, logo_url, receipt_footer)
- [ ] Implement dashboard API (`GET /dashboard`: products, customers, today's sales, revenue, credit, expenses, low stock, recent sales)
- [ ] Implement reports API: `/reports/sales`, `/reports/revenue`, `/reports/expenses`, `/reports/credits`, `/reports/inventory` with date range and shop filter
- [ ] Implement business settings API (`GET/PATCH /settings/business`)
- [ ] Implement audit logs API (`GET /audit-logs` with user/date/action filters)
- [ ] Build dashboard page (widgets, recent sales, quick actions)
- [ ] Build reports page (cards, filters, generate, print, download PDF)
- [ ] Build business settings page (info, logo, contact, receipt footer)
- [ ] Build audit logs page (columns, filters)
- [ ] Implement role-based UI visibility (hide/disable unauthorized actions)

## Phase 6 — Testing & Hardening

- [ ] Set up test framework (Vitest/Jest) + config
- [ ] Write unit tests: calculations (subtotal, discount, total, stock, credit, revenue)
- [ ] Write unit tests: formatting utilities (currency, dates, receipt numbers)
- [ ] Write integration tests: API endpoints + RLS policies
- [ ] Write integration tests: auth/session flow, receipt PDF generation, logo upload
- [ ] Write E2E tests: login/logout, product create, sale + stock deduction, credit payment, correction/reversal, expense, reports, multi-shop isolation, role restriction
- [ ] Verify RLS blocks cross-shop reads/writes (isolation test suite)
- [ ] Verify direct API calls without token rejected
- [ ] Verify cashier cannot access admin-only endpoints
- [ ] Verify correction/reversal requires correct role and reason
- [ ] Verify input validation blocks invalid data (negative qty, zero/negative prices, duplicate SKU)
- [ ] Verify rate limiting on auth endpoints and report/PDF generation
- [ ] Verify no service role key in client bundle
- [ ] Verify audit log entries for all mandatory actions
- [ ] Responsive testing (desktop, tablet, mobile — sidebar/drawer, table scrolling)
- [ ] Performance testing (dashboard/report load, pagination with large datasets)
- [ ] Security review sign-off

## Phase 7 — UAT & Go-Live

- [ ] Deploy to staging (Vercel) with separate Supabase staging project
- [ ] Seed realistic test data (3+ shops, users per role, 50+ products, 20+ customers, sales, payments, expenses)
- [ ] Run user acceptance testing (UAT) per role (Super Admin, Shop Admin, Cashier)
- [ ] Log, triage, and fix UAT issues; retest critical issues
- [ ] Collect UAT sign-off per role
- [ ] Create user documentation (Quick Start, role guides, module references, FAQ, receipt guide)
- [ ] Conduct training sessions (Admins, Cashiers, Super Admin)
- [ ] Prepare release notes and pre-release checklist

## Deployment & Launch

- [ ] Create production Supabase project, apply migrations, verify RLS
- [ ] Seed initial production data (roles, shops, business settings)
- [ ] Configure production environment variables (SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
- [ ] Verify SSL/HTTPS and security headers
- [ ] Run production smoke tests (login, sale, receipt, reports)
- [ ] Verify Supabase daily backups and set up monitoring/alerting
- [ ] Announce launch and establish support channels

## Post-Launch

- [ ] Daily check of error logs and dashboard
- [ ] Weekly review of reports and data accuracy
- [ ] Quarterly backup restore drill
- [ ] Collect user feedback; maintain improvement backlog
