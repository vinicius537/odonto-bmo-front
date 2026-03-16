import { describe, expect, it } from "vitest";

import { toDateInput, toDateTimeLocalInput, toIsoDate, toIsoDateTime } from "@/lib/date";

describe("date helpers", () => {
  it("converts ISO dates to datetime-local input format", () => {
    expect(toDateTimeLocalInput("2026-03-17T23:40:00.000Z")).toMatch(/2026-03-17T\d{2}:40/);
  });

  it("converts datetime-local values to full ISO dates", () => {
    const result = toIsoDateTime("2026-03-17T20:40");

    expect(result).toBeTruthy();
    expect(result).toContain("2026-03-17T");
    expect(result?.endsWith("Z")).toBe(true);
  });

  it("returns undefined for empty datetime-local values", () => {
    expect(toIsoDateTime("")).toBeUndefined();
    expect(toIsoDateTime(undefined)).toBeUndefined();
  });

  it("converts ISO dates to date input format", () => {
    expect(toDateInput("2026-03-17T23:40:00.000Z")).toBe("2026-03-17");
  });

  it("converts date inputs to full ISO dates", () => {
    const result = toIsoDate("2026-03-17");

    expect(result).toBeTruthy();
    expect(result).toContain("2026-03-17T");
    expect(result?.endsWith("Z")).toBe(true);
  });
});
