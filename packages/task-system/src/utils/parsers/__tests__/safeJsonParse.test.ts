import { safeJsonParseDeep } from "@utils/parsers/safeJsonParse";

describe("safeJsonParseDeep", () => {
  it("returns non-string input unchanged", () => {
    expect(safeJsonParseDeep({ a: 1 })).toEqual({ a: 1 });
    expect(safeJsonParseDeep([1, 2, 3])).toEqual([1, 2, 3]);
    expect(safeJsonParseDeep(null)).toBeNull();
  });

  it("parses a normal JSON string", () => {
    expect(safeJsonParseDeep('{"a":1}')).toEqual({ a: 1 });
  });

  it("parses a double-encoded JSON string", () => {
    const once = JSON.stringify({ a: 1, b: ["x"] });
    const twice = JSON.stringify(once);
    expect(safeJsonParseDeep(twice)).toEqual({ a: 1, b: ["x"] });
  });

  it("returns null for invalid JSON at depth 0", () => {
    expect(safeJsonParseDeep("{not json")).toBeNull();
  });

  it("returns original string when deeper parse fails after a successful parse", () => {
    // First parse yields a non-JSON string; second parse would fail.
    const wrapped = JSON.stringify("not-json");
    expect(safeJsonParseDeep(wrapped)).toBe("not-json");
  });
});
