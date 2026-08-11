# Project Roadmap & Timeline

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

# 1. Purpose

This document defines the project phases, milestones, deliverables, task breakdown, dependencies, and estimated timeline for delivering the Inventory Management System (IMS) MVP.

It serves as the execution plan for the requirements defined in the Product Requirements Document (PRD) and aligned with the System Architecture, Database Design, API Specification, and Frontend UI Specification.

---

# 2. Assumptions

The following assumptions are made for the MVP timeline:

* A small team (1-2 developers) is available.
* Supabase and Vercel are used as the hosting platform.
* No barcode scanner, supplier, or purchase order features are in MVP scope.
* Business rules (receipt format, currency) are finalized before Phase 2.
* Stakeholders are available for testing and feedback during each phase.

---

# 3. Phases

The project is divided into phases. Each phase ends with a milestone and a review checkpoint.

## Phase 0 — Planning & Setup

Duration: 1 Week

Activities

* Finalize requirements and confirm scope (MVP vs Future).
* Confirm business rules (credit limits, receipt layout, currency).
* Set up Git repository and branching strategy.
* Provision Supabase project and Vercel project.
* Set up project folder structure and shared component library.
* Define environment variables and secrets management.

Deliverables

* Project repository
* Shared code conventions and folder structure
* Provisioned development/staging environments

Milestone: Project foundation ready.

---

## Phase 1 — Authentication & Core Setup

Duration: 1 Week

Activities

* Implement Supabase Auth (login, logout, session handling).
* Create roles table and seed roles (Super Admin, Shop Admin, Cashier).
* Implement user onboarding and role assignment.
* Create shops module (CRUD for Super Admin).
* Implement audit log foundation.
* Implement dashboard layout shell (top bar, sidebar, navigation).

Deliverables

* Working login/logout flow
* Shop management
* User management
* Navigation shell

Milestone: Authenticated application shell with roles and shops.

---

## Phase 2 — Product & Inventory

Duration: 1 Week

Activities

* Implement products CRUD.
* Implement stock quantity management.
* Implement product search, sort, filter, pagination.
* Implement low stock threshold and low stock detection.
* Implement stock history recording.

Deliverables

* Product management module
* Stock history module
* Low stock alerts

Milestone: Inventory module complete.

---

## Phase 3 — Customers & Credit

Duration: 1 Week

Activities

* Implement customers CRUD.
* Implement customer search by name/phone.
* Implement customer profile with purchase history.
* Implement credit balance tracking.
* Implement credit payments (record payment, mark fully paid).

Deliverables

* Customer management module
* Credit book module

Milestone: Customer and credit modules complete.

---

## Phase 4 — Sales, Receipts & Expenses

Duration: 2 Weeks

Activities

* Implement sales processing (multiple products, payment methods).
* Implement automatic stock deduction.
* Implement sales history and search.
* Implement receipt generation, printing, and PDF download.
* Implement sales correction and reversal with reason and audit trail.
* Implement expenses module.

Deliverables

* Sales module
* Receipt module
* Expense module
* Sales correction/reversal

Milestone: Core operational modules complete.

---

## Phase 5 — Reports, Dashboard & Settings

Duration: 1 Week

Activities

* Implement dashboard statistics and widgets.
* Implement reports (sales, revenue, expenses, credit, inventory).
* Implement business settings.
* Implement role-based UI visibility.

Deliverables

* Dashboard
* Reports module
* Business settings

Milestone: All MVP modules complete.

---

## Phase 6 — Testing & Hardening

Duration: 1 Week

Activities

* Execute test plan (unit, integration, E2E).
* Verify RLS policies and role permissions.
* Test multi-shop isolation.
* Security review and rate limiting checks.
* Performance and responsiveness checks.
* Fix defects found during testing.

Deliverables

* Test execution report
* Bug fixes
* Security review sign-off

Milestone: Code complete and tested.

---

## Phase 7 — UAT & Go-Live

Duration: 1 Week

Activities

* Deploy to staging environment.
* Execute user acceptance testing with stakeholders.
* Collect feedback and finalize changes.
* Deploy to production.
* Train users and provide documentation.
* Monitor post-launch.

Deliverables

* Staging environment
* UAT sign-off
* Production deployment
* User training and support handover

Milestone: MVP launched.

---

# 4. Timeline Summary

| Phase                 | Duration | Cumulative |
| --------------------- | -------- | ---------- |
| Phase 0 - Planning    | 1 Week   | Week 1     |
| Phase 1 - Auth & Core | 1 Week   | Week 2     |
| Phase 2 - Inventory   | 1 Week   | Week 3     |
| Phase 3 - Customers   | 1 Week   | Week 4     |
| Phase 4 - Sales       | 2 Weeks  | Week 5-6   |
| Phase 5 - Reports     | 1 Week   | Week 7     |
| Phase 6 - Testing     | 1 Week   | Week 8     |
| Phase 7 - UAT & Live  | 1 Week   | Week 9     |

Total estimated duration: **9 weeks** (~2 months).

---

# 5. Task Breakdown (Work Breakdown Structure)

## Database & Backend

* Create tables and relationships.
* Implement RLS policies per role.
* Implement indexes and constraints.
* Implement triggers (receipt numbering, stock history).
* Implement audit logging function.

## Frontend

* Set up layout, navigation, and shared components.
* Implement login page.
* Implement each module page (Products, Customers, Sales, Credit, Expenses, Reports, Audit Logs, Shops, Users, Settings).
* Implement responsive behavior for mobile and tablet.

## Integration

* Connect frontend to Supabase APIs.
* Implement receipt PDF generation.
* Implement role-based page access.

## Quality

* Write unit tests for business logic.
* Write integration tests for API endpoints.
* Write E2E tests for critical flows (login, sale, credit payment).
* Perform multi-shop isolation testing.

---

# 6. Dependencies

Critical Dependencies

* Database schema must be finalized before sales module development.
* Authentication must be complete before any protected module.
* Product module must be complete before sales module (stock deduction).
* Sales module must be complete before receipt and report modules.
* RLS policies must be tested before multi-shop go-live.

External Dependencies

* Business owner approval on receipt layout and currency format (confirmed: A4 + 80mm, NGN).
* Final decision on payment methods supported (cash, bank transfer, POS).
* Availability of sample product/customer data for testing.

---

# 7. Milestones

| Milestone                     | Target Week |
| ----------------------------- | ----------- |
| Project foundation ready      | Week 1      |
| Authenticated shell + shops   | Week 2      |
| Inventory module complete     | Week 3      |
| Customer + credit complete    | Week 4      |
| Core operations complete      | Week 6      |
| All MVP modules complete      | Week 7      |
| Code complete and tested      | Week 8      |
| MVP launched                  | Week 9      |

---

# 8. Out of Scope (MVP)

The following are intentionally deferred to future releases:

* Barcode scanner integration
* Supplier management
* Purchase orders
* Multi-branch transfers
* Employee management
* SMS/email notifications
* Mobile applications
* Public API
* Advanced analytics
* Role-level permission customization UI

---

# 9. Definition of Ready (Per Phase)

A phase is considered ready to start when:

* Requirements for the phase are documented and understood.
* Dependencies from the previous phase are complete.
* Relevant acceptance criteria exist.
* Required data and access are available.

---

# 10. Definition of Done (Per Phase)

A phase is considered done when:

* All tasks in the phase are complete.
* Code follows project conventions.
* Key flows are tested.
* RLS and role checks are verified.
* Audit logging is in place for relevant actions.
* Documentation is updated if affected.
