# Workshop Growth OS — Differentiators V1

**Status:** Proposed product contract; not a claim that these capabilities are already implemented.
**Target:** Independent automotive repair workshops in Saudi Arabia.
**Product promise:** Help the owner recover missed revenue, obtain defensible customer approvals, and bring vehicles back at the right time—not merely record jobs.

## Product strategy

Do not compete on a long feature checklist. Build a small set of workflows whose value can be measured against workshop records. Every recommendation must show its source data, uncertainty, and next action. No autonomous repair diagnosis, financial claims from incomplete data, or messages sent without configured consent and channel access.

## Differentiator 1 — Revenue Leakage Radar (P1)

### Owner experience
A daily view of work orders with actionable exceptions:
- Parts issued but not included on the invoice, only when inventory-issue and invoice-line records exist.
- Work exceeding estimated labor time, only when both estimate and actual time are recorded.
- Discounts outside the workshop's configured threshold.
- Work completed but still marked open, or an open order with no recorded next action.
- Repeat repair visits for the same vehicle and related symptom within a configurable window, labeled as a possible comeback—not automatically attributed as technician fault.

Each alert must show: amount at risk only when it can be calculated from recorded values, evidence links, age, owner, and a one-click disposition (corrected, justified, not applicable). Missing inputs must be displayed as “insufficient data,” never silently estimated.

### Acceptance criteria
- Every monetary value traces to source line items and a documented formula.
- Incomplete cost/price data suppresses profit claims and shows exactly what is missing.
- Cancelled, warranty, refunded, and duplicate records are excluded or separately labeled.
- Tenant isolation applies to all source queries and alert records.
- Alerts are idempotent; repeated refreshes do not create duplicates.
- Tests cover false positives, missing data, discounts, cancellation, and cross-workshop access.

## Differentiator 2 — Customer Approval Passport (P1)

A versioned estimate that the customer can review in Arabic on a mobile-first page, with each labor/parts line separately accepted or rejected. Record estimate version, decision, timestamp, actor, and the exact approved scope/price snapshot.

### Guardrails
- Any change to price or repair scope creates a new version and requires renewed approval for changed items.
- A rejected item cannot be treated as approved through a client-supplied status field.
- Technician work cannot silently add unapproved billable items.
- Approval records are append-only from the application perspective; edits create a new event.
- WhatsApp/SMS delivery is a separate integration. Until official credentials, consent, templates and delivery callbacks are configured, offer a copyable share link/manual handoff only; do not claim messages were sent.

### Acceptance criteria
- Authorization is checked server-side for every estimate and decision.
- Approval is idempotent and binds to an immutable estimate version.
- Cross-tenant estimate IDs return a safe not-found/forbidden response without data leakage.
- Tests cover changed prices, rejected lines, repeated approvals, expired links and unauthorized updates.
- An audit trail identifies actor, action, timestamp and version.

## Differentiator 3 — Vehicle Care Timeline & Return Recovery (P1)

Give each vehicle a durable, workshop-scoped service timeline: visit, customer complaint, odometer reading, work performed, parts/labor, customer-approved recommendations, warranty period when recorded, and next suggested follow-up.

- Reminders are derived only from recorded mileage/date intervals or an explicit advisor recommendation.
- Show the reason for each reminder and let staff mark it done, deferred, or not relevant.
- Detect possible comeback visits by vehicle + symptom + time window, but require a human to confirm relevance.
- Do not infer a vehicle's exact configuration or a fault from the plate/VIN alone.

### Acceptance criteria
- Odometer values are validated as non-decreasing per vehicle unless a supervisor records a correction reason.
- Timeline events are tenant-isolated and retain source work-order references.
- Duplicate imports/requests do not duplicate visits or reminders.
- Reminder logic has tests for missing mileage, date boundaries, deferrals and warranty cases.

## Differentiator 4 — Evidence-based Technician Copilot (P2, after reliable job data)

An Arabic assistant that summarizes a complaint, asks for missing diagnostic evidence, retrieves only workshop-approved procedures and vehicle/job facts, and proposes the next test—not a definitive diagnosis without evidence.

Every suggestion must include:
1. Evidence available and missing.
2. Recommended verification step and required tool/measurement.
3. Confidence/uncertainty and safety warning where relevant.
4. Source/procedure reference when retrieval is used.
5. Explicit human approval before parts ordering, quote changes, or repair execution.

Never invent DTCs, OEM specifications, wiring diagrams, or measured values. If evidence is insufficient, say so and request measurements.

## Differentiator 5 — Workshop Growth Scorecard (P2, privacy-preserving)

Track the pilot workshop's own trend before attempting cross-workshop benchmarks:
- Estimate approval rate.
- Booking-to-arrival rate.
- Median time from arrival to estimate and approval.
- Work-order gross margin only where cost data is complete.
- Comeback rate using an explicit, reviewable definition.
- Follow-up completion rate.

Do not compare or expose one workshop's data to another by default. Cross-workshop benchmarking requires explicit opt-in, minimum cohort sizes, and privacy review. Do not label estimates as audited financial results.

## Delivery sequence

### Gate A — Establish reliable data (before feature claims)
- Complete authenticated customer → vehicle → booking → work-order E2E.
- Prove two-workshop negative-access tests.
- Establish controlled first-workshop onboarding.
- Add append-only audit events for sensitive status/approval changes.
- Verify all existing and pending migrations against the dedicated project before applying anything to production.

### Gate B — Pilot differentiator
1. Define and test estimate, line-item, parts-issue, invoice and labor-time data contracts. Reuse existing structures where they are adequate; add a migration only after inspecting current schema and migration history.
2. Implement the Customer Approval Passport end-to-end, because consent and repair scope are foundational.
3. Implement Revenue Leakage Radar for only the exception types supported by real data.
4. Add Vehicle Care Timeline and manual follow-up queue.
5. Run the pilot with one workshop and compare baseline vs. 2-week results.

### Gate C — Add AI after trustworthy data
- Technician Copilot operates in suggestion-only mode.
- All suggestions cite evidence; sensitive actions require explicit staff confirmation.
- Evaluate on a curated set of real, anonymized workshop cases before customer-facing claims.

## Pilot success metrics

Capture a baseline first; do not invent targets or report outcomes without data:
- Time to prepare an estimate.
- Share of changed/rejected items with recorded customer decisions.
- Number and value of verified invoice/parts discrepancies found and corrected.
- Work orders closed with complete parts/labor data.
- Follow-up tasks completed.
- Workshop owner's willingness to pay after the pilot.

A feature is successful only if the workshop can show a measurable operational or financial improvement and agrees to pay for it.

## Explicit non-goals for V1

- No autonomous vehicle diagnosis or repair decisions.
- No unverified ZATCA, WhatsApp, scanner-device, or OEM-data integration claims.
- No production schema changes before migration-history inspection and review.
- No new microservices or duplicate runtime/data-access architecture.
- No cross-workshop data exposure or public unauthenticated workshop bootstrap.
- No merging to `main` until CI, code review, tenant-isolation and release gates pass.
