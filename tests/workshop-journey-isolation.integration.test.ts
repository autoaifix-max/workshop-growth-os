import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  requireTenantContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));
vi.mock("@/lib/api/tenant-context", () => ({
  requireTenantContext: mocks.requireTenantContext,
}));

import { POST as createCustomer, GET as listCustomers } from "../src/app/api/v1/customers/route";
import { POST as createVehicle, GET as listVehicles } from "../src/app/api/v1/vehicles/route";
import { POST as createBooking, GET as listBookings } from "../src/app/api/v1/bookings/route";
import { POST as createWorkOrder, GET as listWorkOrders } from "../src/app/api/v1/work-orders/route";

const workshopA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const workshopB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

type Row = Record<string, unknown>;
type QueryResult = { data: unknown; error: { code?: string } | null };

let tables: Record<string, Row[]>;
let activeWorkshopId: string;
let activeUserId: string;
let idCounter: number;

function nextId() {
  idCounter += 1;
  return `00000000-0000-4000-8000-${String(idCounter).padStart(12, "0")}`;
}

class MemoryQuery implements PromiseLike<QueryResult> {
  private operation: "select" | "insert" | "update" = "select";
  private payload: Row = {};
  private filters: Array<[string, unknown]> = [];

  constructor(private readonly table: string) {}

  select(_columns?: string) {
    return this;
  }

  insert(payload: Row) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  order(_column: string, _options?: { ascending?: boolean }) {
    return this;
  }

  limit(_count: number) {
    return this;
  }

  async single(): Promise<QueryResult> {
    return this.execute(true);
  }

  async maybeSingle(): Promise<QueryResult> {
    return this.execute(true);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute(false).then(onfulfilled, onrejected);
  }

  private matches(row: Row) {
    return this.filters.every(([column, value]) => row[column] === value);
  }

  private async execute(single: boolean): Promise<QueryResult> {
    const rows = tables[this.table] ?? (tables[this.table] = []);

    if (this.operation === "insert") {
      const row: Row = {
        ...this.payload,
        id: nextId(),
        created_at: "2026-10-10T12:00:00.000Z",
        updated_at: "2026-10-10T12:00:00.000Z",
      };
      rows.push(row);
      return { data: single ? row : [row], error: null };
    }

    if (this.operation === "update") {
      const changed = rows.filter((row) => this.matches(row));
      for (const row of changed) Object.assign(row, this.payload);
      return { data: single ? changed[0] ?? null : changed, error: null };
    }

    const found = rows.filter((row) => this.matches(row));
    return { data: single ? found[0] ?? null : found, error: null };
  }
}

function useWorkshop(workshopId: string, userId: string) {
  activeWorkshopId = workshopId;
  activeUserId = userId;
}

function setup() {
  tables = { customers: [], vehicles: [], bookings: [], work_orders: [] };
  activeWorkshopId = workshopA;
  activeUserId = userA;
  idCounter = 0;

  const client = {
    from: (table: string) => new MemoryQuery(table),
  };
  mocks.getSupabaseServerClient.mockResolvedValue(client);
  mocks.requireTenantContext.mockImplementation(async () => ({
    ok: true,
    context: {
      userId: activeUserId,
      workshopId: activeWorkshopId,
      role: "owner",
    },
  }));
}

