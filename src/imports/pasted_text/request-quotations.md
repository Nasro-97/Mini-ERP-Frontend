Build the Quotations tab inside the Request Detail page. Keep the exact same design style. The Quotations tab is visible to Procurement Manager, Procurement Specialist, and COD only.

Quotations tab — fetch and display
Quotations are linked to RFQs. To get quotations for a request, iterate over all RFQs for this request and fetch quotations per RFQ:
GET /rfqs/request/:request_id → array of RFQs
For each RFQ: GET /quotations/rfq/:rfq_id → array of QuotationOutput
Flatten all results into one list sorted by created_at descending.
QuotationOutput fields:
id · rfq_id · supplier_id · quotation_number · supplier_reference · status · currency · subtotal · shipping_cost · taxes · other_costs · total_amount · payment_terms · delivery_terms · lead_time · validity_date · notes · rejection_notes · created_at
Status values and badges:

received → gray pill
under_review → yellow pill
selected → green pill
rejected → red pill
superseded → gray muted pill


Quotations table — full width:
ColumnWidthQuotation #15%Supplier15%RFQ #12%Status badge10%Currency8%Total Amount12%Validity Date13%Actions15%
Table header: text-xs uppercase text-gray-400 tracking-wide border-b border-gray-100
Rows: py-4 border-b border-gray-50 hover:bg-gray-50
Actions column: "View" purple text link + three-dot menu
Three-dot menu per row:

Edit (received only)
Submit for Review (received only)
Approve (under_review only) — COD only
Reject (under_review only, requires rejection notes) — COD only
Reopen (rejected only)


"+ Add Quotation" button top right — opens create modal.
But first check: quotations can only be added when there is at least one RFQ with status sent or quote_received. If no sent RFQs exist show the button as disabled with tooltip "Send an RFQ first before adding a quotation."

Create Quotation modal:
Fields:
FieldTypeRequiredRFQselect from sent/quote_received RFQs for this request — show RFQ # + supplier nameyesSupplier ReferencetextnoCurrencytext (e.g. USD, LYD, EUR)yesSubtotalnumberyesShipping CostnumbernoTaxesnumbernoOther CostsnumbernoTotal Amountnumber — auto-calculate as subtotal + shipping + taxes + other costs, but user can overrideyesPayment TermstextnoDelivery TermstextnoLead Timetext (e.g. "30 days")noValidity Datedate pickeryesNotestextareano
POST /quotations/
Body: {
  "rfq_id": "uuid",
  "supplier_reference": "...",
  "currency": "USD",
  "subtotal": 1000,
  "shipping_cost": 50,
  "taxes": 0,
  "other_costs": 0,
  "total_amount": 1050,
  "payment_terms": "...",
  "delivery_terms": "...",
  "lead_time": "...",
  "validity_date": "ISO datetime",
  "notes": "..."
}
Response 201: QuotationOutput
After creating → also update the RFQ status to quote_received by calling... actually the backend handles this automatically when a quotation is created for that RFQ. Just refetch both the RFQ list and quotation list after success.

Edit Quotation modal (received only):
Same fields as create, pre-filled. All fields optional in PATCH.
PATCH /quotations/:quotation_id
Body: { any updated fields }

Quotation workflow actions:
Submit for Review:
PATCH /quotations/:quotation_id/submit
→ status changes to under_review
Approve (COD only) — show confirm dialog:
PATCH /quotations/:quotation_id/approve
→ status changes to selected
→ request status will change to offer_in_progress automatically
→ refetch request header to update status badge
Reject (COD only) — show modal with required rejection notes input:
PATCH /quotations/:quotation_id/reject?rejection_notes=...
→ status changes to rejected
Reopen:
PATCH /quotations/:quotation_id/reopen
→ status changes back to received
After every action: refetch quotation list and request header.

View Quotation — inline expand row:
Clicking "View" expands a detail panel below that row — full width, bg-gray-50 rounded-8, padding 20px.
Show all quotation fields in a clean 3-column grid:

Quotation # · Supplier Reference · Status
Currency · Subtotal · Shipping Cost
Taxes · Other Costs · Total Amount (bold)
Payment Terms · Delivery Terms · Lead Time
Validity Date · Created At
Notes (full width)
Rejection Notes (full width, only if rejected, amber left border)

Action buttons inside the expanded row matching current status.
Close button top right.

Quotation Items section inside expanded row:
Below the quotation details show a sub-section "Items":
GET /quotations/:quotation_id/items → DocumentItemOut[]
Table: # · Description · Qty · Unit · Unit Price · Total Price · Currency · Origin · HS Code
"+ Add Item" button (received status only):
POST /quotations/:quotation_id/items
Body: {
  "document_type": "quotation",
  "document_id": "<quotation_id>",
  "line_number": <auto>,
  "description": "...",
  "quantity": 1,
  "unit": "pcs",
  "unit_price": 100,
  "total_price": 100,
  "currency": "USD",
  "origin_country": "...",
  "hs_code": "..."
}
Edit item: PATCH /quotations/:quotation_id/items/:line_id
Delete item: DELETE /quotations/:quotation_id/items/:line_id

Empty state:
Centered icon + "No quotations yet" + "Add a quotation from a received RFQ" subtitle.