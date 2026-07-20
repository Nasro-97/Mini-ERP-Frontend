Build the Purchase Order tab inside the Request Detail page and a dedicated Purchase Order detail page. Keep the exact same design style. The Purchase Order tab is visible to Procurement Manager, Procurement Specialist, and COD only.

Purchase Order tab — fetch and display
GET /purchase-orders/request/:request_id → PurchaseOrderOutput
Returns a single PO or 404 if none exists. Only one PO can exist per request.
If no PO exists show empty state with "+ Create Purchase Order" button — only when request status is approved_by_client.
If PO exists show the PO card.

PO card inside the tab:
Header row: PO number (bold monospace) · Status badge · "View Full Details →" link right
Below: summary grid showing key fields:

Supplier · Currency · Total Amount (bold) · Status · Sent At · Created At

Action buttons below the summary based on status:
StatusButtonsdraftEdit · Send PO · DeletesentAccept POacceptedno actions

Create Purchase Order:
No form needed — just a confirm dialog:
"Create Purchase Order for this request? The PO will be generated from the approved offer version. Supplier and items will be copied automatically."
Confirm button → Cancel button
On confirm:
POST /purchase-orders/
Body: {
  "offer_version_id": "<id of the client_approved offer version>"
}
Response 201: PurchaseOrderOutput
To get the correct offer_version_id:

Fetch GET /offers/request/:request_id → OfferWithVersionsOut
Find the version where status is client_approved
Use that version's id

After success: refetch PO, show success toast "Purchase Order created successfully", show the PO card.

Dedicated Purchase Order page /purchase-orders/:po_id
Fetch:
GET /purchase-orders/:po_id → PurchaseOrderOutput
GET /purchase-orders/:po_id/items → DocumentItemOut[]
PurchaseOrderOutput fields:
id · offer_version_id · request_id · quotation_id · supplier_id · created_by_user_id · po_number · status (draft/sent/accepted) · payment_terms · delivery_terms · lead_time · notes · currency · subtotal · shipping_cost · taxes · other_costs · total_amount · sent_at · created_at · updated_at
Page header:
← Back to Request
[PO Number] — [Status badge]
Supplier: [supplier name] · Created [date]
[Action buttons right aligned]
Action buttons based on status:
StatusButtonsdraftEdit PO · Send PO · Delete POsentAccept POacceptedno actions — show "Accepted" green badge only
Layout — two column same as Request Detail:
Left column (65%):

PO Details card — 2-column grid:

PO Number · Status badge
Currency · Total Amount (bold large)
Subtotal · Shipping Cost
Taxes · Other Costs
Payment Terms · Lead Time
Delivery Terms (full width)
Notes (full width, fixed height box with view more)
Sent At · Created At


Items card — full items table with column visibility toggle and custom columns via extra_data. Items are read-only on PO — no add/edit/delete since items are copied from the offer version automatically.

Right column (35%):

Supplier card — fetch GET /suppliers/:supplier_id — company name · email · phone · address · "View Supplier →" link
Linked Documents card — white card showing:

Request: link to /requests/:request_id
Quotation: link to /quotations/:quotation_id
Offer Version: link to /offers/versions/:offer_version_id




Workflow action API calls:
Send PO (draft only):
PATCH /purchase-orders/:po_id/send
→ status: sent
→ show toast "Purchase Order sent to supplier"
Show confirm dialog first: "Mark this Purchase Order as sent to supplier?"
Accept PO (sent only):
PATCH /purchase-orders/:po_id/accept
→ status: accepted
→ request status changes to po_in_progress automatically
→ show toast "Purchase Order accepted"
Show confirm dialog: "Confirm supplier has accepted this Purchase Order?"
Edit PO (draft only):
Opens edit modal with fields:
FieldTypePayment TermstextDelivery TermstextLead TimetextNotestextareaCurrencytextSubtotalnumberShipping CostnumberTaxesnumberOther CostsnumberTotal Amountnumber — auto-calc from above
PATCH /purchase-orders/:po_id
Body: {
  "payment_terms": "...",
  "delivery_notes": "...",
  "lead_time": "...",
  "notes": "...",
  "currency": "...",
  "subtotal": 1000,
  "shipping_cost": 50,
  "taxes": 0,
  "other_costs": 0,
  "total_amount": 1050
}
Note: the update field is delivery_notes not delivery_terms — this is the correct field name in PurchaseOrderUpdate.
Delete PO (draft only):
DELETE /purchase-orders/:po_id → 204
→ navigate back to request
→ show toast "Purchase Order deleted"
Show confirm dialog first.
After every action: refetch PO, update status badge and buttons without page reload.

Items table on PO page:
Same column visibility toggle and custom columns via extra_data as offer version items.
Items are read-only — no add/edit/delete buttons since PO items are copied automatically from the offer version.
Show all items with all their fields. Empty columns hidden by default, toggle to show.

Empty state when no PO exists and request is not approved_by_client:
Centered icon + "No Purchase Order yet" + "A Purchase Order can be created once the client approves the offer." — no create button.
Empty state when request is approved_by_client and no PO exists:
Centered icon + "Ready to create Purchase Order" + "+ Create Purchase Order" purple button.