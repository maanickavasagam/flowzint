import {
  getFunnel,
  getKpis,
  getChatTrend,
  getRecentSessions,
  getObjectionStats,
  getDropOffStats,
  getScoringWeights,
} from "@/lib/repo";
import { maxScoreFor } from "@/lib/scoring";
import { AnalyticsView } from "@/components/dashboard/AnalyticsView";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  const funnel = getFunnel();
  const kpis = getKpis();
  const trend = getChatTrend();
  const recent = getRecentSessions(12);
  const objections = getObjectionStats();
  const dropOff = getDropOffStats();

  return (
    <div className="space-y-6">
      <AnalyticsView
        funnel={funnel}
        kpis={{
          totalChats: kpis.totalChats,
          meetings: kpis.meetings,
          chatToMeeting: kpis.chatToMeeting,
          sqls: kpis.sqls,
          chatToSql: kpis.chatToSql,
          avgQualificationMinutes: kpis.avgQualificationMinutes,
        }}
        trend={trend}
        recent={recent}
        maxScore={maxScoreFor(getScoringWeights())}
      />
      <InsightsPanel objections={objections} dropOff={dropOff} />
    </div>
  );
}
