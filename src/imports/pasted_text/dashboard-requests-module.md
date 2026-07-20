The foundation is working well. Now fix the dashboard data and build the complete Requests module. Keep the exact same design style — white cards, purple accents, Geist font, current sidebar.

Fix Dashboard — connect real data
The three top KPI cards are showing --. Fix them by fetching real data:
Card 1 — rename to "Active Requests"

GET /requests/ → count items where status is not closed and not rejected
Remove "Total Employees" label, replace with "Active Requests"

Card 2 — rename to "Offers in Progress"

GET /offers/ → count all offers
Remove "Attendance Rate" label

Card 3 — rename to "Purchase Orders"

GET /purchase-orders/ → count all POs
Remove "Payroll" label

Fix "Recent Requests" table — it is stuck on Loading. Fetch from GET /requests/ and display the first 8 results. Each row: Request # · Title · Status badge (colored pill) · Priority badge · Created date. Clicking a row navigates to /requests/:id.
Fix "Project Overview" panel — rename to "Requests by Status". Count from the already-fetched requests array:

Blue dot: Active = draft + pending_sales_manager_approval + approved_for_sourcing
Orange dot: In Progress = rfq_in_progress + quotation_review + offer_in_progress + approved_by_client + po_in_progress
Green dot: Completed = shipment_in_progress + delivered + closed

Remove the "Employees" section entirely — replace it with "Recent Offers" table showing last 6 offers from GET /offers/: Offer # · Request # · Current Version · Status badge · Created date.

Build Requests List page /requests — complete
Keep the current clean layout. Implement fully:
Table columns: Request # · Title · Client · Status badge · Priority badge · Created · Actions (three-dot menu)
Three-dot menu per row:

View → navigate to /requests/:id
Edit → navigate to /requests/:id/edit (only show if status is draft)
Delete → confirm dialog → DELETE /requests/:id (only show if status is draft)

Search bar: filter client-side on title and request number.
Status filter dropdown: All Status · Draft · Pending Approval · Approved for Sourcing · RFQ In Progress · Quotation Review · Offer In Progress · Approved by Client · PO In Progress · Closed · Rejected
Priority badges: low = gray pill · normal = blue pill · high = orange pill · urgent = red pill
Empty state: already looks good — keep it.
After any delete: refetch the list automatically.

Build New Request page /requests/new
Full page form. Back link top left "← Back to Requests".
Form card — white, rounded-16, padding 24px:
FieldTypeRequiredTitletext inputyesClientdropdown — fetch from GET /clients/ display company_nameyesClient Referencetext inputyesRequest Datedate picker — default todayyesDeadlinedate pickeryesPriorityselect: low · normal · high · urgentno — default lowDescriptiontextarea 4 rowsnoNotestextarea 3 rowsno
Two buttons bottom right: Cancel (outline) · Create Request (purple primary)
On submit call:
POST /requests/
Body: {
  "request_data": {
    "title": "...",
    "client_id": "...",
    "client_reference": "...",
    "request_date": "ISO datetime",
    "deadline": "ISO datetime",
    "priority": "low|normal|high|urgent",
    "description": "...",
    "notes": "..."
  },
  "items": []
}
On success → navigate to /requests/:id so user can add items immediately.
On error → show inline error message below the form.

Build Request Detail page /requests/:id
Fetch: GET /requests/:id
Layout:

Back link top left "← Back to Requests"
Request number (monospace, muted) + status badge + priority badge in header row
Large title below
Client name · Ref · Created date in subtitle row

Two column layout below:

Left 65%: tabbed content area
Right 35%: info card + workflow actions

Tabs:

Overview
Items
RFQs (shown based on role — see role rules below)
Quotations (shown based on role)
Offers (shown based on role)
Purchase Order (shown based on role)

Each tab shows a placeholder "Coming soon" card for now except Overview and Items which must be fully built.
Overview tab content:
Info grid showing: Description · Notes · Request Date · Required Date · Deadline · Sales Manager Notes (if present) · Assigned To · Procurement Assigned To
Items tab content:
Table: # · Description · Qty · Unit · Notes · Actions
"Add Item" button top right of tab (only if status is draft)
Add item inline form or small modal: Description (required) · Quantity (number, required) · Unit (select: pcs/kg/ton/meter/liter/box/set/roll/other) · Notes
POST /requests/:id/items
Body: { "description": "...", "quantity": 1, "unit": "pcs", "notes": "..." }
Edit item (pencil icon per row, draft only):
PATCH /items/:item_id
Body: { description, quantity, unit, notes }
Delete item (trash icon per row, draft only):
DELETE /items/:item_id → confirm dialog first
Right panel — Info card:
Client name · email · phone (fetch client details from GET /clients/:client_id)
Right panel — Workflow actions card:
Show buttons based on request status AND current user role:
StatusRoleButtonAPIdraftSales Specialist, Sales Manager, COD"Submit for Approval"PATCH /requests/:id/submitpending_sales_manager_approvalSales Manager, COD"Approve" (prompt for notes)PATCH /requests/:id/approve?notes=...pending_sales_manager_approvalSales Manager, COD"Reject" (notes required)PATCH /requests/:id/reject?notes=...approved_for_sourcingProcurement Manager, COD"Assign Procurement" (select user from GET /users/ filtered to procurement roles)PATCH /requests/:id/assign-procurement?assigned_user_id=...
After every workflow action: refetch the request and update status badge automatically without page reload.
Role visibility rules for tabs:

Sales Specialist + Sales Manager: see Overview, Items, Offers tabs only
Procurement Manager + Procurement Specialist: see Overview, Items, RFQs, Quotations, Purchase Order tabs only
COD: sees all tabs


Build Edit Request page /requests/:id/edit
Same form as New Request, pre-filled. Only accessible when status is draft.
Fetch GET /requests/:id to pre-fill.
PATCH /requests/:id
Body: { title, description, client_reference, client_id, priority, deadline, notes }
On success → navigate back to /requests/:id.