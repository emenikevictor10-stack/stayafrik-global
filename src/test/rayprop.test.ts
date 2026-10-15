import { describe, it, expect } from "vitest";
import { koboToNaira, partnerTotalKobo, raypropToProperty } from "@/lib/rayprop-map";
import { mapRayPropStatus, signRayPropPayload, verifyRayPropSignature } from "../../supabase/functions/_shared/rayprop-core";

describe("RayProp rules", () => {
  it("converts kobo to Naira", () => {
    expect(koboToNaira(7500000)).toBe(75000);
  });

  it("totals (rate + markup) × nights plus 7.5% VAT, matching the docs example", () => {
    expect(partnerTotalKobo(7500000, 500000, 3)).toBe(25800000);
  });

  it("maps a documented listing to card fields", () => {
    const p = raypropToProperty({
      id: "abc", title: "Modern 2BR", city: "Lagos", neighborhood: "Lekki Phase 1", price_per_night: 7500000,
      bedrooms: 2, bathrooms: 2, max_guests: 4, property_size_sqm: 120,
      listing_images: [{ image_url: "b.jpg", is_primary: false }, { image_url: "a.jpg", is_primary: true }],
      amenities: ["WiFi"], building_amenities: ["24/7 security"], check_in_time: "14:00",
    }, "fallback.jpg")!;
    expect(p.id).toBe("rp_abc");
    expect(p.priceNum).toBe(75000);
    expect(p.image).toBe("a.jpg");
    expect(p.location).toBe("Lekki Phase 1, Lagos");
    expect(p.area).toBe("120 sqm");
    expect(p.maxGuests).toBe(4);
    expect(p.amenities.map((a) => a.label)).toEqual(["WiFi", "24/7 security"]);
    expect(p.agentTag).toBe("Verified Partner");
  });

  it("accepts a valid webhook signature and rejects a tampered body", async () => {
    const body = JSON.stringify({ event: "reservation.booked", _meta: { timestamp: "2026-10-15T10:00:00Z" }, data: { reservation_id: "res_1" } });
    const sig = "sha256=" + (await signRayPropPayload("2026-10-15T10:00:00Z", body, "s3cret"));
    expect(await verifyRayPropSignature(body, sig, "s3cret")).toBe(true);
    expect(await verifyRayPropSignature(body.replace("res_1", "res_2"), sig, "s3cret")).toBe(false);
  });

  it("maps webhook events to booking statuses", () => {
    expect(mapRayPropStatus("reservation.booked")).toBe("confirmed");
    expect(mapRayPropStatus("reservation.payment_confirmed")).toBe("confirmed");
    expect(mapRayPropStatus("reservation.cancelled")).toBe("cancelled");
    expect(mapRayPropStatus("reservation.completed")).toBe("completed");
    expect(mapRayPropStatus("reservation.created")).toBeNull();
  });
});
