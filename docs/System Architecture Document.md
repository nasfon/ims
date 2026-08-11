# System Architecture Document (SAD)

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

# 1. Purpose

This document defines the overall system architecture for the Inventory Management System (IMS). It describes the application's architecture, technology stack, modules, data flow, security model, and deployment approach.

The architecture is designed to be scalable, secure, maintainable, and support multiple shops from a single platform.

---

# 2. System Overview

The Inventory Management System is a web application built with **Next.js (frontend)** and **Supabase (backend platform)** that enables businesses to manage inventory, customers, sales, customer credits, expenses, receipts, and reporting across multiple shop locations.

The system uses a centralized Supabase PostgreSQL database with strict data isolation between shops through Row Level Security (RLS) policies and role-based access control (RBAC).

---

# 3. Architecture Style

The system follows a modern serverless-friendly three-tier architecture.

```
Client (Next.js)
        │
        ▼
Supabase (Auth + API + Database)
```

Each layer has a single responsibility.

* Presentation Layer (Next.js UI)
* Application Layer (Next.js Server Actions / API Routes)
* Data Layer (Supabase PostgreSQL + RLS)

---

# 4. Technology Stack

## Frontend

* Next.js 14+ (App Router)
* React 19
* TypeScript
* TanStack Query
* Tailwind CSS
* shadcn/ui

## Backend (BaaS)

* Supabase

  * PostgreSQL Database
  * Supabase Auth
  * Row Level Security (RLS)
  * Edge Functions (optional)

## Database

* PostgreSQL (via Supabase)

## File Storage

* Supabase Storage

## PDF Generation

* PDF Generator Library (e.g. jsPDF / React-PDF)

---

# 5. High-Level Architecture

```
Users
│
├── Super Admin
├── Shop Admin
└── Cashier
        │
        ▼
Frontend (Next.js)
        │
 HTTPS (Supabase Client SDK)
        │
        ▼
Supabase Services
│
├── Auth Module
├── Database (PostgreSQL)
├── Row Level Security (RLS)
├── Storage
└── Edge Functions (optional)
```

---

# 6. Application Modules

## Authentication Module

Responsibilities

* Login
* Logout
* Supabase Auth integration
* Session Management
* Role Verification

---

## User Module

Responsibilities

* User Management
* Role Assignment
* Shop Assignment
* Account Status

---

## Shop Module

Responsibilities

* Create Shop
* Update Shop
* Manage Shop Information
* Shop Isolation via RLS

---

## Product Module

Responsibilities

* Product CRUD
* Stock Quantity
* Product Search
* Low Stock Monitoring

---

## Customer Module

Responsibilities

* Customer CRUD
* Customer History
* Credit Balance

---

## Sales Module

Responsibilities

* Sales Processing
* Multiple Products
* Stock Deduction
* Sales Correction

---

## Receipt Module

Responsibilities

* Generate Receipt
* Print Receipt
* Download PDF

---

## Credit Module

Responsibilities

* Record Credit Sales
* Receive Payments
* Outstanding Balance
* Credit History

---

## Expense Module

Responsibilities

* Expense Recording
* Expense History

---

## Reports Module

Responsibilities

* Sales Reports
* Revenue Reports
* Expense Reports
* Credit Reports
* Inventory Reports

---

## Dashboard Module

Responsibilities

* Statistics
* Recent Activities
* Alerts
* Business Summary

---

## Audit Module

Responsibilities

* Activity Logs
* User Logs
* Sales Corrections
* Login History

---

## Settings Module

Responsibilities

* Business Information
* Receipt Settings
* Shop Settings
* System Configuration

---

# 7. Security Architecture

Authentication

* Supabase Auth (JWT-based)
* Secure password hashing handled by Supabase

Authorization

* Role-Based Access Control (RBAC)
* Row Level Security (RLS) for shop isolation

Roles

* Super Admin
* Shop Admin
* Cashier

Security Features

* Row Level Security (RLS)
* Input Validation (frontend + backend logic)
* SQL Injection Protection (PostgreSQL + Supabase)
* CORS Configuration
* Rate Limiting (via Edge Functions or middleware)
* Audit Logging

---

# 8. Database Architecture

Main Entities

* Shops
* Users
* Roles
* Products
* Customers
* Sales
* Sale Items
* Credit Records
* Credit Payments
* Expenses
* Audit Logs
* Business Settings

Relationships

* One Shop has many Users
* One Shop has many Products
* One Shop has many Customers
* One Shop has many Sales
* One Sale has many Sale Items
* One Customer has many Credit Records
* One Credit Record has many Payments

---

# 9. Request Flow

```
User

↓

Next.js Frontend

↓

Supabase Client SDK

↓

Supabase Auth (if required)

↓

PostgreSQL (via Supabase API)

↓

Response

↓

Frontend
```

---

# 10. Authorization Flow

```
User Login

↓

Supabase Auth Session Created

↓

Every Request

↓

RLS Policy Enforcement

↓

Role Validation (if needed)

↓

Shop Access Validation

↓

Requested Resource
```

---

# 11. Audit Logging Flow

```
User Action

↓

Next.js Server Action / API Call

↓

Database Write

↓

Insert Audit Log Record

↓

Return Response
```

Every important action is recorded with:

* User
* Role
* Shop
* Action
* Resource
* Date
* Time
* Reason (when applicable)

---

# 12. Error Handling

The system shall provide consistent API responses.

Example

* 200 OK
* 201 Created
* 400 Bad Request
* 401 Unauthorized
* 403 Forbidden
* 404 Not Found
* 409 Conflict
* 500 Internal Server Error

---

# 13. Performance Requirements

* Fast page loading with Next.js SSR/SSG where needed
* Optimized Supabase queries
* Pagination for large datasets
* Lazy loading for heavy components
* Proper indexing on frequently queried fields

---

# 14. Scalability

The architecture supports future expansion including:

* Barcode Scanner
* Supplier Management
* Purchase Orders
* Multi-Branch Inventory
* Employee Management
* SMS Notifications
* Email Notifications
* Cloud File Storage expansion via Supabase
* Mobile Applications
* Public API

---

# 15. Deployment Architecture

```
Internet

↓

Vercel (Next.js Hosting)

↓

Supabase (Backend Services)

↓

PostgreSQL Database
```

The frontend and backend services are decoupled, allowing independent scaling and deployment.

---

# 16. Architecture Principles

* Modular Design
* Separation of Concerns
* Secure by Default
* Serverless-First Architecture
* Role-Based Access Control
* Shop-Level Data Isolation via RLS
* Maintainable Codebase
* Scalable Infrastructure
* Comprehensive Audit Logging
* Clean Documentation

