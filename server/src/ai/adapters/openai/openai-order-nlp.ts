import OpenAI from "openai";
import { z } from "zod";
import { OrderNLP } from "../../core/order-nlp";
import { OrderMatchingService } from "../../../services/OrderMatchingService";
import { withTimeout, retry } from "./utils";

const DraftSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().min(1),
    modifications: z.array(z.string()).optional(),
    specialInstructions: z.string().optional(),
  })).min(1),
  notes: z.string().optional(),
});
type DraftOrder = z.infer<typeof DraftSchema>;

export class OpenAIOrderNLP implements OrderNLP {
  constructor(private client: OpenAI, private match: OrderMatchingService) {}

  async parse({ restaurantId, text }: { restaurantId: string; text: string }) {
    const sys = { role: "system" as const, content:
      "Extract a restaurant order as JSON: items[] (name, quantity, modifications[], specialInstructions), optional notes. No prices or IDs." };

    const call = async () => {
      const r = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [sys, { role: "user", content: text }],
      });
      const content = r.choices[0]?.message?.content ?? "{}";
      const draft = DraftSchema.parse(JSON.parse(content)) as DraftOrder;
      const candidates = await this.match.findMenuMatches(restaurantId, draft);
      return this.match.toCanonicalIds(restaurantId, candidates);
    };

    try { return await withTimeout(retry(call, 1), 15_000); }
    catch { return { items: [], notes: `unparsed: ${text}` }; }
  }
}