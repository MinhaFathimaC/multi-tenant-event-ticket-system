# multi-tenant-event-ticket-system
# NexTicket | Multi-Tenant Event & Ticket Reservation System

A production-grade, multi-tenant event management and ticket reservation platform engineered with **ACID transactional concurrency control**, **10-minute temporary reservation holds**, **Redis read caching**, and an **automated background queue worker**.

---

## 1. System Architecture & Core Highlights

- **Zero Double-Booking Guarantee**: Employs SQLite Write-Ahead Logging (`WAL`) with `BEGIN IMMEDIATE` / PostgreSQL atomic transactions to prevent race conditions and overselling under extreme concurrency.
- **10-Minute Temporary Hold Engine**: When an attendee selects tickets, seats are placed on a strict 10-minute hold (`expires_at = NOW() + 10 mins`). A visual countdown bar alerts users, and expired holds are automatically returned to the inventory pool.
- **Multi-Tenancy & RBAC**: Strict separation across 3 roles:
  - **Platform Admin**: System health diagnostics, multi-tenant organization directory, global audit logs, and in-flight concurrency stress testing.
  - **Organizer**: Branded organization portal, event publication, tier pricing/capacities, sales cut-off deadlines, and real-time revenue analytics.
  - **Attendee**: Marketplace discovery, live tier availability, 10-minute hold reservation, payment simulation, and verifiable QR admission passes.
- **Caching Layer (Redis)**: Caches active event listings and tier details to withstand heavy read traffic, with automated cache invalidation upon hold creation, expiration, or checkout.
- **Background Cron Worker**: Runs every 10 seconds to detect and release expired holds, restoring capacity back to the available pool.
- **Payment Gateway Simulation**: Mock gateway providing asynchronous approval, decline (insufficient funds), and network timeout simulation.
- **Interactive Concurrency Stress Test Suite**: Built directly into both the Admin UI and a standalone benchmark script to simulate up to 50 simultaneous booking attempts, proving 0 oversold tickets.

---

## 2. Relational Data Model (ER Architecture)

Complete specifications and Mermaid diagram are documented in docs/ER_DIAGRAM.md.

```mermaid
erDiagram
    TENANTS ||--o{ USERS : "employs"
    TENANTS ||--o{ EVENTS : "hosts"
    TENANTS ||--o{ ORDERS : "settles"
    
    USERS ||--o{ RESERVATIONS : "places hold"
    USERS ||--o{ ORDERS : "purchases"
    
    EVENTS ||--|{ TICKET_TIERS : "defines pricing"
    EVENTS ||--o{ RESERVATIONS : "allocates"
    
    TICKET_TIERS ||--o{ RESERVATIONS : "locks seats"
    TICKET_TIERS ||--o{ ORDER_ITEMS : "contains"
    
    RESERVATIONS ||--o| ORDERS : "converts upon checkout"
    ORDERS ||--|{ ORDER_ITEMS : "generates tickets"
    ORDERS ||--|| TRANSACTIONS : "captures payment"
