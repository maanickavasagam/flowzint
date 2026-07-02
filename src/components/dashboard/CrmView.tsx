"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, ArrowUpDown, Filter, Inbox } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LeadBadge } from "@/components/shared/lead-badge";
import { LeadDrawer } from "./LeadDrawer";
import { cn, currency, formatDate, initials } from "@/lib/utils";
import type { LeadTemperature } from "@/lib/types";

interface LeadRow {
  id: number;
  contact_name: string | null;
  contact_company: string | null;
  contact_email: string | null;
  score: number;
  temperature: LeadTemperature;
  status: string;
  source: string;
  updated_at: string;
}
interface ContactRow {
  id: number;
  name: string | null;
  email: string | null;
  company: string | null;
  industry: string | null;
  company_size: string | null;
  created_at: string;
}
interface OppRow {
  id: number;
  lead_id: number;
  name: string;
  contact_company: string | null;
  stage: string;
  amount: number;
  probability: number;
  temperature: LeadTemperature;
}
interface MeetingRow {
  id: number;
  lead_id: number | null;
  name: string;
  email: string;
  company: string | null;
  slot_label: string;
  status: string;
  temperature: LeadTemperature | null;
}

const STAGE_LABEL: Record<string, string> = {
  discovery: "Discovery",
  demo_scheduled: "Demo scheduled",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed won",
  closed_lost: "Closed lost",
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    booked: "success",
    qualified: "default",
    won: "success",
    nurture: "cold",
    qualifying: "secondary",
    new: "secondary",
    demo_offered: "warm",
    lost: "hot",
  };
  return (
    <Badge variant={(map[status] as never) || "secondary"} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  );
}

export function CrmView({
  leads,
  contacts,
  opportunities,
  meetings,
}: {
  leads: LeadRow[];
  contacts: ContactRow[];
  opportunities: OppRow[];
  meetings: MeetingRow[];
}) {
  const [query, setQuery] = React.useState("");
  const [sortDesc, setSortDesc] = React.useState(true);
  const [openLeadId, setOpenLeadId] = React.useState<number | null>(null);
  const [temps, setTemps] = React.useState<Record<LeadTemperature, boolean>>({
    hot: true,
    warm: true,
    cold: true,
  });

  const q = query.trim().toLowerCase();

  const filteredLeads = React.useMemo(() => {
    let rows = leads.filter((l) => temps[l.temperature]);
    if (q)
      rows = rows.filter((l) =>
        [l.contact_name, l.contact_company, l.contact_email]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    rows = [...rows].sort((a, b) =>
      sortDesc ? b.score - a.score : a.score - b.score
    );
    return rows;
  }, [leads, temps, q, sortDesc]);

  const filteredContacts = React.useMemo(
    () =>
      contacts.filter((c) =>
        q
          ? [c.name, c.email, c.company, c.industry]
              .join(" ")
              .toLowerCase()
              .includes(q)
          : true
      ),
    [contacts, q]
  );

  const filteredOpps = React.useMemo(
    () =>
      opportunities.filter((o) =>
        q ? [o.name, o.contact_company].join(" ").toLowerCase().includes(q) : true
      ),
    [opportunities, q]
  );

  const filteredMeetings = React.useMemo(
    () =>
      meetings.filter((m) =>
        q
          ? [m.name, m.email, m.company].join(" ").toLowerCase().includes(q)
          : true
      ),
    [meetings, q]
  );

  return (
    <>
    <Tabs defaultValue="leads" className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-10 w-full pl-9 sm:w-64"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter leads by score</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["hot", "warm", "cold"] as LeadTemperature[]).map((t) => (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={temps[t]}
                  onCheckedChange={(v) =>
                    setTemps((s) => ({ ...s, [t]: Boolean(v) }))
                  }
                  className="capitalize"
                >
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* LEADS */}
      <TabsContent value="leads">
        <Panel>
          {filteredLeads.length === 0 ? (
            <Empty label="No leads match your filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>
                    <button
                      onClick={() => setSortDesc((s) => !s)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Score <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((l, i) => (
                  <Row key={l.id} i={i} onClick={() => setOpenLeadId(l.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[11px]">
                            {initials(l.contact_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {l.contact_name || "Anonymous"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {l.contact_email || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {l.contact_company || "—"}
                    </TableCell>
                    <TableCell>
                      <LeadBadge temperature={l.temperature} score={l.score} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                    <TableCell className="text-sm capitalize text-muted-foreground">
                      {l.source}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(l.updated_at)}
                    </TableCell>
                  </Row>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </TabsContent>

      {/* CONTACTS */}
      <TabsContent value="contacts">
        <Panel>
          {filteredContacts.length === 0 ? (
            <Empty label="No contacts found." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((c, i) => (
                  <Row key={c.id} i={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[11px]">
                            {initials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {c.name || "—"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{c.company || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.industry || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.company_size || "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDate(c.created_at)}
                    </TableCell>
                  </Row>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </TabsContent>

      {/* OPPORTUNITIES */}
      <TabsContent value="opportunities">
        <Panel>
          {filteredOpps.length === 0 ? (
            <Empty label="No opportunities yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Win %</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpps.map((o, i) => (
                  <Row key={o.id} i={i} onClick={() => setOpenLeadId(o.lead_id)}>
                    <TableCell className="text-sm font-medium">{o.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.contact_company || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {STAGE_LABEL[o.stage] || o.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <LeadBadge temperature={o.temperature} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet to-teal"
                            style={{ width: `${o.probability}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {o.probability}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {currency(o.amount)}
                    </TableCell>
                  </Row>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </TabsContent>

      {/* MEETINGS */}
      <TabsContent value="meetings">
        <Panel>
          {filteredMeetings.length === 0 ? (
            <Empty label="No meetings booked yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attendee</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map((m, i) => (
                  <Row
                    key={m.id}
                    i={i}
                    onClick={
                      m.lead_id != null ? () => setOpenLeadId(m.lead_id) : undefined
                    }
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[11px]">
                            {initials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.company || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{m.slot_label}</TableCell>
                    <TableCell>
                      {m.temperature ? (
                        <LeadBadge temperature={m.temperature} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="success" className="capitalize">
                        {m.status}
                      </Badge>
                    </TableCell>
                  </Row>
                ))}
              </TableBody>
            </Table>
          )}
        </Panel>
      </TabsContent>
    </Tabs>
    <LeadDrawer leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
    </>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
      {children}
    </div>
  );
}

function Row({
  children,
  i,
  onClick,
}: {
  children: React.ReactNode;
  i: number;
  onClick?: () => void;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.03, 0.3) }}
      onClick={onClick}
      className={cn(
        "border-b border-border/60 transition-colors hover:bg-white/[0.02]",
        onClick && "cursor-pointer"
      )}
    >
      {children}
    </motion.tr>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
