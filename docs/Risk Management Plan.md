# Risk Management Plan

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

# 1. Purpose

This document identifies the key risks for the Inventory Management System (IMS) project, assesses their likelihood and impact, and defines mitigation and contingency strategies.

Risks are reviewed at the end of each phase (see Project Roadmap & Timeline).

---

# 2. Risk Rating

Each risk is rated by:

* Likelihood (L): Low, Medium, High
* Impact (I): Low, Medium, High

Overall rating is derived from the combination of likelihood and impact.

---

# 3. Risk Register

## Technical Risks

### R1 — Data loss due to failed deployment or migration

* Likelihood: Medium
* Impact: High

Mitigation

* Database backups scheduled (see Deployment & Release Plan).
* Migrations run and verified on staging first.
* Rollback plan in place.

### R2 — Stock quantity becomes inaccurate

* Likelihood: Medium
* Impact: High

Mitigation

* Stock changes recorded atomically in transactions.
* Stock history written for every movement.
* Sale/reversal/correction tested thoroughly.
* Manual adjustment option with audit trail.

### R3 — RLS misconfiguration leaks data across shops

* Likelihood: Low
* Impact: High

Mitigation

* RLS policies written and tested for every table.
* Cross-shop isolation test suite (see Test Plan).
* Service role key never exposed to the client.
* Code review of all policies.

### R4 — Performance problems with large datasets

* Likelihood: Medium
* Impact: Medium

Mitigation

* Indexes on frequently queried fields.
* Pagination on all list endpoints.
* Dashboard queries kept lean.
* Performance testing in Phase 6.

### R5 — Duplicate or inconsistent data (SKU, receipt numbers)

* Likelihood: Medium
* Impact: Medium

Mitigation

* Unique constraints in the database.
* Receipt numbering handled via a safe sequence/trigger.
* Validation before insert.

---

## Project Risks

### R6 — Scope creep beyond MVP

* Likelihood: High
* Impact: Medium

Mitigation

* MVP scope frozen and documented.
* Future features tracked as "Out of Scope" backlog.
* Change requests reviewed against timeline.

### R7 — Delays due to unclear business rules (receipts, credit)

* Likelihood: Medium
* Impact: Medium

Mitigation

* Business rules confirmed in Phase 0.
* Stakeholders sign off before affected phases start.
* Open questions logged and resolved early.

### R8 — Single developer availability risk

* Likelihood: Medium
* Impact: High

Mitigation

* Small incremental milestones.
* Code documented and conventions followed.
* Handover notes maintained per module.

### R9 — Inaccurate financial calculations

* Likelihood: Medium
* Impact: High

Mitigation

* Unit tests for all calculations (subtotal, total, credit, revenue).
* Sample test data with known expected values.
* Cross-check totals in reports against transaction records.

---

## Operational Risks

### R10 — Users enter incorrect data (e.g., wrong price, quantity)

* Likelihood: High
* Impact: Medium

Mitigation

* Confirmation dialogs for destructive actions.
* Sales correction/reversal with reason and audit trail.
* Review of recent sales by Shop Admin.
* Validation rules on quantities and prices.

### R11 — Forgotten passwords / account lockouts

* Likelihood: Medium
* Impact: Low

Mitigation

* Supabase password reset flow.
* Admin can reset user passwords.
* Clear error messages.

### R12 — Receipt/PDF formatting issues across devices

* Likelihood: Medium
* Impact: Low

Mitigation

* Test printing on 80mm thermal and A4 printable formats.
* PDF generation tested on staging.
* Receipt layout configurable via business settings.

---

# 4. Summary of High Risks

| ID | Risk                              | Rating       |
| -- | --------------------------------- | ------------ |
| R1 | Data loss                         | High         |
| R2 | Stock inaccuracy                  | High         |
| R3 | RLS cross-shop leak               | High         |
| R8 | Single developer availability     | High         |
| R9 | Financial calculation errors      | High         |

---

# 5. Risk Response Strategies

* Avoid: Remove features/options that create unmanageable risk.
* Mitigate: Reduce likelihood or impact through controls.
* Transfer: Use managed services (Supabase) for infrastructure security.
* Accept: Accept residual low-impact risks with monitoring.

---

# 6. Risk Review Process

* Reviewed at the end of each phase.
* New risks added as discovered.
* Risk status updated (Open, Mitigating, Resolved).
* High risks escalated to stakeholders immediately.
