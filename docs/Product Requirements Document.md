# Product Requirements Document (PRD)

## Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

# 1. Product Overview

The Inventory Management System (IMS) is a web-based application designed to help businesses efficiently manage products, customers, sales, customer credits, expenses, and inventory across multiple shops.

The system will simplify daily business operations by providing real-time inventory tracking, receipt generation, sales history, customer credit management, and business reports through a secure, role-based administrator dashboard.

The MVP focuses on reliability, ease of use, and accurate business record keeping across multiple shop locations.

---

# 2. Goals

* Digitize inventory records across multiple shops.
* Simplify sales management per shop.
* Reduce stock management errors.
* Track customer debts and payments.
* Monitor business expenses per shop.
* Generate printable receipts.
* Provide business insights through reports.
* Maintain an audit trail for important actions.
* Enable role-based access control for secure operations.

---

# 3. Users & Roles

The system supports multiple shops and role-based access control (RBAC).

### 3.1 Super Admin

Has full system access across all shops.

Responsibilities include:

* Create and manage shops
* Assign users to shops
* Manage roles and permissions
* View all business data across shops
* Manage system settings
* View audit logs

### 3.2 Shop Admin / Manager

Has full access within an assigned shop.

Responsibilities include:

* Manage products within their shop
* Manage customers
* Record and correct sales
* Manage customer credits
* Record expenses
* View shop-level reports
* View audit logs for their shop

### 3.3 Cashier

Has limited operational access within a shop.

Responsibilities include:

* Create sales invoices
* View products
* View customers
* Print receipts
* Record basic sales transactions

---

# 4. Functional Requirements

## 4.1 Authentication

* Secure login system
* Role-based access control (RBAC)
* Session management
* Logout functionality
* Access restricted based on role and assigned shop

---

## 4.2 Multi-Shop Management

* Create multiple shops (Super Admin only)
* Assign users to specific shops
* Switch between shops based on user access
* Data isolation per shop (products, sales, customers, expenses)
* Shop-level reporting and analytics

---

## 4.3 Dashboard

Display shop-specific or global data depending on role:

* Total Products
* Total Customers
* Today's Sales
* Total Revenue
* Outstanding Credit
* Total Expenses
* Low Stock Alerts
* Recent Sales

---

## 4.4 Product Management

* Add Product (per shop)
* Edit Product
* Delete Product
* View Products
* Search Products
* Manage Product Quantity
* Set Selling Price

Stock quantity updates automatically after every sale within the selected shop.

---

## 4.5 Customer Management

* Add Customer (per shop)
* Edit Customer
* Delete Customer
* Customer Profile
* Customer Purchase History
* Outstanding Credit Balance
* Search Customers by name or phone number

---

## 4.6 Sales Management

* Create Sales Invoice
* Sell Multiple Products
* Automatic Stock Deduction (per shop)
* Discount Support
* Accept Cash Payments
* Accept Bank Transfer
* Accept POS Payments
* Print Receipt

---

## 4.7 Receipt Generation

Every receipt shall include:

* Business Name
* Business Phone Number
* Business Address
* Shop Name
* Receipt Number
* Date & Time
* Customer Name (Optional)
* Purchased Items
* Quantity
* Selling Price
* Total Amount
* Payment Method
* Remaining Credit Balance (if applicable)

The system shall support:

* Print Receipt
* Download Receipt as PDF

---

## 4.8 History

The system shall maintain:

* Sales History (per shop)
* Credit Payment History
* Product Stock History

Search options:

* Date
* Customer Name
* Phone Number
* Shop (for Super Admin)

Filtering shall also be supported.

---

## 4.9 Credit Book

The system shall allow authorized users to:

* View Total Outstanding Credit (per shop or global)
* Record Customer Payments
* View Outstanding Balance
* View Payment History
* Mark Debt as Fully Paid

---

## 4.10 Expenses

Authorized users can:

* Record Expense (per shop)
* Enter Expense Description
* Expense Amount
* Expense Date
* View Expense History

---

## 4.11 Low Stock Alerts

Users shall be able to:

* Set Minimum Stock Quantity (per shop)
* Receive Low Stock Notifications
* Highlight Low Stock Products
* View All Low Stock Products

---

## 4.12 Sales Correction

The system shall support:

* Edit Sales Before Finalization
* Correct Completed Sales (Role Restricted)
* Reverse Sales (Role Restricted)
* Automatically Recalculate Inventory
* Require Reason for Every Correction
* Maintain Complete Audit Trail

---

## 4.13 Audit Logs

The system shall record:

* Product Changes
* Customer Changes
* Sales
* Sales Corrections
* Credit Payments
* Expense Records
* Login Activity
* Shop-level actions

Each record shall include:

* User
* Role
* Shop
* Action
* Date
* Time

---

## 4.14 Business Settings

Administrators shall configure:

* Business Name
* Logo
* Phone Number
* Address
* Receipt Footer Message
* Shop Information (per shop where applicable)

---

# 5. Non-Functional Requirements

* Clean and responsive interface
* Fast system performance
* Secure authentication with RBAC
* Multi-shop data isolation
* Automatic inventory updates
* Reliable data storage
* Printable receipts
* PDF receipt download
* Mobile-friendly layout

---

# 6. Success Criteria

The system will be considered successful if it enables users to:

* Manage multiple shops efficiently.
* Control access through role-based permissions.
* Manage products accurately per shop.
* Record sales without errors.
* Track customer credits.
* Monitor inventory levels.
* Generate receipts.
* Record expenses.
* View business history and reports.
* Correct mistakes while maintaining a complete audit trail.

