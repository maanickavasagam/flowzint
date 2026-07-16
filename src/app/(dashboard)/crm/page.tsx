import { Users, Flame, CalendarCheck, DollarSign } from "lucide-react";
import {
  listLeads,
  listContacts,
  listOpportunities,
  listMeetings,
  getKpis,
  getCrmSeries,
  getScoringWeights,
} from "@/lib/repo";
import { maxScoreFor } from "@/lib/scoring";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CrmView } from "@/components/dashboard/CrmView";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Real week-over-week change from a 14-day daily series.
function weekDelta(arr: number[]): number {
  if (arr.length < 14) return 0;
  const last = arr.slice(-7).reduce((a, b) => a + b, 0);
  const prev = arr.slice(-14, -7).reduce((a, b) => a + b, 0);
  if (prev === 0) return last > 0 ? 100 : 0;
  return Math.round(((last - prev) / prev) * 100);
}

export default function CrmPage() {
  const leads = listLeads();
  const contacts = listContacts();
  const opportunities = listOpportunities();
  const meetings = listMeetings();
  const kpis = getKpis();
  const series = getCrmSeries();
  const maxScore = maxScoreFor(getScoringWeights());

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total contacts"
          value={String(contacts.length)}
          delta={weekDelta(series.contacts)}
          icon={Users}
          trend={series.contacts}
          accent="hsl(263 90% 63%)"
        />
        <KpiCard
          label="Hot leads"
          value={String(kpis.hot)}
          delta={weekDelta(series.hotLeads)}
          icon={Flame}
          trend={series.hotLeads}
          accent="hsl(0 84% 62%)"
        />
        <KpiCard
          label="Meetings booked"
          value={String(kpis.meetings)}
          delta={weekDelta(series.meetings)}
          icon={CalendarCheck}
          trend={series.meetings}
          accent="hsl(173 80% 45%)"
        />
        <KpiCard
          label="Pipeline value"
          value={currency(kpis.pipelineValue)}
          delta={weekDelta(series.pipeline)}
          icon={DollarSign}
          trend={series.pipeline}
          accent="hsl(38 92% 55%)"
        />
      </div>

      <CrmView
        maxScore={maxScore}
        leads={leads.map((l) => ({
          id: l.id,
          contact_name: l.contact_name,
          contact_company: l.contact_company,
          contact_email: l.contact_email,
          score: l.score,
          temperature: l.temperature,
          status: l.status,
          source: l.source,
          updated_at: l.updated_at,
        }))}
        contacts={contacts.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          company: c.company,
          industry: c.industry,
          company_size: c.company_size,
          created_at: c.created_at,
        }))}
        opportunities={opportunities.map((o) => ({
          id: o.id,
          lead_id: o.lead_id,
          name: o.name,
          contact_company: o.contact_company,
          stage: o.stage,
          amount: o.amount,
          probability: o.probability,
          temperature: o.temperature,
        }))}
        meetings={meetings.map((m) => ({
          id: m.id,
          lead_id: m.lead_id,
          name: m.name,
          email: m.email,
          company: m.company,
          slot_label: m.slot_label,
          status: m.status,
          temperature: m.temperature,
        }))}
      />
    </div>
  );
}
