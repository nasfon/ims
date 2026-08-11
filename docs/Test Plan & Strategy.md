# Test Plan & Strategy

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

# 1. Purpose

This document defines the testing approach for the Inventory Management System (IMS), including test levels, test types, environments, test scenarios, and entry/exit criteria.

The goal is to verify that the system meets the requirements in the Product Requirements Document (PRD) and behaves correctly, securely, and reliably across all roles and shops.

---

# 2. Test Objectives

* Verify all functional requirements are implemented.
* Verify role-based access control (RBAC) and shop isolation.
* Verify inventory accuracy after sales, corrections, and reversals.
* Verify credit book accuracy.
* Verify receipt generation and PDF output.
* Verify reports and dashboard calculations.
* Verify responsiveness on desktop, tablet, and mobile.
* Identify defects before go-live.

---

# 3. Test Levels

## 3.1 Unit Testing

Scope

* Business logic functions (calculations, validation).
* Price, subtotal, total calculations.
* Stock quantity calculations.
* Credit balance calculations.
* Formatting utilities (currency, dates, receipt numbers).

Tools

* Testing framework appropriate to the stack (e.g. Vitest / Jest).

## 3.2 Integration Testing

Scope

* Database queries and RLS policies.
* API endpoint behavior.
* Authentication and session flow.
* Receipt PDF generation.
* Supabase storage integration (logo upload).

## 3.3 End-to-End (E2E) Testing

Scope

* Critical user flows through the full application.

Priority Flows

1. Login and logout.
2. Create a product and verify stock.
3. Complete a sale (multiple items) and verify stock deduction and receipt.
4. Record a credit sale and verify outstanding balance.
5. Record a credit payment and verify balance reduction.
6. Correct and reverse a sale, verify stock restoration and audit log.
7. Record an expense.
8. Generate each report and verify totals.
9. Multi-shop isolation (data from shop A not visible in shop B).
10. Role restriction (cashier cannot access admin-only pages).

## 3.4 User Acceptance Testing (UAT)

Referenced in the Acceptance Criteria & UAT Plan document.

---

# 4. Test Types

## Functional Testing

* Every feature is tested against its acceptance criteria.

## Security Testing

* RLS policy bypass attempts.
* Direct API calls without a token.
* Attempts to access another shop's data.
* Role escalation attempts.
* Input validation (invalid data, oversized values, negative quantities).
* SQL injection attempt through search fields.

## Performance Testing

* Page load times on dashboard and reports.
* Query performance with large product/sales datasets.
* Pagination behavior with large datasets.

## Responsive Testing

* Desktop, tablet, and mobile layouts.
* Sidebar collapse on tablet and drawer on mobile.
* Table scrolling on small screens.

## Usability Testing

* Task completion for new users (casual observation).
* Clarity of error messages and validation.
* Confirmation dialogs for destructive actions.

---

# 5. Environments

## Development

* Local environment.
* Used for unit and integration tests during development.

## Staging

* Mirrors production configuration.
* Used for E2E, security, and UAT testing.
* Uses a separate Supabase project from production.

## Production

* Live environment.
* Smoke testing only after deployment.

---

# 6. Test Data

Sample Data Required

* 3+ shops.
* Users for each role (Super Admin, Shop Admin, Cashier).
* 50+ products (mix of normal and low stock).
* 20+ customers (mix with credit and without).
* Sales records across multiple dates.
* Credit payments.
* Expenses.
* Audit log entries.

Notes

* Credit/debit amounts should be small and clearly identifiable.
* A separate Supabase project is used so test data never touches production.

---

# 7. Key Test Scenarios

## Authentication

* Valid login succeeds.
* Invalid password shows clear error.
* Inactive account cannot log in.
* Session expires and redirects to login.

## Shop & User Management

* Super Admin can create and manage shops.
* User can only be assigned to one shop.
* Deactivated user cannot access the system.

## Product Management

* Create product with valid data.
* SKU must be unique within a shop.
* Duplicate SKU is rejected.
* Quantity cannot be negative.
* Selling price must be greater than zero.
* Editing product updates stock history when quantity changes.
* Low stock products are flagged.

## Sales

* Sale with multiple items calculates subtotal and total correctly.
* Stock is deducted after sale.
* Sale with a customer creates credit balance when amount paid is less than total.
* Walk-in sale (no customer) is allowed.
* Payment method is recorded (cash, bank transfer, POS).
* Insufficient stock prevents sale.
* Receipt number is sequential and unique.

## Sales Correction & Reversal

* Correction requires a reason.
* Reversal restores stock.
* Corrected/reversed sale cannot be corrected again.
* Audit log entry is created for every correction and reversal.

## Credit Book

* Outstanding balance shows total unpaid amounts.
* Payment reduces balance.
* Payment cannot exceed outstanding balance.
* Marking fully paid sets balance to zero.
* Payment history is accurate.

## Expenses

* Expense amount must be greater than zero.
* Expense is linked to the correct shop.

## Reports

* Sales report totals match individual sale records.
* Revenue report matches completed sales.
* Expense report matches expense records.
* Credit report matches outstanding balances.
* Inventory report matches current stock levels.
* Date filters return only in-range records.

## Receipts

* Receipt shows all required fields (per PRD section 4.7).
* PDF download opens a valid PDF.
* Receipt reflects shop business information.

## Audit Logs

* Every sensitive action produces an audit log entry.
* Log includes user, role, shop, action, resource, reason, date/time.

## Multi-Shop Isolation

* Shop Admin cannot see another shop's data through UI.
* Direct API requests to another shop's data are blocked by RLS.
* Super Admin can view all shops.

---

# 8. Defect Management

Defect Severity

| Severity | Description                                   |
| -------- | --------------------------------------------- |
| Critical | Blocks core use (sale, login, data corruption) |
| High     | Major feature broken with no workaround        |
| Medium   | Feature works but incorrect or poor experience |
| Low      | Minor cosmetic or edge-case issue              |

Workflow

1. Defect logged with steps to reproduce, expected vs actual result.
2. Triage by severity.
3. Fix scheduled based on severity.
4. Regression test after fix.

---

# 9. Test Reporting

Reports Generated

* Test execution summary (total passed/failed).
* Defect list by severity.
* Coverage of modules vs acceptance criteria.
* Sign-off status per phase.

---

# 10. Entry Criteria (Start Testing)

* Module/phase code complete.
* Environment available.
* Test data seeded.
* Requirements and acceptance criteria confirmed.

---

# 11. Exit Criteria (Stop Testing)

* All critical and high defects resolved and verified.
* All priority E2E flows pass.
* RLS and role checks pass.
* UAT sign-off received.

---

# 12. Automated vs Manual

## Automated

* Unit tests for business logic.
* Integration tests for API and RLS.
* E2E for critical flows (login, sale, credit payment).

## Manual

* Usability and responsive checks.
* Visual receipt/PDF verification.
* Ad-hoc exploratory testing.
* UAT.
