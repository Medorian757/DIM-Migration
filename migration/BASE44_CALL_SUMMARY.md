# Base44 API Call Summary

The full line-by-line inventory is in `base44-api-call-map.csv`.

## CRUD-heavy files

- `src/pages/Inventory.jsx` — inventory/category/supplier/location reads; item/category create-update-delete; history creation.
- `src/pages/Categories.jsx` — category CRUD and inventory count checks.
- `src/pages/Suppliers.jsx` — supplier CRUD and inventory reference checks.
- `src/pages/Locations.jsx` — location CRUD and item location cleanup on rename/delete.
- `src/components/inventory/CSVImportExport.jsx` — bulk create/update/delete inventory items.
- `src/components/inventory/BulkUpdateBar.jsx` — bulk item updates.
- `src/components/inventory/ItemHistoryPanel.jsx` — history filter by item.

## Auth/user files

- `src/App.jsx`
- `src/Layout.jsx`
- `src/lib/AuthContext.jsx`
- `src/lib/PageNotFound.jsx`
- `src/components/usePermissions.jsx`
- `src/components/ProfileSetup.jsx`
- `src/pages/Settings.jsx`

## Integration files

- `src/components/inventory/ItemForm.jsx` — file upload.
- `base44/functions/checkLowStock/entry.ts` — daily alert email function.
