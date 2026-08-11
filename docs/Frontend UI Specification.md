# Frontend/UI Specification

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**Prepared By:** NasFon

---

# 1. Purpose

This document defines the user interface structure, navigation, layouts, pages, components, and user interactions for the Inventory Management System (IMS).

The goal is to provide a clean, responsive, modern, and easy-to-use experience across desktop, tablet, and mobile devices.

---

# 2. Design Principles

* Clean and modern interface
* Mobile-first responsive design
* Fast navigation
* Consistent UI components
* Minimal learning curve
* Accessible and readable
* Clear visual hierarchy

---

# 3. Design System

## Colors

* Primary
* Secondary
* Success
* Warning
* Error
* Neutral

## Typography

* Heading 1
* Heading 2
* Heading 3
* Body Text
* Caption

## Border Radius

* Small
* Medium
* Large

## Spacing

Use an 8px spacing system throughout the application.

---

# 4. Layout

## Authentication Layout

Used for:

* Login

Components

* Logo
* Welcome Message
* Login Form

---

## Dashboard Layout

Components

* Top Navigation Bar
* Sidebar Navigation
* Page Header
* Breadcrumb
* Content Area
* Notification Menu
* User Profile Menu

---

# 5. Navigation

## Sidebar

* Dashboard
* Products
* Customers
* Sales
* Credit Book
* Expenses
* Reports
* Audit Logs
* Shops *(Super Admin only)*
* Users *(Super Admin / Shop Admin)*
* Business Settings
* Logout

---

# 6. Pages

## Login

Purpose

Authenticate users.

Components

* Email
* Password
* Login Button
* Error Message

---

## Dashboard

Widgets

* Total Products
* Total Customers
* Today's Sales
* Revenue
* Outstanding Credit
* Total Expenses
* Low Stock Products
* Recent Sales

Quick Actions

* New Sale
* Add Product
* Add Customer
* Record Expense

---

## Products

### Product List

Features

* Search
* Pagination
* Sort
* Filter
* Export (Future)

Columns

* Product Name
* SKU
* Quantity
* Selling Price
* Minimum Stock
* Status
* Actions

Actions

* View
* Edit
* Delete

Primary Button

* Add Product

---

## Product Form

Fields

* Product Name
* SKU
* Quantity
* Selling Price
* Minimum Stock

Buttons

* Save
* Cancel

---

## Customers

### Customer List

Columns

* Name
* Phone
* Outstanding Credit
* Total Purchases
* Actions

Actions

* View
* Edit
* Delete

Primary Button

* Add Customer

---

## Customer Details

Sections

* Customer Information
* Purchase History
* Outstanding Credit
* Payment History

Actions

* Record Payment
* Edit Customer

---

## Sales

### Sales List

Columns

* Receipt Number
* Date
* Customer
* Cashier
* Payment Method
* Total
* Status
* Actions

Actions

* View
* Print Receipt
* Download PDF
* Correct Sale *(Role Restricted)*
* Reverse Sale *(Role Restricted)*

Primary Button

* New Sale

---

## New Sale

Layout

### Customer Section

* Search Customer
* Walk-in Customer Option

### Product Section

* Search Products
* Add Products
* Quantity Controls

### Summary

* Subtotal
* Total
* Amount Paid
* Remaining Credit

### Payment

* Cash
* Bank Transfer
* POS

Buttons

* Complete Sale
* Cancel

---

## Receipt

Displays

* Business Logo
* Business Information
* Shop Name
* Receipt Number
* Date & Time
* Customer
* Purchased Items
* Total
* Payment Method
* Remaining Credit

Buttons

* Print
* Download PDF

---

## Credit Book

Customer List

Columns

* Customer
* Outstanding Balance
* Last Payment
* Actions

Customer Details

* Credit History
* Payment History

Actions

* Record Payment
* Mark Fully Paid

---

## Expenses

Columns

* Description
* Amount
* Date
* Recorded By

Primary Button

* Record Expense

Expense Form

* Description
* Amount
* Date

Buttons

* Save
* Cancel

---

## Reports

Cards

* Sales Report
* Revenue Report
* Expenses Report
* Credit Report
* Inventory Report

Filters

* Shop
* Date Range

Buttons

* Generate
* Print
* Download PDF

---

## Audit Logs

Columns

* Date
* User
* Role
* Shop
* Action
* Resource
* Reason

Filters

* User
* Shop
* Date
* Action

---

## Shops

*(Super Admin only)*

Columns

* Shop Name
* Address
* Phone
* Manager
* Status

Actions

* Add Shop
* Edit Shop
* Disable Shop

---

## Users

Columns

* Name
* Email
* Role
* Shop
* Status

Actions

* Add User
* Edit User
* Activate
* Deactivate

---

## Business Settings

Sections

* Business Information
* Logo
* Contact Information
* Receipt Footer

Buttons

* Save Changes

---

# 7. Reusable Components

* Button
* Input
* Select
* Checkbox
* Radio Button
* Switch
* Textarea
* Search Box
* Data Table
* Pagination
* Modal
* Drawer
* Dropdown Menu
* Tooltip
* Badge
* Card
* Alert
* Toast Notification
* Loading Spinner
* Empty State
* Confirmation Dialog

---

# 8. Notifications

Success

* Product Added
* Sale Completed
* Payment Recorded

Warning

* Low Stock
* Unsaved Changes

Error

* Validation Failed
* Network Error
* Permission Denied

---

# 9. Responsive Behaviour

## Desktop

* Full sidebar
* Multi-column layouts
* Tables with all columns visible

## Tablet

* Collapsible sidebar
* Optimized spacing
* Responsive tables

## Mobile

* Drawer navigation
* Single-column layouts
* Horizontally scrollable tables
* Large touch targets

---

# 10. Role-Based UI

## Super Admin

* Full navigation
* Multi-shop management
* User management
* Global reports

## Shop Admin

* Shop-specific dashboard
* Product management
* Customer management
* Sales
* Credit book
* Expenses
* Reports
* Audit logs

## Cashier

Visible pages only:

* Dashboard
* Products (View)
* Customers (View)
* New Sale
* Sales History
* Receipt Printing

Cashiers cannot:

* Delete records
* Manage users
* Manage shops
* Edit business settings
* View audit logs

---

# 11. User Experience Guidelines

* Confirm before destructive actions.
* Show loading indicators for all asynchronous operations.
* Display friendly validation messages.
* Use toast notifications for completed actions.
* Preserve filters and search state while navigating.
* Prevent duplicate form submissions.
* Keep important actions within one or two clicks whenever possible.

