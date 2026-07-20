# Commerce-Flow — System Proposal
**A Plain-English Overview of Purpose, Workflow, and Page Interactions**

---

## What Is Commerce-Flow?

Commerce-Flow is an internal business management system — a mini ERP — designed to help a company manage the full lifecycle of a commercial deal, from the first conversation with a client all the way through to a physical shipment arriving at the door.

In plain terms, the system answers four questions a business always needs to track:

- **Who are we selling to, and what do they want?** (Sales)
- **What did we promise them, and at what price?** (Offers)
- **Who is supplying it, and what did we agree to pay?** (Procurement)
- **Has it shipped, and when will it arrive?** (Logistics)

Every module in the system exists to answer one of these questions, and they are all connected in a single, linear business flow.

---

## The Core Business Flow

The entire system follows one logical chain. Understanding this chain makes every page in the system make sense:

```
Client → Deal → Offer → Procurement Request → RFQ → Quote → Purchase Order → Shipment
```

Here is what each step means in plain English:

1. A **Client** comes to the business with a need.
2. That need is recorded as a **Deal** — a potential piece of business.
3. The sales team prepares an **Offer** — a priced proposal sent to the client.
4. The client approves the offer, which creates a **Procurement Request** — an internal instruction to go buy the goods.
5. The procurement team sends out **RFQs** (Requests for Quotation) to known **Suppliers**, asking them to quote a price.
6. Suppliers respond with quotes. The team selects the best one, which automatically generates a **Purchase Order** sent to that supplier.
7. The goods are dispatched, creating a **Shipment** that is tracked until delivery.

Every page in Commerce-Flow exists somewhere along this chain.

---

## Module by Module — What Each Part Does

### 1. The Dashboard

**Purpose:** A single-screen overview of the entire business at a glance.

The dashboard is the first page anyone sees when they log in. It shows four key numbers at the top — total deals in the system, total clients, open procurement requests, and active shipments. Below those, it shows charts: monthly revenue over time, how offers are distributed by status, and where shipments and procurement requests currently stand.

No actions are taken from this page. It is purely a health check — a way for a manager to understand, in under a minute, whether the business is running well or needs attention.

---

### 2. The Sales Module

The Sales module covers everything from first contact with a client through to a signed-off offer. It has three main areas.

#### Clients

This is the company's address book for customers. Every client has a profile recording their name, contact person, email, phone, country, industry, and whether they are active, inactive, or a prospect.

Users can search and filter the client list, create new clients, edit existing ones, or remove them. The client record is foundational — it is referenced by deals and offers throughout the system.

#### Deals

A deal represents a business opportunity. When a client expresses interest in purchasing something, a deal is created and linked to their client record.

Each deal has a title, a priority level (low, medium, high, or critical), and a status that tracks its progress through the pipeline — from draft and review, through sourcing and lead, to active, won, or lost.

Inside a deal, users can do three things that matter greatly to the business:

- Add **line items** — a breakdown of exactly what the client wants, item by item.
- Upload **attachments** — technical drawings, specifications, client emails, or any supporting documents.
- View **linked offers** — all the price proposals that have been sent to the client for this deal.

The deal detail page is therefore a central hub. It connects the client's request to the commercial response (the offer) and keeps all supporting material in one place.

#### Offers

An offer is a formal price proposal sent to a client for a specific deal. It contains commercial terms — currency, validity date, payment terms, delivery terms, lead time — and a line-by-line breakdown of what is being sold and at what price.

Offers follow a structured approval workflow with two parallel tracks: a **technical** review (is the product or service correct?) and a **commercial** review (is the pricing and terms right?). Each track moves independently through the following statuses: Draft → Submitted → Under Evaluation → Approved (or Rejected / Revision Required / Comments Received).

When both the technical and commercial parts of an offer are approved by the client, the system allows the user to "Send to Procurement" — which is the handover point between Sales and the Procurement module. This action creates a Procurement Request automatically.

Offers also maintain a **version history**. If the client requests changes, the user can create a revision — a new version of the offer — without losing the original. This gives a full audit trail of what was proposed and when.

---

### 3. The Procurement Module

The Procurement module takes over once a deal has been commercially agreed. Its job is to go find and purchase the goods or services that were promised to the client.

#### Suppliers

The system maintains a supplier directory alongside the client directory. Each supplier has contact details, a country, a product or service category, and a rating. The team uses this list when deciding who to approach for quotes.

#### Procurement Requests

When Sales approves an offer, a Procurement Request is automatically created. This is the instruction to the procurement team: "We have committed to delivering this — now go buy it."

The procurement request detail page is the most operationally intensive page in the system. From here, the user can:

