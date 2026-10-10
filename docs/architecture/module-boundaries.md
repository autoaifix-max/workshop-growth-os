# Module boundaries — Workshop Growth OS

Architecture decision: begin with a modular monolith, not separately deployed services. Define module ownership and API contracts early; split services only when a measured operational need justifies it.

## Shared foundation
- Authentication, sessions, roles, and workshop membership.
- Server-derived tenant context and database-enforced tenant isolation.
- Validation, consistent errors, request IDs, and audit events.
- Private document storage and secure configuration.

Never trust a client-supplied `workshop_id` as proof of access. Derive tenant context from a trusted session and verified membership.

## Functional modules
1. Customers and vehicles.
2. Reception and bookings.
3. Work orders and state transitions.
4. Diagnostics and DTC reports.
5. Quality checks and vehicle handover.
6. Invoices, payments, and profitability.
7. SaaS subscriptions and platform administration.
8. Diagnostic knowledge and external integrations.

These are logical modules in one application and shared managed database initially, not separate databases or services.

## Integration rules
- Assign clear ownership to every table and domain rule.
- Do not mutate another module's state outside its documented interface.
- Use database transactions for operations that must be atomic.
- Version external APIs under `/api/v1` and document error formats.
- Test cross-module workflows after each increment.
- Test isolation with at least two workshops and negative access cases.
- Do not expose service-role keys or internal diagnostics to clients.

## Implementation sequence
1. Audit existing code and approve reuse decisions.
2. Shared foundation and tenant isolation.
3. Customers and vehicles.
4. Reception and bookings.
5. Work orders.
6. Diagnostics and quality.
7. Invoices and payments.
8. Subscriptions and platform administration.
9. External integrations and mobile clients.

## Reuse policy for Digital DiagPro
Treat Digital DiagPro as a source of candidate workflows, schema, and tests—not as a ready multi-tenant SaaS. Review migrations, row-level security policies, privileged functions, tenant ownership, and tests before adopting any code. Do not copy secrets, environment files, or production data.

## Module acceptance gate
- Domain tests pass.
- Inputs and permissions are validated.
- Tenant-isolation tests pass.
- API contract is documented.
- Integration with the preceding module is tested.
- Report clearly states what was and was not executed.
