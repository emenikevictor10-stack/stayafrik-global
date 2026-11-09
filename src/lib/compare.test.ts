import { describe, it, expect } from "vitest";
import { parseCompareIds, compareLink } from "./compare";

describe("compare link", () => {
  it("keeps at most 3 stays", () => expect(parseCompareIds("a,b,c,d")).toEqual(["a", "b", "c"]));
  it("ignores repeats and blanks", () => expect(parseCompareIds("a, a,,b")).toEqual(["a", "b"]));
  it("empty link gives no stays", () => expect(parseCompareIds(null)).toEqual([]));
  it("builds a link", () => expect(compareLink(["rp_1", "x"])).toBe("/compare?ids=rp_1,x"));
});
