import { describe, it, expect } from "vitest";
import { toneFor, statusLabel } from "@/lib/status-tone";

describe("status tone (PRD §9 dot colours)", () => {
  it("pending needs action (orange)", () => expect(toneFor("pending")).toBe("act"));
  it("needs_attention needs action", () => expect(toneFor("needs_attention")).toBe("act"));
  it("rejected is broken (red)", () => expect(toneFor("rejected")).toBe("broken"));
  it("confirmed is done (blue)", () => expect(toneFor("confirmed")).toBe("done"));
  it("unknown is a fact (grey)", () => expect(toneFor("something")).toBe("fact"));
  it("labels read as words", () => expect(statusLabel("needs_attention")).toBe("Needs attention"));
});
