import { scoreEmoji } from "@/lib/leads/normalize";
import { Badge } from "@/components/ui/badge";

export function LeadScoreBadge({ score }: { score: number }) {
  return (
    <Badge variant="outline" className="font-mono tabular-nums">
      {scoreEmoji(score)} {score}
    </Badge>
  );
}
