import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { computeSkillGap, type CareerRequirement, type Skill } from "@dhyavora/contracts";
import { SkillPill } from "./ui";

describe("SkillPill", () => {
  it("renders the canonical shared skill-gap statuses", () => {
    const skills: Skill[] = [{ name: "TypeScript", level: "INTERMEDIATE" }];
    const requirements: CareerRequirement[] = [{ name: "TypeScript", requiredLevel: "ADVANCED" }, { name: "React", requiredLevel: "BEGINNER" }];
    const gap = computeSkillGap(skills, requirements);
    render(<div>{gap.map((item) => <SkillPill key={item.name} item={item} />)}</div>);
    expect(screen.getByText("developing")).toBeInTheDocument();
    expect(screen.getByText("missing")).toBeInTheDocument();
  });
});
