import {
  getFunnel,
  getKpis,
  getChatTrend,
  getRecentSessions,
} from "@/lib/repo";
import { AnalyticsView } from "@/components/dashboard/AnalyticsView";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  const funnel = getFunnel();
  const kpis = getKpis();
  const trend = getChatTrend();
  const recent = getRecentSessions(12);

  return (
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
    />
  );
}
