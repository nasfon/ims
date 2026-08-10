# Acceptance Criteria & UAT Plan

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

# 1. Purpose

This document defines measurable acceptance criteria for each module of the Inventory Management System (IMS) and the User Acceptance Testing (UAT) process used to confirm the system is ready for go-live.

---

# 2. General Acceptance Criteria

* All features operate per the Product Requirements Document (PRD).
* Role-based access control works as defined in the Security & RBAC Design.
* Data is isolated between shops (RLS verified).
* All sensitive actions appear in audit logs.
* The application is responsive on desktop, tablet, and mobile.
* Receipts can be printed and downloaded as PDF.
* No critical or high defects remain at sign-off.

---

# 3. Module Acceptance Criteria

## 3.1 Authentication

* A user with valid credentials can log in.
* A user with invalid credentials sees a clear error and cannot log in.
* An inactive account cannot log in.
* Logout ends the session and returns to the login page.
* Access to protected pages redirects unauthenticated users to login.

## 3.2 Shops

* Super Admin can create, edit, view, and disable shops.
* Shop information displays correctly (name, phone, email, address, logo).
* Non-Super Admin users cannot access shop management.

## 3.3 Users

* Authorized admins can create, edit, activate, and deactivate users.
* A user is assigned to exactly one shop and one role.
* Deactivated users cannot log in.
* Users only see data from their assigned shop (except Super Admin).

## 3.4 Products

* Products can be created, viewed, edited, and soft-deleted.
* SKU is unique within a shop.
* Quantity cannot be negative.
* Selling price must be greater than zero.
* Products can be searched, sorted, and paginated.
* Low stock products are flagged and listed.

## 3.5 Customers

* Customers can be created, viewed, edited, and soft-deleted.
* Customers can be searched by name or phone.
* Customer profile shows purchase history and outstanding credit.
* Outstanding credit matches credit records.

## 3.6 Sales

* A sale can include multiple products with quantities.
* Subtotal, discount, and total are calculated correctly.
* Stock is deducted automatically after a sale.
* Payment methods (cash, bank transfer, POS) are recorded.
* Walk-in sales (no customer) are supported.
* Insufficient stock prevents the sale.
* Receipt number is unique and sequential.

## 3.7 Receipts

* Receipt contains all required fields (per PRD section 4.7).
* Receipt prints correctly.
* Receipt downloads as a valid PDF.
* Receipt shows the correct shop business information.

## 3.8 Sales Correction & Reversal

* Correction/reversal requires a reason.
* Reversal restores stock correctly.
* Corrected/reversed sales cannot be modified again.
* Every correction/reversal creates an audit log entry.

## 3.9 Credit Book

* Outstanding balance matches total credit minus total payments.
* A payment reduces the outstanding balance.
* A payment cannot exceed the outstanding balance.
* Marking fully paid sets the balance to zero.
* Payment history is accurate and ordered.

## 3.10 Expenses

* Expenses can be recorded, viewed, edited, and deleted.
* Amount must be greater than zero.
* Expenses belong to the correct shop.

## 3.11 Reports

* Each report's totals match the underlying transaction records.
* Date range filters return only in-range records.
* Shop filter (Super Admin) returns correct per-shop data.

## 3.12 Dashboard

* All widgets display accurate values (products, customers, today's sales, revenue, credit, expenses, low stock).
* Recent sales list is accurate.
* Data reflects the current shop (or global for Super Admin).

## 3.13 Audit Logs

* Sensitive actions produce an audit log entry.
* Logs include user, role, shop, action, resource, reason, date/time.
* Shop Admin sees logs for their shop only; Super Admin sees all.

## 3.14 Business Settings

* Business name, logo, phone, address, and receipt footer can be updated.
* Changes appear on receipts.
* Only authorized roles can update settings.

---

# 4. User Acceptance Testing (UAT)

## 4.1 Purpose

UAT confirms the system meets real business needs and is acceptable for daily use.

## 4.2 Participants

* Business owner / stakeholder (Super Admin).
* Shop Managers (Shop Admin).
* Cashiers (Cashier role).

## 4.3 Environment

* Staging environment (or a controlled production-like setup).
* Realistic test data (see Test Plan & Strategy section 6).

## 4.4 UAT Process

1. Provide UAT test scripts covering the priority flows.
2. Participants execute the scripts using their real roles.
3. Participants also explore freely and report issues.
4. Issues are logged, triaged, and fixed.
5. Retest critical issues.
6. Collect sign-off per role.

## 4.5 UAT Scenarios

* Super Admin: create a shop, assign a user, view global reports, view all audit logs.
* Shop Admin: manage products, customers, sales, credit, expenses; correct/reverse a sale; view shop reports.
* Cashier: create a sale, print receipt, view products and customers; verify cannot access admin pages.

## 4.6 UAT Sign-Off

* Each participant role signs off when their scenarios pass.
* Any critical/high issues must be resolved before sign-off.
* Written sign-off confirms the system is ready for production.

---

# 5. Sign-Off Record

| Role       | UAT Completed | Issues Outstanding | Signed By | Date |
| ---------- | ------------- | ------------------ | --------- | ---- |
| Super Admin |               |                    |           |      |
| Shop Admin  |               |                    |           |      |
| Cashier     |               |                    |           |      |

---

# 6. Definition of Done (Project Level)

The project is complete when:

* All module acceptance criteria are met.
* UAT is signed off by all roles.
* Critical and high defects are resolved.
* Deployment and backup plans are executed.
* User training and support materials are delivered.
