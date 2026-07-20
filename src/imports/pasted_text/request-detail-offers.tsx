Build the Offers tab inside the Request Detail page and a dedicated Offer Version detail page. Keep the exact same design style. The Offers tab is visible to Sales Specialist, Sales Manager, and COD only.

Offers tab — fetch and display
GET /offers/request/:request_id → OfferWithVersionsOut
Only one offer can exist per request. If no offer exists show empty state with "+ Create Offer" button (only when request status is offer_in_progress). If offer exists show the offer card with all its versions.

Offer card layout inside the tab:
Header row: Offer number (bold monospace) · "current v[n]" muted label · "+ New Version" button right (only when conditions met)
Below header: one row per version, newest first:
ColumnContentVersionv1, v2, v3... pillStatus badgecolored pillTotal Priceformatted numberValidity DatedateCOD Responsenotes preview or "No response yet" mutedClient Responsenotes preview or "No response yet" mutedActions"View" link + three-dot menu
Status badges:

draft → gray
pending_cod_approval → yellow
cod_approved → green
cod_rejected → red
changes_requested → orange
sent_to_client → blue
client_approved → green
client_rejected → red
revision_requested → amber

Three-dot menu per version row:

View → navigate to /offers/versions/:version_id
Delete → only if status is draft with confirm dialog

"+ New Version" button — only show when latest version status is client_approved or revision_requested:
POST /offers/:offer_id/new-version → OfferVersionOut
→ navigate to the new version page

Create Offer modal — only when request status is offer_in_progress:
Two step process on one form:
Step 1 fields:
FieldTypeRequiredQuotationselect from approved/selected quotations for this request — show quotation number + supplier name + total amountyesPayment TermstextnoDelivery TermstextnoDelivery Periodtext (e.g. "30 days")noValidity Datedate pickernoCountry of OrigintextnoTotal PricenumbernoTotal Price in Letterstext (e.g. "Forty five thousand dollars")noNotestextareano
On submit:
Step 1 — POST /offers/
Body: {
  "request_id": "<current request id>",
  "quotation_id": "<selected quotation id>"
}
Response 201: OfferOut → get versions[0].id
If versions is not in the response (OfferOut doesn't include versions):
GET /offers/request/:request_id → OfferWithVersionsOut
→ get versions[0].id
Step 2 — PATCH /offers/versions/:version_id
Body: {
  "payment_terms": "...",
  "delivery_terms": "...",
  "delivery_period": "...",
  "validity_date": "ISO datetime",
  "country_of_origin": "...",
  "total_price": 45000,
  "total_price_letters": "...",
  "notes": "..."
}
After both steps: close modal, refetch offer, show success toast, navigate to the new version page /offers/versions/:version_id.

Dedicated Offer Version page /offers/versions/:version_id
Fetch:
GET /offers/versions/:version_id → OfferVersionOut
GET /offers/versions/:version_id/items → DocumentItemOut[]
Also fetch the parent offer to get offer number and request link:
GET /offers/:offer_id → OfferWithVersionsOut
Page header:
← Back to Request
[Offer Number] — v[version_number] — [Status badge]
[Action buttons right aligned]
Action buttons based on version status + role:
StatusRoleButtonsdraft or changes_requestedSales Specialist, Sales Manager, CODEdit Version · Submit for COD Approval · Delete Versionpending_cod_approvalCOD onlyApprove · Reject · Request Changescod_approvedSales Specialist, Sales Manager, CODSend to Clientsent_to_clientSales Specialist, Sales Manager, CODClient Approved · Client Rejected · Client Revision Requested
Layout — two column same as Request Detail:
Left column (65%):

Version Details card — 2-column grid:

Payment Terms · Delivery Terms
Delivery Period · Country of Origin
Validity Date · Created At
Total Price (bold large) · Total Price in Letters
Notes (fixed height box with view more)


COD Response card (only if cod_notes not null or status is cod-related) — amber border:

COD Status · COD Notes · COD Actioned At


Client Response card (only if client_notes not null or status is client-related) — blue border:

Client Status · Client Notes · Client Responded At


Items card — full width items table same as quotation items with column visibility toggle and custom columns via extra_data

Right column (35%):

Offer card — Offer number · Quotation link · Request link · Created by · Created at
Version history card — list of all versions from parent offer with their status badges, clicking navigates to that version


Workflow action API calls:
Submit for COD Approval:
PATCH /offers/versions/:version_id/submit
→ status: pending_cod_approval
COD Approve:
PATCH /offers/versions/:version_id/cod-response
Body: { "cod_status": "approved", "cod_notes": "..." }
→ status: cod_approved
COD Reject:
PATCH /offers/versions/:version_id/cod-response
Body: { "cod_status": "rejected", "cod_notes": "..." }
→ status: cod_rejected
COD Request Changes:
PATCH /offers/versions/:version_id/cod-response
Body: { "cod_status": "changes_requested", "cod_notes": "..." }
→ status: changes_requested
Send to Client:
PATCH /offers/versions/:version_id/send
→ status: sent_to_client
Client Approved:
PATCH /offers/versions/:version_id/client-response
Body: { "client_status": "approved", "client_notes": "..." }
→ status: client_approved
→ request status changes to approved_by_client automatically
→ show toast "Client approved — request is now ready for Purchase Order"
Client Rejected:
PATCH /offers/versions/:version_id/client-response
Body: { "client_status": "rejected", "client_notes": "..." }
→ status: client_rejected
Client Revision Requested:
PATCH /offers/versions/:version_id/client-response
Body: { "client_status": "revision_requested", "client_notes": "..." }
→ status: revision_requested
Delete Version (draft only):
DELETE /offers/versions/:version_id → 204
→ navigate back to request
Edit Version (draft or changes_requested):
Opens an edit modal pre-filled with current values. Same fields as create. On save:
PATCH /offers/versions/:version_id
Body: { payment_terms, delivery_terms, delivery_period, validity_date, country_of_origin, total_price, total_price_letters, notes }
After every action: refetch version, update status badge and action buttons without page reload.

Items table on Offer Version page:
Same column visibility toggle and custom columns via extra_data as quotation items.
Items editable only when status is draft or changes_requested.
GET /offers/versions/:version_id/items
POST /offers/versions/:version_id/items
Body: {
  "document_type": "offer_version",
  "document_id": "<version_id>",
  "line_number": <auto>,
  "description": "...",
  ... other fields ...,
  "extra_data": { ... }
}
PATCH /offers/versions/:version_id/items/:line_id
DELETE /offers/versions/:version_id/items/:line_id → 204

Empty state when no offer exists:
Centered icon + "No offer yet" + subtitle "Create an offer once a quotation has been approved" + "+ Create Offer" button (only if request status is offer_in_progress).