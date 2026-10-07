import {
  daysSincePosted,
  intelCategoryLabel,
  intentTier,
  intentTierLabel,
} from "@/lib/leads/intelligence";
import type { LeadIntelCategory } from "@prisma/client";

type Props = {
  leadIntelCategory?: LeadIntelCategory | null;
  intentScore?: number;
  detectedProblem?: string | null;
  requirementSummary?: string | null;
  solutionNeeded?: string | null;
  businessOpportunity?: string | null;
  postedAt?: string | null;
};

export function LeadIntelPreview({
  leadIntelCategory,
  intentScore = 0,
  detectedProblem,
  requirementSummary,
  solutionNeeded,
  businessOpportunity,
  postedAt,
}: Props) {
  const cat = leadIntelCategory ?? "BUSINESS_OPPORTUNITY";
  const days = daysSincePosted(postedAt);
  const isDemand = cat === "ACTIVE_DEMAND" || cat === "BOTH";

  const headline = isDemand
    ? requirementSummary
    : detectedProblem;

  return (
    <div className="mt-1 max-w-xl space-y-0.5 text-xs text-muted-foreground">
      <p className="font-medium text-foreground/90">
        {intelCategoryLabel(cat)}
        {intentScore > 0 && (
          <span className="ml-2 text-muted-foreground">
            {intentTierLabel(intentTier(intentScore))} · intent {intentScore}
          </span>
        )}
      </p>
      {headline && (
        <p className="line-clamp-2 italic">&ldquo;{headline}&rdquo;</p>
      )}
      {(solutionNeeded || businessOpportunity) && (
        <p className="line-clamp-1">
          <span className="text-foreground/80">Need:</span>{" "}
          {solutionNeeded ?? businessOpportunity}
        </p>
      )}
      {isDemand && days != null && (
        <p>Posted {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}</p>
      )}
    </div>
  );
}
