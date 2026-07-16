import { getScoringWeights } from "@/lib/repo";
import { maxScoreFor } from "@/lib/scoring";
import { RubricEditor } from "@/components/dashboard/RubricEditor";

export const dynamic = "force-dynamic";

export default function RubricPage() {
  const weights = getScoringWeights();
  return (
    <RubricEditor initialWeights={weights} initialMax={maxScoreFor(weights)} />
  );
}
