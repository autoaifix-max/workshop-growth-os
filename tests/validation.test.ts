import { describe, expect, it } from "vitest";
import { customerInputSchema } from "../src/lib/validation/customer";
import { vehicleInputSchema } from "../src/lib/validation/vehicle";
describe("customer validation", () => { it("accepts valid customer data", () => expect(customerInputSchema.safeParse({fullName:"محمد العتيبي", phone:"+966 50 123 4567"}).success).toBe(true)); it("rejects forged tenant fields", () => expect(customerInputSchema.safeParse({fullName:"محمد العتيبي", phone:"0501234567", workshop_id:"forged"}).success).toBe(false)); });
describe("vehicle validation", () => { it("rejects invalid UUID", () => expect(vehicleInputSchema.safeParse({customerId:"123", plateNumber:"1234", make:"Kia", model:"K5"}).success).toBe(false)); });