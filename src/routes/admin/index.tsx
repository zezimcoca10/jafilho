import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, LogOut, Search, ShieldCheck, Trash2, UserRoundX } from "lucide-react";
import {
  deleteLead,
  fetchAccessRequests,
  fetchAdminLeads,
  getAdminSession,
  isMasterAdmin,
  reviewAccessRequest,
  signOutAdmin,
} from "../../lib/leadService";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type AccessRequest = {
  user_id: string;
  email: string;
  status: "pending" | "approved" | "revoked";
  requested_at: string;
};

function AdminDashboard() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Array<Record<string, unknown>>>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [master, setMaster] = useState(false);

  useEffect(() => {
    let active = true;
    const session = getAdminSession();
    if (!session) {
      void navigate({ to: "/admin/login" });
      return;
    }

    Promise.all([fetchAdminLeads(), fetchAccessRequests(), isMasterAdmin()])
      .then(([nextLeads, nextRequests, isMaster]) => {
        if (!active) return;
        setLeads(nextLeads);
        setRequests(nextRequests as AccessRequest[]);
        setMaster(isMaster);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return leads.filter((lead) => String(lead["name"] ?? "").toLowerCase().includes(term) || String(lead["company_name"] ?? "").toLowerCase().includes(term) || String(lead["email"] ?? "").toLowerCase().includes(term));
  }, [leads, search]);

  const hot = leads.filter((lead) => lead["lead_temperature"] === "quente").length;
  const today = leads.filter((lead) => String(lead["created_at"] ?? "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const pendingRequests = requests.filter((request) => request.status === "pending").length;

  async function handleDeleteLead(leadId: string) {
    if (!window.confirm("Remover este lead do sistema?")) return;
    if (await deleteLead(leadId)) {
      setLeads((current) => current.filter((lead) => String(lead["id"]) !== leadId));
    }
  }

  async function handleReview(userId: string, status: "approved" | "revoked") {
    if (await reviewAccessRequest(userId, status)) {
      setRequests(await fetchAccessRequests() as AccessRequest[]);
    }
  }

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
        {master && <div className="bc-sidebar-active"><ShieldCheck size={17} /> Administradores</div>}
        <button className="bc-sidebar-logout" onClick={logout}><LogOut size={16} /> Sair</button>
      </aside>

      <section className="bc-dashboard-content">
        <div className="bc-dashboard-header">
          <div><div className="bc-kicker">Painel administrativo</div><h1>Leads captados</h1><p>Acompanhe diagnósticos e próximos contatos.</p></div>
          <Link className="bc-button bc-button-secondary" to="/"><ExternalLink size={16} /> Ver landing page</Link>
        </div>

        <div className="bc-metric-grid">
          <Metric title="Total de leads" value={String(leads.length)} />
          <Metric title="Leads hoje" value={String(today)} />
          <Metric title="Leads quentes" value={String(hot)} />
          <Metric title="Acessos pendentes" value={String(pendingRequests)} />
        </div>

        {master && (
          <section className="bc-admin-management">
            <div className="bc-management-heading">
              <div><div className="bc-kicker">Controle de acesso</div><h2>Usuários e permissões</h2></div>
              <span className="bc-management-note">Somente o master aprova ou revoga acessos.</span>
            </div>
            <div className="bc-lead-table-wrap">
              {requests.length === 0 ? <p className="bc-empty-state">Nenhuma solicitação de acesso.</p> : (
                <table className="bc-lead-table">
                  <thead><tr><th>E-mail</th><th>Status</th><th>Solicitado em</th><th>Ações</th></tr></thead>
                  <tbody>{requests.map((request) => (
                    <tr key={request.user_id}>
                      <td>{request.email}</td>
                      <td><span className={"bc-access-status bc-access-" + request.status}>{request.status === "pending" ? "Pendente" : request.status === "approved" ? "Aprovado" : "Revogado"}</span></td>
                      <td>{request.requested_at.slice(0, 10)}</td>
                      <td className="bc-table-actions">
                        {request.status !== "approved" && <button className="bc-icon-action bc-icon-action-approve" title="Aprovar acesso" onClick={() => void handleReview(request.user_id, "approved")}><Check size={15} /></button>}
                        {request.status !== "revoked" && <button className="bc-icon-action bc-icon-action-revoke" title="Revogar acesso" onClick={() => void handleReview(request.user_id, "revoked")}><UserRoundX size={15} /></button>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </section>
        )}

        <div className="bc-lead-toolbar"><div className="bc-search"><Search size={17} /><input placeholder="Pesquisar por nome, empresa ou e-mail" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
        <div className="bc-lead-table-wrap">
          {loading ? <p className="bc-empty-state">Carregando leads...</p> : filtered.length === 0 ? <p className="bc-empty-state">Nenhum lead encontrado. O painel só exibe dados reais do banco conectado.</p> : (
            <table className="bc-lead-table">
              <thead><tr><th>Nome</th><th>Empresa</th><th>WhatsApp</th><th>Score</th><th>Temperatura</th><th>Data</th><th>Ações</th></tr></thead>
              <tbody>{filtered.map((lead, index) => {
                const leadId = String(lead["id"] ?? index);
                return <tr key={leadId}><td>{String(lead["name"] ?? "—")}</td><td>{String(lead["company_name"] ?? "—")}</td><td>{String(lead["phone"] ?? "—")}</td><td>{String(lead["lead_score"] ?? "—")}</td><td><span className={"bc-status bc-status-" + String(lead["lead_temperature"] ?? "frio")}>{String(lead["lead_temperature"] ?? "—")}</span></td><td>{String(lead["created_at"] ?? "—").slice(0, 10)}</td><td><button className="bc-icon-action bc-icon-action-delete" title="Remover lead" onClick={() => void handleDeleteLead(leadId)}><Trash2 size={15} /></button></td></tr>;
              })}</tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ title, value }: { title: string; value: string }) { return <div className="bc-metric"><span>{title}</span><strong>{value}</strong></div>; }
