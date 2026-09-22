# Pharmacy POS & Inventory Management System

A frontend-only pharmacy store management dashboard, inventory system, POS and billing application using HTML5, CSS3, Bootstrap 5, vanilla JavaScript and LocalStorage.

## Completed architecture

The existing project was audited before changes. Working pages and data structures were preserved where practical rather than replacing the application wholesale.

### Core modules
- Centralized LocalStorage access through `js/storage.js`
- Shared business rules through `js/utils.js`
- Authentication and role-based navigation through `app.js`
- Product and multi-batch inventory management
- FEFO (First Expire, First Out) allocation
- Dynamic expiry and stock status calculation
- POS cart and billing
- Atomic sale validation/commit with rollback on persistence failure
- Sales history and invoice viewing/printing
- Inventory, low-stock, expiring and expired views
- Dashboard statistics and charts
- Reports
- User management with last-active-admin protection
- Category management with protection against deleting categories still in use
- Pharmacy/billing/inventory settings
- Responsive UI and dedicated print styling

## Technology
- HTML5
- CSS3
- Bootstrap 5
- Vanilla JavaScript
- Font Awesome
- SweetAlert2
- Chart.js
- LocalStorage

No backend, database, framework, Node.js runtime, PHP, Firebase or API is required.

## Demo credentials

**Admin**
- Email: `admin@pharmacy.com`
- Password: `admin123`

**Shopkeeper**
- Email: `shopkeeper@pharmacy.com`
- Password: `shop123`

These credentials are demo credentials stored in LocalStorage. Frontend authentication is not production-grade security.

## How to run

1. Extract the project.
2. Open `index.html` directly, or serve the folder with VS Code Live Server.
3. Log in with one of the demo accounts.

The application seeds its demo data on first run.

## Important inventory behavior

Products contain multiple batches. Sellable stock is calculated from non-expired batches only.

When a sale is confirmed:
1. The cart is validated.
2. Current product/batch data is re-read.
3. FEFO allocation is calculated from the earliest-expiring valid batches.
4. Every batch allocation is validated before any inventory mutation.
5. Batch quantities are deducted in an in-memory snapshot.
6. The sale is persisted with product ID, batch ID/number, quantity, price and expiry information.
7. If sale persistence fails, the inventory snapshot is restored.
8. Invoice and sale counters are advanced only after the transaction is saved.

Expired stock remains in inventory for audit/history and is never offered as POS stock.

## Data migration

`Storage.migrateData()` normalizes older product, batch, sale and user records without intentionally deleting existing records. Existing LocalStorage keys are retained.

Primary keys:
- `pharmacy_users`
- `pharmacy_products`
- `pharmacy_sales`
- `pharmacy_categories`
- `pharmacy_settings`
- `pharmacy_current_user`
- `pharmacy_next_product_id`
- `pharmacy_next_sale_id`
- `pharmacy_next_invoice`
- `pharmacy_active_cart`

## QA performed

Static and logical checks were performed on the completed source:
- All local HTML/CSS/JS references resolve.
- JavaScript syntax checks pass with Node `--check`.
- FEFO allocation was exercised against a multi-batch 50 + 100 stock scenario with a 70-unit request: 50 units were allocated from the earlier batch and 20 from the later batch.
- Core stock, expiry, authentication, navigation, form and persistence paths were reviewed.
- Product editing no longer silently discards additional existing batches.
- Duplicate SKU/barcode validation was added.
- Last active admin protection was added.
- Category deletion is blocked while products still use that category.
- Direct page modules were consolidated toward the existing Storage/Utils architecture.

## Frontend-only limitation

LocalStorage is appropriate for a local/demo application, but it is not a secure multi-user backend. Passwords, sessions and business records can be inspected or modified by a user with browser access. A production pharmacy deployment would require server-side authentication, authorization, transactional persistence, audit logging and appropriate regulatory/security controls.
