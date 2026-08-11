# Database Design Document (DDD)

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

# 1. Purpose

This document defines the database structure for the Inventory Management System (IMS).

The database is designed to support:

* Multiple shops
* Role-Based Access Control (RBAC)
* Inventory management
* Sales
* Customer credit management
* Expenses
* Audit logging
* Reporting

Database Engine:

* PostgreSQL (Supabase)

---

# 2. Database Principles

* UUID primary keys
* Foreign key constraints
* Soft delete support where necessary
* Automatic timestamps
* Referential integrity
* Shop-level data isolation
* Optimized indexing

---

# 3. Tables

## 3.1 Shops

Represents each business location.

Fields

* id (UUID, PK)
* name
* phone
* email
* address
* logo_url
* receipt_footer
* created_at
* updated_at

Relationship

* One Shop → Many Users
* One Shop → Many Products
* One Shop → Many Customers
* One Shop → Many Sales
* One Shop → Many Expenses

---

## 3.2 Roles

System roles.

Fields

* id
* name

Default Records

* Super Admin
* Shop Admin
* Cashier

Relationship

* One Role → Many Users

---

## 3.3 Users

System users.

Fields

* id (UUID)
* shop_id
* role_id
* full_name
* email
* phone
* password_hash
* is_active
* last_login_at
* created_at
* updated_at

Relationship

* Belongs to Shop
* Belongs to Role

---

## 3.4 Products

Stores inventory items.

Fields

* id
* shop_id
* name
* sku
* quantity
* selling_price
* minimum_stock
* is_active
* created_at
* updated_at

Relationship

* Belongs to Shop
* One Product → Many Sale Items
* One Product → Many Stock History Records

---

## 3.5 Customers

Stores customer information.

Fields

* id
* shop_id
* full_name
* phone
* email (optional)
* address (optional)
* total_credit
* created_at
* updated_at

Relationship

* Belongs to Shop
* One Customer → Many Sales
* One Customer → Many Credit Payments

---

## 3.6 Sales

Stores sales transactions.

Fields

* id
* shop_id
* customer_id (nullable)
* cashier_id
* receipt_number
* subtotal
* total
* amount_paid
* remaining_credit
* payment_method
* status
* created_at

Status

* Completed
* Corrected
* Reversed

Relationship

* One Sale → Many Sale Items

---

## 3.7 Sale Items

Stores items sold in each sale.

Fields

* id
* sale_id
* product_id
* quantity
* unit_price
* total_price

Relationship

* Belongs to Sale
* Belongs to Product

---

## 3.8 Credit Payments

Tracks payments toward customer debt.

Fields

* id
* customer_id
* sale_id
* amount
* payment_method
* received_by
* created_at

Relationship

* Belongs to Customer
* Belongs to Sale

---

## 3.9 Expenses

Business expenses.

Fields

* id
* shop_id
* description
* amount
* expense_date
* recorded_by
* created_at

Relationship

* Belongs to Shop

---

## 3.10 Stock History

Tracks every inventory movement.

Fields

* id
* shop_id
* product_id
* change_type
* quantity_before
* quantity_changed
* quantity_after
* reference_id
* created_by
* created_at

Change Types

* Sale
* Manual Adjustment
* Sale Correction
* Reversal

---

## 3.11 Audit Logs

Records important system activities.

Fields

* id
* shop_id
* user_id
* action
* entity
* entity_id
* reason
* ip_address
* created_at

Examples

* Login
* Product Created
* Product Updated
* Sale Created
* Sale Corrected
* Customer Updated

---

## 3.12 Business Settings

Stores business configuration.

Fields

* id
* shop_id
* business_name
* phone
* address
* logo_url
* receipt_footer
* updated_at

---

# 4. Relationships

Shops

* hasMany Users
* hasMany Products
* hasMany Customers
* hasMany Sales
* hasMany Expenses
* hasMany Audit Logs

Roles

* hasMany Users

Users

* belongsTo Shop
* belongsTo Role

Products

* belongsTo Shop
* hasMany Sale Items
* hasMany Stock History

Customers

* belongsTo Shop
* hasMany Sales
* hasMany Credit Payments

Sales

* belongsTo Shop
* belongsTo Customer
* belongsTo User (Cashier)
* hasMany Sale Items

Sale Items

* belongsTo Sale
* belongsTo Product

Credit Payments

* belongsTo Customer
* belongsTo Sale

Expenses

* belongsTo Shop

Stock History

* belongsTo Product

Audit Logs

* belongsTo User
* belongsTo Shop

---

# 5. Indexes

Create indexes on:

* shop_id
* role_id
* customer_id
* product_id
* sale_id
* receipt_number (Unique)
* phone
* sku (Unique per shop)
* created_at

---

# 6. Constraints

* Receipt Number must be unique.
* SKU must be unique within a shop.
* Product quantity cannot be negative.
* Selling price must be greater than zero.
* Expense amount must be greater than zero.
* Credit payment cannot exceed outstanding balance.
* Users can only belong to one shop.
* Every sale must belong to one shop.

---

# 7. Soft Delete Strategy

The following tables should support soft deletion using:

* deleted_at
* deleted_by

Applicable tables:

* Products
* Customers
* Users

Sales, Audit Logs, Stock History, and Credit Payments should never be deleted.

---

# 8. Row Level Security (RLS)

Every business table contains **shop_id**.

RLS policies ensure:

* Super Admin can access all shops.
* Shop Admin can only access their assigned shop.
* Cashier can only access records for their assigned shop.

---

# 9. Future Tables

Reserved for future releases:

* Suppliers
* Purchase Orders
* Purchase Items
* Barcode Labels
* Notifications
* Branch Transfers
* Inventory Adjustments
* Attachments

---

# 10. Naming Conventions

* Table Names: plural (products, sales)
* Primary Keys: id
* Foreign Keys: table_name_id
* Timestamps:

  * created_at
  * updated_at
* Soft Delete:

  * deleted_at
  * deleted_by

---

# 11. Database Summary

Total Core Tables (MVP)

1. shops
2. roles
3. users
4. products
5. customers
6. sales
7. sale_items
8. credit_payments
9. expenses
10. stock_history
11. audit_logs
12. business_settings

This schema provides a scalable foundation for a secure, multi-shop inventory management system while remaining focused on the MVP requirements.

