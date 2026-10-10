import { afterEach, describe, expect, it, vi } from "vitest";
import { redirectIfUnauthorized } from "../src/lib/auth/redirect-to-login";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("redirectIfUnauthorized", () => {
  it("does not redirect for successful or non-auth responses", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/customers", search: "", assign } });

    expect(redirectIfUnauthorized({ status: 200 })).toBe(false);
    expect(redirectIfUnauthorized({ status: 403 })).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });

  it("returns the user to the page they requested after logging in", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { pathname: "/admin/bookings", search: "?status=pending", assign },
    });

    expect(redirectIfUnauthorized({ status: 401 })).toBe(true);
    expect(assign).toHaveBeenCalledWith(
      "/login?next=%2Fadmin%2Fbookings%3Fstatus%3Dpending",
    );
  });

  it("redirects when any request in a combined load is unauthorized", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/vehicles", search: "", assign } });

    expect(redirectIfUnauthorized({ status: 200 }, { status: 401 })).toBe(true);
    expect(assign).toHaveBeenCalledTimes(1);
  });
});
