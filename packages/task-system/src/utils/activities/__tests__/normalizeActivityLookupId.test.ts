import { normalizeActivityLookupId } from "@utils/activities/normalizeActivityLookupId";

describe("normalizeActivityLookupId", () => {
  it("returns uuid as-is", () => {
    expect(
      normalizeActivityLookupId("ad93b50d-7d49-4128-8a59-91275e77f3c8")
    ).toBe("ad93b50d-7d49-4128-8a59-91275e77f3c8");
  });

  it("extracts uuid from Activity.<uuid>", () => {
    expect(
      normalizeActivityLookupId("Activity.ad93b50d-7d49-4128-8a59-91275e77f3c8")
    ).toBe("ad93b50d-7d49-4128-8a59-91275e77f3c8");
  });

  it("extracts uuid from ActivityRef chain", () => {
    const raw =
      "ActivityRef#Arm.111#ActivityGroup.222#Activity.ad93b50d-7d49-4128-8a59-91275e77f3c8";
    expect(normalizeActivityLookupId(raw)).toBe(
      "ad93b50d-7d49-4128-8a59-91275e77f3c8"
    );
  });

  it("strips version suffix", () => {
    expect(
      normalizeActivityLookupId(
        "Activity.ad93b50d-7d49-4128-8a59-91275e77f3c8#1.0"
      )
    ).toBe("ad93b50d-7d49-4128-8a59-91275e77f3c8");
  });

  it("returns null for empty string", () => {
    expect(normalizeActivityLookupId("")).toBeNull();
  });

  it("returns null for bare ActivityRef token", () => {
    expect(normalizeActivityLookupId("ActivityRef")).toBeNull();
    expect(normalizeActivityLookupId("ActivityRef#Arm.111")).toBeNull();
  });
});
