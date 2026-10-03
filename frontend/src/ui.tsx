import { Check, Plus, ArrowUpRight } from "lucide-react";
import type { SkillGapItem } from "@dhyavora/contracts";

export function SkillPill({ item }: { item: SkillGapItem }) {
  return <div className="skill-pill"><span className={`gap-mark ${item.status.toLowerCase()}`}>{item.status === "MATCHED" ? <Check size={11} /> : item.status === "MISSING" ? <Plus size={11} /> : <ArrowUpRight size={11} />}</span><span>{item.name}</span><small>{item.status.toLowerCase()}</small></div>;
}
