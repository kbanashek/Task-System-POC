import { isDataStoreModelDeleted } from "@utils/datastore/isDataStoreModelDeleted";

describe("isDataStoreModelDeleted", () => {
  it("returns false for non-objects", () => {
    expect(isDataStoreModelDeleted(null)).toBe(false);
    expect(isDataStoreModelDeleted(undefined)).toBe(false);
    expect(isDataStoreModelDeleted("x")).toBe(false);
    expect(isDataStoreModelDeleted(123)).toBe(false);
    expect(isDataStoreModelDeleted(true)).toBe(false);
  });

  it("returns false when _deleted is not present", () => {
    expect(isDataStoreModelDeleted({})).toBe(false);
    expect(isDataStoreModelDeleted({ id: "1" })).toBe(false);
  });

  it("returns true when _deleted is true", () => {
    expect(isDataStoreModelDeleted({ _deleted: true })).toBe(true);
  });

  it("returns false when _deleted is falsey or not boolean true", () => {
    expect(isDataStoreModelDeleted({ _deleted: false })).toBe(false);
    expect(isDataStoreModelDeleted({ _deleted: null })).toBe(false);
    expect(isDataStoreModelDeleted({ _deleted: "true" })).toBe(false);
    expect(isDataStoreModelDeleted({ _deleted: 1 })).toBe(false);
  });
});
