import { Users, Flame, CalendarCheck, DollarSign } from "lucide-react";
import {
  listLeads,
  listContacts,
  listOpportunities,
  listMeetings,
  getKpis,
} from "@/lib/repo";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CrmView } from "@/components/dashboard/CrmView";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function CrmPage() {
  const leads = listLeads();
  const contacts = listContacts();
  const opportunities = listOpportunities();
  const meetings = listMeetings();
  const kpis = getKpis();

  const pipelineTrend = [8, 10, 9, 12, 14, 13, 16, 18];
  const leadTrend = [4, 6, 5, 8, 7, 10, 12, 14];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total contacts"
          value={String(contacts.length)}
          delta={12}
          icon={Users}
          trend={leadTrend}
          accent="hsl(263 90% 63%)"
        />
        <KpiCard
          label="Hot leads"
          value={String(kpis.hot)}
          delta={9}
          icon={Flame}
          trend={[2, 3, 2, 4, 5, 4, 6, kpis.hot || 6]}
          accent="hsl(0 84% 62%)"
        />
        <KpiCard
          label="Meetings booked"
          value={String(kpis.meetings)}
          delta={18}
          icon={CalendarCheck}
          trend={[1, 2, 2, 3, 4, 5, 6, kpis.meetings || 6]}
          accent="hsl(173 80% 45%)"
        />
        <KpiCard
          label="Pipeline value"
          value={currency(kpis.pipelineValue)}
          delta={24}
          icon={DollarSign}
          trend={pipelineTrend}
          accent="hsl(38 92% 55%)"
        />
      </div>

      <CrmView
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