- Select one or more suppliers from the directory and send them an **RFQ** (a formal request asking them to submit a price).
- Record the quotes that come back from each supplier, including the amount, currency, and validity date.
- Mark a supplier as having declined to quote.
- Compare all received quotes and select a winner — the system then automatically generates a **Purchase Order** for that supplier.

This page also shows **change alerts** — notifications that something on the linked offer has changed since the procurement request was raised (for example, if the client requested a last-minute amendment). These alerts must be acknowledged so the procurement team is aware.

#### Purchase Orders

A Purchase Order is the formal commitment to a supplier. It records the agreed amount, the supplier, and its current status. From the purchase order list, the team can update the status as the order progresses, and — when the supplier confirms dispatch — trigger the creation of a Shipment in the Logistics module.

---

### 4. The Logistics Module

Once goods have been ordered and dispatched, the Logistics module tracks them to the door.

#### Shipments

Each shipment is linked back to a Purchase Order and records the practical tracking information: the carrier, the tracking number, and the expected arrival date (ETA). Users can update this information as it comes in — for example, when the carrier provides a tracking number or when the ETA changes.

#### Delivery Schedule

The delivery schedule is a calendar or timeline view that plots all active shipments by their expected arrival date. This gives the logistics team — and management — a visual picture of what is arriving and when, without having to look through the shipments table row by row.

---

### 5. Users and Roles

This module controls who can access the system and what they can do.

Users are created with a name, email, phone, and a role. Roles define what a user is allowed to see and do — a sales representative might be able to manage clients and deals but not have access to procurement or financial data, for example.

Roles are defined with a name, a description, and a list of specific permissions. The permissions are granular enough to control individual actions across the system.

---

### 6. Settings

The Settings page holds company-level configuration: the company name, a logo, the default currency used in offers and purchase orders, and whether email notifications should be sent when procurement events occur. This page is currently planned but the backend endpoints for it still need to be defined.

---

## How the Pages Connect to Each Other

The following describes the journey a user would take through the system for a typical deal, page by page.

**Step 1 — Log in.** The user lands on the **Dashboard** (`/`). They see there are 3 open procurement requests and 2 active shipments. Everything looks manageable.

**Step 2 — A new client calls.** The user navigates to **Clients** (`/clients`) and clicks "New Client" to open the **New Client form** (`/clients/new`). They fill in the company details and save.

**Step 3 — The client has a specific need.** The user goes to **Deals** (`/deals`) and creates a **New Deal** (`/deals/new`), linking it to the client they just created. They set a priority and note the client reference number.

**Step 4 — Building the deal.** They open the **Deal Detail** page (`/deals/:id`) and add line items — the specific products the client wants. They upload the client's technical specification as an attachment.

**Step 5 — Pricing it up.** From the Deal Detail page, they click "New Offer" to go to the **New Offer form** (`/offers/new`). They select the currency, enter the payment and delivery terms, and fill in unit prices for each line item. The total calculates automatically.

**Step 6 — Submitting the offer.** On the **Offer Detail** page (`/offers/:id`), they submit the technical part and the commercial part to the client for review. The statuses move from Draft to Submitted.

**Step 7 — Client responds.** The client reviews and approves both parts. The user records the client's response on the Offer Detail page. Both tracks are now Approved.

**Step 8 — Handover to procurement.** With both parts approved, the "Send to Procurement" button becomes available. The user clicks it — a **Procurement Request** is automatically created.

**Step 9 — Sourcing.** The procurement team opens the **Procurement Request Detail** page (`/procurement-requests/:id`). They select three suppliers from the directory and send RFQs. Two suppliers respond with quotes. The team picks the better one and clicks "Select & Create PO" — a **Purchase Order** is generated automatically.

**Step 10 — Goods are dispatched.** From the **Purchase Orders** list (`/purchase-orders`), the user triggers "Create Shipment" once the supplier confirms dispatch. A **Shipment** record is created.

**Step 11 — Tracking the delivery.** The logistics team opens the **Shipments** list (`/shipments`) and enters the carrier name and tracking number. The delivery appears on the **Delivery Schedule** (`/delivery-schedule`) plotted against its ETA.

**Step 12 — Deal complete.** The user goes back to the **Deal** and updates its status to "Won." The Dashboard updates to reflect the new revenue and the closed shipment.

---

## Summary of the System's Value

Commerce-Flow exists to prevent things from falling through the gaps between departments. Without a system like this, a sales team might promise delivery terms that procurement cannot honour, or a purchase order might be raised without knowing what the client actually approved. Each module is deliberately linked to the next so that every action — from a client phone call to a delivery note — is traceable, auditable, and visible to the right people at the right time.

The system is not designed to be complex. It is designed to make a complex business process feel simple, step by step.

---

*Prepared as a plain-English system overview for Commerce-Flow ERP*