function request(path: string, method = "GET", body?: unknown) {
  return new Request(`http://localhost/api/v1/${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function createWorkshopJourney() {
  const customerResponse = await createCustomer(request("customers", "POST", {
    fullName: "عميل اختبار",
    phone: "0501234567",
  }));
  expect(customerResponse.status).toBe(201);
  const customer = (await customerResponse.json()).data as Row;

  const vehicleResponse = await createVehicle(request("vehicles", "POST", {
    customerId: customer.id,
    plateNumber: `TST${String(idCounter + 1).padStart(4, "0")}`,
    make: "Toyota",
    model: "Camry",
    modelYear: 2022,
  }));
  expect(vehicleResponse.status).toBe(201);
  const vehicle = (await vehicleResponse.json()).data as Row;

  const bookingResponse = await createBooking(request("bookings", "POST", {
    customerId: customer.id,
    vehicleId: vehicle.id,
    requestedService: "فحص المحرك",
    scheduledAt: "2026-10-12T10:00:00+03:00",
    notes: "اختبار تكاملي معزول",
  }));
  expect(bookingResponse.status).toBe(201);
  const booking = (await bookingResponse.json()).data as Row;

  const workOrderResponse = await createWorkOrder(request("work-orders", "POST", {
    bookingId: booking.id,
  }));
  expect(workOrderResponse.status).toBe(201);
  const workOrder = (await workOrderResponse.json()).data as Row;

  return { customer, vehicle, booking, workOrder };
}

afterEach(() => vi.clearAllMocks());

describe("isolated workshop journey and tenant boundaries", () => {
  it("runs customer → vehicle → booking → work order and makes conversion retries idempotent", async () => {
    setup();
    const { customer, vehicle, booking, workOrder } = await createWorkshopJourney();

    expect(customer.workshop_id).toBe(workshopA);
    expect(vehicle.workshop_id).toBe(workshopA);
    expect(vehicle.customer_id).toBe(customer.id);
    expect(booking.workshop_id).toBe(workshopA);
    expect(booking.customer_id).toBe(customer.id);
    expect(booking.vehicle_id).toBe(vehicle.id);
    expect(workOrder.workshop_id).toBe(workshopA);
    expect(workOrder.booking_id).toBe(booking.id);
    expect(workOrder.customer_id).toBe(customer.id);
    expect(workOrder.vehicle_id).toBe(vehicle.id);
    expect(tables.work_orders).toHaveLength(1);
    expect(tables.bookings[0].status).toBe("in_progress");

    const retry = await createWorkOrder(request("work-orders", "POST", { bookingId: booking.id }));
    expect(retry.status).toBe(200);
    expect(tables.work_orders).toHaveLength(1);
    expect(tables.bookings[0].status).toBe("in_progress");
  });

  it("prevents cross-workshop customer, vehicle, booking, and work-order access", async () => {
    setup();
    useWorkshop(workshopB, userB);
    const foreign = await createWorkshopJourney();

    useWorkshop(workshopA, userA);
    const foreignCustomerVehicle = await createVehicle(request("vehicles", "POST", {
      customerId: foreign.customer.id,
      plateNumber: "FOREIGN1",
      make: "Honda",
      model: "Civic",
      modelYear: 2021,
    }));
    expect(foreignCustomerVehicle.status).toBe(404);
    expect((await foreignCustomerVehicle.json()).error.code).toBe("CUSTOMER_NOT_FOUND");

    const foreignCustomerBooking = await createBooking(request("bookings", "POST", {
      customerId: foreign.customer.id,
      vehicleId: foreign.vehicle.id,
      requestedService: "فحص الفرامل",
      scheduledAt: "2026-10-12T11:00:00+03:00",
    }));
    expect(foreignCustomerBooking.status).toBe(404);
    expect((await foreignCustomerBooking.json()).error.code).toBe("CUSTOMER_NOT_FOUND");

    const foreignWorkOrder = await createWorkOrder(request("work-orders", "POST", {
      bookingId: foreign.booking.id,
    }));
    expect(foreignWorkOrder.status).toBe(404);
    expect((await foreignWorkOrder.json()).error.code).toBe("BOOKING_NOT_FOUND");

    const [customers, vehicles, bookings, workOrders] = await Promise.all([
      listCustomers(request("customers")),
      listVehicles(request("vehicles")),
      listBookings(request("bookings")),
      listWorkOrders(request("work-orders")),
    ]);
    for (const response of [customers, vehicles, bookings, workOrders]) {
      expect(response.status).toBe(200);
      expect((await response.json()).data.items).toHaveLength(0);
    }
    expect(tables.customers.filter((row) => row.workshop_id === workshopB)).toHaveLength(1);
    expect(tables.vehicles.filter((row) => row.workshop_id === workshopB)).toHaveLength(1);
    expect(tables.bookings.filter((row) => row.workshop_id === workshopB)).toHaveLength(1);
    expect(tables.work_orders.filter((row) => row.workshop_id === workshopB)).toHaveLength(1);
  });
});
