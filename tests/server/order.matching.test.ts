import { describe, test, expect } from "vitest";
import { OrderMatchingService } from "../src/services/OrderMatchingService";
import { ParsedOrderSchema } from "../../shared/types/orders";

describe("OrderMatchingService", () => {
  test("exact match → canonical id", async () => {
    const fetchMenu = async () => [{ id: "uuid-margh", name: "Margherita" }];
    const svc = new OrderMatchingService(fetchMenu as any);
    const cands = await svc.findMenuMatches("rest-1", { 
      items: [{ name: "margherita", quantity: 2 }] 
    });
    const parsed = await svc.toCanonicalIds("rest-1", cands);
    expect(ParsedOrderSchema.parse(parsed).items[0].menuItemId).toBe("uuid-margh");
  });

  test("unknown item → throws 422", async () => {
    const fetchMenu = async () => [{ id: "x", name: "Pepperoni" }];
    const svc = new OrderMatchingService(fetchMenu as any);
    const cands = await svc.findMenuMatches("r", { 
      items: [{ name: "sushi", quantity: 1 }] 
    });
    
    try {
      await svc.toCanonicalIds("r", cands);
      fail("Should have thrown");
    } catch (error: any) {
      expect(error.status).toBe(422);
      expect(error.error).toBe("unknown_item");
      expect(error.suggestions).toBeDefined();
      expect(Array.isArray(error.suggestions)).toBe(true);
    }
  });

  test("fuzzy match with modifications", async () => {
    const fetchMenu = async () => [
      { id: "uuid-pep", name: "Pepperoni Pizza", aliases: ["pepperoni"] }
    ];
    const svc = new OrderMatchingService(fetchMenu as any);
    const cands = await svc.findMenuMatches("rest-1", {
      items: [{
        name: "pepperoni",
        quantity: 1,
        modifications: ["no cheese"],
        specialInstructions: "extra crispy"
      }]
    });
    const parsed = await svc.toCanonicalIds("rest-1", cands);
    const item = parsed.items[0];
    expect(item.menuItemId).toBe("uuid-pep");
    expect(item.modifications).toEqual(["no cheese"]);
    expect(item.specialInstructions).toBe("extra crispy");
  });
});