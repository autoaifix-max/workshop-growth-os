# Workshop Growth OS — Automotive Service Digital Transformation Roadmap

## Product direction

Workshop Growth OS is intended to become an Arabic-first digital operating platform for automotive repair businesses, not merely a booking or workshop-management application. It should connect the customer, vehicle, service history, diagnosis, estimate approval, workshop execution, parts, payment, handover, and retention into one traceable workflow.

**Product promise:** help independent workshops operate more professionally, reduce missed work and communication gaps, improve customer trust, and understand where time and revenue are being lost.

This document defines product direction and acceptance criteria. It does not claim that planned capabilities already exist.

## Product principles

1. **Operational truth before AI:** every AI recommendation must use available, permission-scoped data and distinguish verified facts from suggestions.
2. **Tenant isolation by design:** every customer, vehicle, booking, work order, estimate, invoice, attachment, and audit event must remain scoped to the authorized workshop.
3. **Human approval for consequential actions:** no automatic customer commitment, estimate approval, payment, vehicle handover, or external message without the required permission and approval.
4. **Traceable lifecycle:** key status changes record actor, timestamp, prior state, new state, and relevant reason.
5. **API-first and incremental:** add capabilities through stable contracts; avoid duplicate runtimes or parallel implementations of existing core modules.
6. **Arabic-first, mobile-first:** RTL is the default experience, especially for reception staff, technicians, and workshop owners using phones.
7. **Safe integrations:** external diagnostic devices, WhatsApp, accounting, and payment providers are adapters, not hard dependencies for the core workflow.
8. **Prove value in real workshops:** prioritize measurable workflow outcomes and customer willingness to pay over feature count.

## Target users and jobs to be done

- **Workshop owner/manager:** see today's workload, work in progress, bottlenecks, approvals waiting, unpaid invoices, and repeat-customer opportunities.
- **Service advisor/receptionist:** register the customer and vehicle once, book work, document symptoms, obtain approvals, and keep the customer informed.
- **Technician:** receive a clear work order, record inspection findings, request parts or additional work, and document completion.
- **Customer:** know what was reported, what was found, what is proposed, what was approved, and what was completed.
- **Platform operator:** onboard workshops safely, support them, inspect audit trails, and monitor reliability without accessing data beyond authorized scope.

## Differentiation strategy

### 1. A complete repair journey, not disconnected screens
Connect customer → vehicle → booking → check-in/diagnosis → estimate → explicit customer approval → work order → parts/labor → quality check → invoice/payment → handover → follow-up. Enforce valid transitions and prevent duplicate work orders for one booking.

### 2. A trustworthy digital vehicle record
Build a chronological service history containing visits, mileage, customer-reported symptoms, findings, approved work, replaced parts, invoices, and follow-up recommendations. Only store records supported by user input or connected evidence; do not invent vehicle history.

### 3. Approval-centered customer communication
Provide a clear estimate and a record of the customer's decision. Prepare customer messages and reminders, but require human review where policy demands it. WhatsApp integration must respect Meta opt-in, templates, permissions, and human handoff requirements.

### 4. Workshop performance intelligence
Once operational data is reliable, provide owner-focused measures such as booking conversion, approval delay, cycle time, work-in-progress age, comeback rate, average repair order value, parts delay, and overdue receivables. Define each metric and its data source before displaying it.

### 5. AI service copilot, introduced with guardrails
Start with low-risk assistance: summarize technician notes, organize symptoms, draft customer explanations, generate inspection checklists, and surface missing information. Diagnostic suggestions must be labeled as hypotheses, show supporting evidence, and never replace technician judgment. Do not claim direct diagnostic-device integration until a specific device/protocol is tested.

### 6. Multi-workshop SaaS foundations
Support multiple workshops with explicit membership, role-based access, active-workshop context, auditability, safe onboarding, data export, and clear separation of tenant configuration. A platform administrator must not become an implicit route around tenant policies.

## Delivery sequence and exit criteria

### Phase 0 — Prove the existing foundation
- Inventory implemented routes, schemas, migrations, policies, UI, and tests.
- Run lint, typecheck, unit tests, and production build.
- Add isolated integration coverage for customer → vehicle → booking → work order.
- Prove two-workshop isolation for reads, inserts, updates, and relationship identifiers.
- Keep production Supabase unchanged during test work.
- Exit only with recorded test results and documented blockers; empty CI output is not a pass.

### Phase 1 — Make the core workflow dependable
- Establish consistent API response/error contracts and input validation.
- Validate ownership and tenant scope for every linked identifier.
- Make booking-to-work-order conversion idempotent and safe under retries/concurrency.
- Add audit events for consequential state transitions.
- Document and test allowed status transitions and authorization rules.
- Exit when workflow and tenant-isolation tests pass in a disposable test environment.

### Phase 2 — Make the workshop usable day to day
- Add or complete sign-in, workshop onboarding, and membership/role management.
- Improve mobile-first Arabic RTL workflows for reception and technicians.
- Add check-in notes, odometer, symptoms, inspection findings, and evidence attachments with access controls.
- Add estimates, line items, explicit approval/decline, and revision history before expanding into invoices and payments.
- Exit when a real workshop can complete a representative repair journey without database-console intervention.

### Phase 3 — Customer experience and retention
- Customer-facing booking request and status tracking.
- Consent-aware messaging, reminders, and human handoff.
- Digital service history and post-service follow-up.
- Exit after testing message failures, opt-out, duplicate events, and permission boundaries.

### Phase 4 — Measurable business intelligence
- Owner dashboard with definitions, source data, and time ranges.
- Operational alerts for stalled approvals, aged work orders, parts delays, and overdue balances.
- Baseline and measure improvements with pilot workshops before marketing quantified claims.

### Phase 5 — Carefully bounded AI and integrations
- Technician copilot and structured diagnostic assistance with evidence and confidence limits.
- Optional diagnostic-device adapters only for devices/protocols that have been verified.
- Optional accounting, payment, parts, and external communication adapters.
- Exit only with evaluation cases, audit logs, human override, provider failure handling, and tenant-scoped authorization.

## Initial success measures

Capture a baseline before setting targets:
- Percentage of bookings that become completed work orders.
- Time from check-in to estimate and from estimate to customer decision.
- Median repair cycle time and number of stalled work orders.
- Percentage of work orders with documented customer approval.
- Comeback rate and missing service-record rate.
- Repeat booking rate, overdue receivables, and revenue per completed work order.
- Critical tenant-isolation test pass rate and production incident count.

Do not advertise numerical improvements until pilot data supports them.

## Out of scope until the core is proven

- Autonomous diagnosis that directly instructs vehicle repair without technician review.
- Unverified integrations with diagnostic hardware.
- Automatic customer messages without consent and policy controls.
- Broad microservice decomposition before actual scale or team boundaries justify it.
- Production schema changes made merely to unblock local tests.
- Cosmetic dashboards that lack reliable underlying data.

## Immediate next actions

1. Review current open pull requests and CI status before choosing overlapping implementation work.
2. Finish isolated workflow and two-tenant integration tests without touching production Supabase.
3. Convert verified gaps into small, acceptance-test-driven issues.
4. Pilot the core workflow with one real workshop, then add a second workshop to test tenant boundaries and operational usability.
5. Prioritize changes by customer value, risk reduction, and time-to-first-paid-workshop—not by number of features.

## Relationship to implementation

This roadmap is a product planning artifact. It does not assert that login/onboarding, estimates, invoices, WhatsApp, audit events, analytics, AI assistance, or diagnostic-device integration are implemented. Verify the repository and test evidence before marking any capability complete.
