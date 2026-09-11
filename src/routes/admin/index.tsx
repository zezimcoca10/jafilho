import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, LogOut, Search, ShieldCheck } from "lucide-react";
import { fetchAdminLeads, getAdminSession, signOutAdmin } from "../../lib/leadService";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

function AdminDashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAdminSession()) {
      void navigate({ to: "/admin/login" });
      return;
    }
    void fetchAdminLeads().then(setLeads).finally(() => setLoading(false));
  }, [navigate]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return leads.filter((lead) => String(lead.name ?? "").toLowerCase().includes(term) || String(lead.company_name ?? "").toLowerCase().includes(term) || String(lead.email ?? "").toLowerCase().includes(term));
  }, [leads, search]);

  const hot = leads.filter((lead) => lead.lead_temperature === "quente").length;
  const today = leads.filter((lead) => String(lead.created_at ?? "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  function logout() {
    signOutAdmin();
    void navigate({ to: "/admin/login" });
  }

  return (
    <main className="bc-dashboard">
      <aside className="bc-dashboard-sidebar">
        <Link to="/" className="bc-logo"><span className="bc-logo-mark"><span /></span><span>Business <strong>Control</strong></span></Link>
        <div className="bc-sidebar-label">Gestão comercial</div>
        <div className="bc-sidebar-active"><ShieldCheck size={17} /> Leads</div>
        <button className="bc-sidebar-logout" onClick={logout}><LogOut size={16} /> Sair</button>
      </aside>
      <section className="bc-dashboard-content">
        <div className="bc-dashboard-header"><div><div className="bc-kicker">Painel administrativo</div><h1>Leads captados</h1><p>Acompanhe diagnósticos e próximos contatos.</p></div><Link className="bc-button bc-button-secondary" to="/"><ExternalLink size={16} /> Ver landing page</Link></div>
        <div className="bc-metric-grid"><Metric title="Total de leads" value={String(leads.length)} /><Metric title="Leads hoje" value={String(today)} /><Metric title="Leads quentes" value={String(hot)} /><Metric title="Taxa de conclusão" value="—" /></div>
        <div className="bc-lead-toolbar"><div className="bc-search"><Search size={17} /><input placeholder="Pesquisar por nome, empresa ou e-mail" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
        <div className="bc-lead-table-wrap">
          {loading ? <p className="bc-empty-state">Carregando leads...</p> : filtered.length === 0 ? <p className="bc-empty-state">Nenhum lead encontrado. O painel só exibe dados reais do banco conectado.</p> : <table className="bc-lead-table"><thead><tr><th>Nome</th><th>Empresa</th><th>WhatsApp</th><th>Score</th><th>Temperatura</th><th>Data</th></tr></thead><tbody>{filtered.map((lead, index) => <tr key={String(lead.id ?? index)}><td>{String(lead.name ?? "—")}</td><td>{String(lead.company_name ?? "—")}</td><td>{String(lead.phone ?? "—")}</td><td>{String(lead.lead_score ?? "—")}</td><td><span className={"bc-status bc-status-" + String(lead.lead_temperature ?? "frio")}>{String(lead.lead_temperature ?? "—")}</span></td><td>{String(lead.created_at ?? "—").slice(0, 10)}</td></tr>)}</tbody></table>}
        </div>
      </section>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) { return <div className="bc-metric"><span>{title}</span><strong>{value}</strong></div>; }
