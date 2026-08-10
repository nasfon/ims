# API Specification

# Inventory Management System (IMS)

**Version:** 1.0 (MVP)

**API Version:** v1

**Architecture:** REST API

**Authentication:** Supabase Auth (JWT)

**Data Format:** JSON

---

# Base URL

```
/api/v1
```

---

# Authentication

All protected endpoints require a valid JWT access token.

Authorization Header

```
Authorization: Bearer <access_token>
```

---

# Standard Response Format

## Success

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {}
}
```

## Error

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {}
}
```

---

# Authentication

## Login

POST `/auth/login`

Request

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

Response

```json
{
  "accessToken": "...",
  "user": {}
}
```

---

## Logout

POST `/auth/logout`

---

# Shops

## Get Shops

GET `/shops`

## Create Shop

POST `/shops`

## Get Shop

GET `/shops/{shopId}`

## Update Shop

PATCH `/shops/{shopId}`

## Delete Shop

DELETE `/shops/{shopId}`

---

# Users

## Get Users

GET `/users`

Supports:

* Pagination
* Search
* Filter by role

---

## Create User

POST `/users`

## Get User

GET `/users/{userId}`

## Update User

PATCH `/users/{userId}`

## Delete User

DELETE `/users/{userId}`

---

# Products

## Get Products

GET `/products`

Query Parameters

* page
* limit
* search
* lowStock=true

---

## Create Product

POST `/products`

Request

```json
{
  "name": "Product",
  "sku": "SKU001",
  "quantity": 100,
  "sellingPrice": 1500,
  "minimumStock": 10
}
```

---

## Get Product

GET `/products/{productId}`

---

## Update Product

PATCH `/products/{productId}`

---

## Delete Product

DELETE `/products/{productId}`

---

# Customers

## Get Customers

GET `/customers`

Supports

* Search by name
* Search by phone

---

## Create Customer

POST `/customers`

---

## Get Customer

GET `/customers/{customerId}`

---

## Update Customer

PATCH `/customers/{customerId}`

---

## Delete Customer

DELETE `/customers/{customerId}`

---

## Customer Purchase History

GET `/customers/{customerId}/sales`

---

## Customer Credit

GET `/customers/{customerId}/credit`

---

# Sales

## Get Sales

GET `/sales`

Supports

* Date filter
* Customer filter
* Payment method
* Cashier

---

## Create Sale

POST `/sales`

Request

```json
{
  "customerId": "uuid",
  "paymentMethod": "cash",
  "discount": 100,
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ]
}
```

---

## Get Sale

GET `/sales/{saleId}`

---

## Correct Sale

PATCH `/sales/{saleId}`

Requires:

* Reason

---

## Reverse Sale

POST `/sales/{saleId}/reverse`

Request

```json
{
  "reason": "Incorrect quantity"
}
```

---

## Print Receipt

GET `/sales/{saleId}/receipt`

---

## Download PDF Receipt

GET `/sales/{saleId}/receipt/pdf`

---

# Credit Book

## Outstanding Credit

GET `/credits`

---

## Record Payment

POST `/credits/payments`

Request

```json
{
  "customerId": "uuid",
  "saleId": "uuid",
  "amount": 5000,
  "paymentMethod": "cash"
}
```

---

## Credit History

GET `/credits/payments`

---

# Expenses

## Get Expenses

GET `/expenses`

Supports

* Date filter

---

## Record Expense

POST `/expenses`

Request

```json
{
  "description": "Fuel",
  "amount": 10000,
  "expenseDate": "2026-08-07"
}
```

---

## Update Expense

PATCH `/expenses/{expenseId}`

---

## Delete Expense

DELETE `/expenses/{expenseId}`

---

# Dashboard

## Dashboard Summary

GET `/dashboard`

Returns

* Total Products
* Total Customers
* Today's Sales
* Revenue
* Outstanding Credit
* Expenses
* Low Stock Count
* Recent Sales

---

# Reports

## Sales Report

GET `/reports/sales`

Query

* startDate
* endDate

---

## Revenue Report

GET `/reports/revenue`

---

## Expense Report

GET `/reports/expenses`

---

## Credit Report

GET `/reports/credits`

---

## Inventory Report

GET `/reports/inventory`

---

# Stock

## Low Stock

GET `/stock/low`

---

## Stock History

GET `/stock/history`

---

# Audit Logs

## Get Audit Logs

GET `/audit-logs`

Supports

* User
* Date
* Action

---

# Business Settings

## Get Settings

GET `/settings/business`

---

## Update Settings

PATCH `/settings/business`

---

# HTTP Status Codes

| Code | Meaning               |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 204  | No Content            |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 422  | Validation Error      |
| 500  | Internal Server Error |

---

# API Design Principles

* RESTful endpoint naming
* Versioned API (`/api/v1`)
* JWT authentication via Supabase
* JSON request and response bodies
* Pagination for list endpoints
* Filtering and searching where applicable
* Consistent error responses
* Role-Based Access Control (RBAC)
* Shop-level data isolation using Row Level Security (RLS)
* Audit logging for sensitive operations

