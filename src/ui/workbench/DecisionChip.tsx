import type { VariantDecision } from "@/shared/stats/bayes";
import { statusLabel, statusStyles } from "@/lab/judgment/criteria";

export function DecisionChip({
  decision,
  className = "",
}: {
  decision: Pick<VariantDecision, "status">;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyles(decision.status)} ${className}`}
    >
      {statusLabel(decision.status)}
    </span>
  );
}
