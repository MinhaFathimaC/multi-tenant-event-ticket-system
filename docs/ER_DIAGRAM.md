# Entity-Relationship (ER) Diagram & Data Architecture

## Multi-Tenant Event & Ticket Reservation System

This document outlines the relational data model, entity relationships, constraint enforcement, and concurrency isolation boundaries of the platform.

---

### 1. Visual Mermaid ER Diagram

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "employs / organizes"
    TENANTS ||--o{ EVENTS : "hosts / manages"
    TENANTS ||--o{ ORDERS : "receives revenue"
    
    USERS ||--o{ RESERVATIONS : "places temporary hold"
    USERS ||--o{ ORDERS : "purchases"
    
    EVENTS ||--|{ TICKET_TIERS : "defines pricing & capacity"
    EVENTS ||--o{ RESERVATIONS : "allocated for"
    
    TICKET_TIERS ||--o{ RESERVATIONS : "reserves seats"
    TICKET_TIERS ||--o{ ORDER_ITEMS : "contains"
    
    RESERVATIONS ||--o| ORDERS : "converts upon checkout"
    
    ORDERS ||--|{ ORDER_ITEMS : "contains individual tickets"
    ORDERS ||--|| TRANSACTIONS : "settled via payment gateway"

    TENANTS {
        string id PK "Unique Tenant ID (e.g. tenant-apex-1)"
        string name "Organization legal/display name"
        string slug UK "URL friendly identifier"
        string description "Tenant bio and promoter details"
        string logo_url "Branding asset URL"
        datetime created_at "Timestamp"
    }

    USERS {
        string id PK "UUID"
        string tenant_id FK "Nullable: links Organizers to Tenant"
        string name "Full Name"
        string email UK "User unique login email"
        string password_hash "Bcrypt salted hash"
        string role "ADMIN | ORGANIZER | ATTENDEE"
        datetime created_at "Registration timestamp"
    }

    EVENTS {
        string id PK "UUID"
        string tenant_id FK "Owning Tenant Organization"
        string title "Event Name"
        string slug UK "SEO routing slug"
        string description "Full Markdown description"
        string category "Technology | Concert | Business | Gaming"
        string banner_url "High-resolution hero visual"
        string venue "Physical address or virtual venue"
        datetime event_date "Event commencement timestamp"
        datetime sales_cutoff_date "Hard cutoff for ticket purchasing"
        string status "DRAFT | ACTIVE | PAST | CANCELLED"
        int view_count "Impression telemetry"
        datetime created_at "Creation timestamp"
        datetime updated_at "Modification timestamp"
    }

    TICKET_TIERS {
        string id PK "UUID"
        string event_id FK "Parent Event"
        string name "Tier Name (e.g., VIP Sky Deck, Early Bird)"
        float price "Ticket price in USD"
        int total_capacity "Hard inventory limit"
        string perks "Delimited list of tier inclusions"
        datetime created_at "Creation timestamp"
    }

    RESERVATIONS {
        string id PK "UUID"
        string user_id FK "Attendee holding seats"
        string event_id FK "Event identifier"
        string tier_id FK "Ticket Tier being reserved"
        int quantity "Count of held tickets"
        string status "HELD | COMPLETED | EXPIRED | CANCELLED"
        datetime held_at "Hold initiation timestamp"
        datetime expires_at "Held_at + 10 minutes (TTL threshold)"
        string client_ip "Audit telemetry"
    }

    ORDERS {
        string id PK "UUID"
        string order_number UK "Formatted code (e.g. ORD-2026-89412)"
        string tenant_id FK "Receiving Tenant"
        string user_id FK "Purchasing Attendee"
        string reservation_id FK "Originating 10-min reservation"
        float total_amount "Order gross total"
        string status "PENDING | PAID | FAILED | REFUNDED"
        datetime created_at "Order placement timestamp"
    }

    ORDER_ITEMS {
        string id PK "UUID"
        string order_id FK "Parent Order"
        string tier_id FK "Tier purchased"
        string ticket_code UK "Unique admission identifier (e.g. TCK-VIP-84192)"
        string qr_data "Cryptographic verification payload"
        float price "Settled unit price"
        string attendee_name "Assigned ticket holder"
    }

    TRANSACTIONS {
        string id PK "UUID"
        string order_id FK "Settled Order"
        string gateway_tx_id UK "Payment processor authorization code"
        float amount "Captured charge amount"
        string currency "USD"
        string status "SUCCESS | DECLINED | TIMEOUT | REFUNDED"
        string payment_method "CREDIT_CARD | DEBIT_CARD"
        string gateway_response "JSON audit record from processor"
        datetime created_at "Settlement timestamp"
    }
```

---

### 2. Relational Schema & Cardinality Specifications

| Relation | Cardinality | Business Rule & Integrity Enforcement |
| :--- | :--- | :--- |
| **Tenants $\to$ Events** | `1 : N` | Each event is hosted by exactly one organization (Tenant). Deleting a tenant cascades to all events hosted by that organization. |
| **Tenants $\to$ Users** | `1 : N` | An `ORGANIZER` belongs to an assigned Tenant. Platform `ADMIN` and `ATTENDEE` users have `tenant_id = NULL`. |
| **Events $\to$ Ticket Tiers** | `1 : N` | An event defines one or more tiered ticket types (e.g. VIP, General Admission). Each tier maintains its own capacity ceiling. |
| **Ticket Tiers $\to$ Reservations** | `1 : N` | High-concurrency allocation pool. Available inventory is dynamically computed as: $\text{Available} = \text{Capacity} - (\sum \text{Paid} + \sum \text{Active Holds})$. |
| **Reservations $\to$ Orders** | `1 : 1` | A valid temporary reservation converts into an `Order` upon successful payment authorization before `expires_at`. |
| **Orders $\to$ Order Items** | `1 : N` | If an order reserves 3 VIP tickets, 3 individual `order_items` are generated, each with a unique barcode/QR verification code. |
| **Orders $\to$ Transactions** | `1 : 1` | Every confirmed order contains a verifiable transaction log storing gateway audit records and auth tokens. |

---

### 3. Concurrency Invariants & Double-Booking Protection

```
Available Inventory = Total Tier Capacity - (Confirmed Orders + Active Unexpired Holds)
```

1. **Transactional Isolation**: All reservation attempts execute inside an immediate transaction (`BEGIN IMMEDIATE` in SQLite / `SELECT ... FOR UPDATE` in PostgreSQL).
2. **Atomic Verification**: The transaction queries both active holds (`expires_at > NOW() AND status = 'HELD'`) and confirmed sales before validating `quantity <= Available`.
3. **Automatic Hold Expiration**: Expired reservations (`expires_at <= NOW()`) are purged by a background worker every 10 seconds, releasing tickets without manual intervention.
