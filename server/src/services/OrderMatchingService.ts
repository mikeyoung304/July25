import { ParsedOrder, ParsedOrderSchema } from "../../../shared/types/orders";

type DraftItem = { name: string; quantity: number; modifications?: string[]; specialInstructions?: string };
type DraftOrder = { items: DraftItem[]; notes?: string };
type Candidate = { draftName: string; quantity: number; modifications?: string[]; specialInstructions?: string;
  candidates: Array<{ menuItemId: string; name: string; score: number }> };
export type DraftWithCandidates = { items: Candidate[]; notes?: string };

function norm(s:string){return s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function score(a:string,b:string){const A=new Set(norm(a).split(" ").filter(Boolean));
  const B=new Set(norm(b).split(" ").filter(Boolean));
  const inter=[...A].filter(t=>B.has(t)).length; const uni=new Set([...A,...B]).size||1; return inter/uni;}

export class OrderMatchingService {
  constructor(private fetchMenu:(rid:string)=>Promise<Array<{id:string;name:string;aliases?:string[]}>>){}

  async findMenuMatches(restaurantId:string,draft:DraftOrder):Promise<DraftWithCandidates>{
    const menu = await this.fetchMenu(restaurantId);
    return { items: draft.items.map(it=>{
      const top = menu.map(m=>{
        const names=[m.name,...(m.aliases??[])];
        const best=Math.max(...names.map(n=>score(it.name,n)));
        return { menuItemId:m.id, name:m.name, score:best };
      }).sort((a,b)=>b.score-a.score).slice(0,3);
      return { draftName:it.name, quantity:it.quantity, modifications:it.modifications,
        specialInstructions:it.specialInstructions, candidates:top };
    }), notes:draft.notes };
  }

  async toCanonicalIds(_rid:string,cand:DraftWithCandidates):Promise<ParsedOrder>{
    const items = cand.items.map(ci=>{
      const top=ci.candidates[0];
      if(!top || top.score<0.35){
        const e=new Error(`unknown_item`) as any;
        e.status=422; 
        e.error="unknown_item";
        e.suggestions=ci.candidates.map(c => ({ name: c.name, score: c.score })); 
        throw e;
      }
      return { menuItemId: top.menuItemId, quantity: ci.quantity,
        modifications: ci.modifications ?? [], specialInstructions: ci.specialInstructions };
    });
    return ParsedOrderSchema.parse({ items, notes:cand.notes });
  }
}