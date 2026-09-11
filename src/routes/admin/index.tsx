import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  Clipboard,
  ExternalLink,
  KeyRound,
  LogOut,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundX,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { quizQuestions } from "../../config/quiz";
import {
  createAdminUser,
  deleteLead,
  fetchAccessRequests,
  fetchAdminLeads,
  fetchAdminUsers,
  getAdminSession,
  isMasterAdmin,
  removeAdminUser,
  setAdminUserStatus,
  signOutAdmin,
  updateAdminUser,
  type ManagedAdminUser,
} from "../../lib/leadService";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type AccessRequest = {
  user_id: string;
  email: string;
  status: "pending" | "approved" | "revoked";
  requested_at: string;
};

type UserFormState = {
  user_id?: string;
  name: string;
  email: string;
  password: string;
};

function normalizeWhatsApp(phone: unknown) {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits;
}

function answerEntries(lead: Record<string, unknown>) {
  const answers = lead["answers"];
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return [];
  return Object.entries(answers as Record<string, unknown>).filter(([, value]) => value !== null && value !== undefined && value !== "");
}

const answerQuestionLabels: Record<string, string> = {
  main_challenge: "Maior desafio",
  current_control: "Controle atual",
  team_size: "Tamanho da equipe",
  system_limit: "Limitação do sistema",
  spreadsheet_pain: "Problema com planilhas",
  urgency: "Urgência",
  desired_control: "Resultado desejado",
};

const temperatureLabels: Record<string, string> = {
  frio: "frio",
  morno: "morno",
  quente: "quente",
  cold: "frio",
  warm: "morno",
  hot: "quente",
};

function humanizeAnswerKey(key: string) {
  return answerQuestionLabels[key] ?? key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function translateAnswerValue(questionKey: string | undefined, value: unknown) {
  const raw = String(value ?? "—");
  const question = questionKey ? quizQuestions.find((item) => item.id === questionKey) : undefined;
  return question?.answers?.find((answer) => answer.value === raw)?.label ?? raw;
}

function formatAnswer(value: unknown, questionKey?: string) {
  if (Array.isArray(value)) return value.map((item) => translateAnswerValue(questionKey, item)).join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return translateAnswerValue(questionKey, value);
}

function translateTemperature(value: unknown) {
  const raw = String(value ?? "—").toLowerCase();
  return temperatureLabels[raw] ?? String(value ?? "—");
}

function buildWhatsAppMessage(lead: Record<string, unknown>) {
  const name = String(lead["name"] ?? "").trim() || "tudo bem";
  const lines = [
    "Olá, " + name + "! Aqui é da Business Control.",
    "Recebi seu diagnóstico de controle e quero entender melhor a realidade da sua empresa.",
    "",
    "Empresa: " + String(lead["company_name"] ?? "não informado"),
  ];

  if (lead["role"]) lines.push("Cargo: " + String(lead["role"]));
  if (lead["lead_temperature"]) lines.push("Temperatura do lead: " + translateTemperature(lead["lead_temperature"]));
  if (lead["lead_score"]) lines.push("Pontuação: " + String(lead["lead_score"]));

  const answers = answerEntries(lead);
  if (answers.length) {
    lines.push("", "Respostas do diagnóstico:");
    for (const [question, answer] of answers) {
      lines.push("- " + humanizeAnswerKey(question) + ": " + formatAnswer(answer, question));
    }
  }

  lines.push("", "Podemos conversar sobre o próximo passo?");
  return lines.join("\n");
}

function whatsappUrl(lead: Record<string, unknown>) {
  const phone = normalizeWhatsApp(lead["phone"]);
  return phone ? "https://wa.me/" + phone + "?text=" + encodeURIComponent(buildWhatsAppMessage(lead)) : "";
}

function statusLabel(status: ManagedAdminUser["status"]) {
  if (status === "master") return "Master";
  if (status === "approved") return "Aprovado";
  if (status === "pending") return "Pendente";
  if (status === "revoked") return "Revogado";
  return "Sem acesso";
}

function formatDate(value?: string | null) {
  if (!value) return "Nunca";
  return new Date(value).toLocaleDateString("pt-BR");
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState<"leads" | "users">("leads");
  const [leads, setLeads] = useState<Array<Record<string, unknown>>>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [users, setUsers] = useState<ManagedAdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [master, setMaster] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Record<string, unknown> | null>(null);
  const [userDialog, setUserDialog] = useState<UserFormState | null>(null);
  const [userSaving, setUserSaving] = useState(false);
  const [userMessage, setUserMessage] = useState("");

  useEffect(() => {
    let active = true;
    const session = getAdminSession();
    if (!session) {
      void navigate({ to: "/admin/login" });
      return;
    }

    async function loadDashboard() {
      const [nextLeads, nextRequests, isMaster] = await Promise.all([
        fetchAdminLeads(),
        fetchAccessRequests(),
        isMasterAdmin(),
      ]);
      if (!active) return;

      setLeads(nextLeads);
      setRequests(nextRequests as AccessRequest[]);
      setMaster(isMaster);

      if (isMaster) {
        setUsers(await fetchAdminUsers());
      }
      if (active) setLoading(false);
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [navigate]);

  const filteredLeads = useMemo(() => {
    const term = search.toLowerCase();
    return leads.filter((lead) =>
      String(lead["name"] ?? "").toLowerCase().includes(term) ||
      String(lead["company_name"] ?? "").toLowerCase().includes(term) ||
      String(lead["email"] ?? "").toLowerCase().includes(term),
    );
  }, [leads, search]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.toLowerCase();
    return users.filter((user) =>
      user.email.toLowerCase().includes(term) ||
      user.name.toLowerCase().includes(term) ||
      statusLabel(user.status).toLowerCase().includes(term),
    );
  }, [users, userSearch]);

  const hot = leads.filter((lead) => translateTemperature(lead["lead_temperature"]) === "quente").length;
  const today = leads.filter((lead) => String(lead["created_at"] ?? "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const pendingRequests = requests.filter((request) => request.status === "pending").length;

  async function refreshUsers() {
    setUsers(await fetchAdminUsers());
    setRequests(await fetchAccessRequests() as AccessRequest[]);
  }

  async function handleDeleteLead(leadId: string) {
    if (!window.confirm("Remover este lead do sistema?")) return;
    if (await deleteLead(leadId)) {
      setLeads((current) => current.filter((lead) => String(lead["id"]) !== leadId));
      setSelectedLead(null);
    }
  }

  async function handleUserStatus(user: ManagedAdminUser, status: "approved" | "revoked") {
    if (status === "revoked" && !window.confirm("Revogar o acesso de " + user.email + "?")) return;
    setUserMessage("");
    const result = await setAdminUserStatus(user.user_id, status);
    if (!result.ok) {
      setUserMessage(result.message ?? "Não foi possível atualizar o acesso.");
      return;
    }
    await refreshUsers();
  }

  async function handleRemoveUser(user: ManagedAdminUser) {
    if (!window.confirm("Remover definitivamente o usuário " + user.email + "? Essa ação encerra o acesso ao sistema.")) return;
    setUserMessage("");
    const result = await removeAdminUser(user.user_id);
    if (!result.ok) {
      setUserMessage(result.message ?? "Não foi possível remover o usuário.");
      return;
    }
    await refreshUsers();
  }

  async function handleSaveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userDialog) return;

    setUserSaving(true);
    setUserMessage("");
    const result = userDialog.user_id
      ? await updateAdminUser(userDialog)
      : await createAdminUser(userDialog);

    setUserSaving(false);
    if (!result.ok) {
      setUserMessage(result.message ?? "Não foi possível salvar o usuário.");
      return;
    }

    setUserDialog(null);
    await refreshUsers();
  }

  function openCreateUser() {
    setUserMessage("");
    setUserDialog({ name: "", email: "", password: "" });
  }

  function openEditUser(user: ManagedAdminUser) {
    setUserMessage("");
    setUserDialog({ user_id: user.user_id, name: user.name, email: user.email, password: "" });
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
        <button className={"bc-sidebar-nav" + (section === "leads" ? " is-active" : "")} onClick={() => setSection("leads")}><ShieldCheck size={17} /> Leads</button>
        {master && <button className={"bc-sidebar-nav" + (section === "users" ? " is-active" : "")} onClick={() => setSection("users")}><ShieldCheck size={17} /> Administradores</button>}
        <button className="bc-sidebar-logout" onClick={logout}><LogOut size={16} /> Sair</button>
      </aside>

      <section className="bc-dashboard-content">
        {section === "users" && master ? (
          <>
            <div className="bc-dashboard-header">
              <div><div className="bc-kicker">Controle de acesso</div><h1>Administradores</h1><p>Adicione, edite, aprove, revogue ou remova acessos da plataforma.</p></div>
              <button className="bc-button bc-button-primary" onClick={openCreateUser}><Plus size={16} /> Adicionar usuário</button>
            </div>

            <div className="bc-management-summary">
              <span><strong>{users.length}</strong> usuários cadastrados</span>
              <span><strong>{users.filter((user) => user.status === "approved").length}</strong> com acesso aprovado</span>
              <span><strong>{users.filter((user) => user.status === "pending").length}</strong> aguardando aprovação</span>
            </div>

            {userMessage && <p className="bc-form-error bc-management-message" role="alert">{userMessage}</p>}
            <div className="bc-lead-toolbar"><div className="bc-search"><Search size={17} /><input placeholder="Pesquisar usuário por nome ou e-mail" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} /></div></div>
            <div className="bc-lead-table-wrap">
              {filteredUsers.length === 0 ? <p className="bc-empty-state">Nenhum usuário encontrado.</p> : (
                <table className="bc-lead-table">
                  <thead><tr><th>Nome</th><th>E-mail</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead>
                  <tbody>{filteredUsers.map((user) => (
                    <tr key={user.user_id}>
                      <td>{user.name || "Sem nome"}</td>
                      <td>{user.email}</td>
                      <td><span className={"bc-access-status bc-access-" + user.status}>{statusLabel(user.status)}</span></td>
                      <td>{formatDate(user.last_sign_in_at)}</td>
                      <td className="bc-table-actions">
                        <button className="bc-icon-action bc-icon-action-edit" title="Editar usuário" onClick={() => openEditUser(user)}><Pencil size={15} /></button>
                        {user.status !== "master" && user.status !== "approved" && <button className="bc-icon-action bc-icon-action-approve" title="Aprovar acesso" onClick={() => void handleUserStatus(user, "approved")}><Check size={15} /></button>}
                        {user.status === "approved" && <button className="bc-icon-action bc-icon-action-revoke" title="Revogar acesso" onClick={() => void handleUserStatus(user, "revoked")}><UserRoundX size={15} /></button>}
                        {user.status === "revoked" && <button className="bc-icon-action bc-icon-action-approve" title="Aprovar acesso novamente" onClick={() => void handleUserStatus(user, "approved")}><Check size={15} /></button>}
                        {user.status !== "master" && <button className="bc-icon-action bc-icon-action-delete" title="Remover usuário" onClick={() => void handleRemoveUser(user)}><Trash2 size={15} /></button>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <>
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

            <div className="bc-lead-toolbar"><div className="bc-search"><Search size={17} /><input placeholder="Pesquisar por nome, empresa ou e-mail" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
            <div className="bc-lead-table-wrap">
              {loading ? <p className="bc-empty-state">Carregando leads...</p> : filteredLeads.length === 0 ? <p className="bc-empty-state">Nenhum lead encontrado. O painel só exibe dados reais do banco conectado.</p> : (
                <table className="bc-lead-table">
                  <thead><tr><th>Nome</th><th>Empresa</th><th>WhatsApp</th><th>Score</th><th>Temperatura</th><th>Data</th><th>Ações</th></tr></thead>
                  <tbody>{filteredLeads.map((lead, index) => {
                    const leadId = String(lead["id"] ?? index);
                    const contactUrl = whatsappUrl(lead);
                    return <tr key={leadId}>
                      <td><button className="bc-lead-link" onClick={() => setSelectedLead(lead)}>{String(lead["name"] ?? "—")}</button></td>
                      <td>{String(lead["company_name"] ?? "—")}</td>
                      <td>{contactUrl ? <a className="bc-whatsapp-link" href={contactUrl} target="_blank" rel="noreferrer"><MessageCircle size={14} />{String(lead["phone"] ?? "—")}</a> : String(lead["phone"] ?? "—")}</td>
                      <td>{String(lead["lead_score"] ?? "—")}</td>
                      <td><span className={"bc-status bc-status-" + translateTemperature(lead["lead_temperature"] ?? "frio")}>{translateTemperature(lead["lead_temperature"] ?? "—")}</span></td>
                      <td>{String(lead["created_at"] ?? "—").slice(0, 10)}</td>
                      <td className="bc-table-actions">
                        {contactUrl && <a className="bc-icon-action bc-icon-action-whatsapp" title="Abrir conversa no WhatsApp" href={contactUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /></a>}
                        <button className="bc-icon-action bc-icon-action-delete" title="Remover lead" onClick={() => void handleDeleteLead(leadId)}><Trash2 size={15} /></button>
                      </td>
                    </tr>;
                  })}</tbody>
                </table>
              )}
            </div>
          </>
        )}
      </section>

      {selectedLead && <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} />}
      {userDialog && <UserDialog value={userDialog} saving={userSaving} onChange={setUserDialog} onClose={() => setUserDialog(null)} onSubmit={handleSaveUser} />}
    </main>
  );
}

function LeadDetail({ lead, onClose }: { lead: Record<string, unknown>; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const message = buildWhatsAppMessage(lead);
  const contactUrl = whatsappUrl(lead);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="bc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="bc-detail-panel" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title">
        <div className="bc-detail-header">
          <div><div className="bc-kicker">Detalhes do lead</div><h2 id="lead-detail-title">{String(lead["name"] ?? "Lead")}</h2><p>{String(lead["company_name"] ?? "Empresa não informada")}</p></div>
          <button className="bc-modal-close" onClick={onClose} aria-label="Fechar detalhes"><X size={19} /></button>
        </div>
        <div className="bc-detail-grid">
          <div><span>E-mail</span><a href={"mailto:" + String(lead["email"] ?? "")}><Mail size={14} />{String(lead["email"] ?? "—")}</a></div>
          <div><span>WhatsApp</span>{contactUrl ? <a href={contactUrl} target="_blank" rel="noreferrer"><MessageCircle size={14} />{String(lead["phone"] ?? "—")}</a> : <strong>—</strong>}</div>
          <div><span>Cargo</span><strong>{String(lead["role"] ?? "—")}</strong></div>
          <div><span>Temperatura</span><strong>{translateTemperature(lead["lead_temperature"] ?? "—")}</strong></div>
          <div><span>Score</span><strong>{String(lead["lead_score"] ?? "—")}</strong></div>
        </div>
        <div className="bc-answer-section">
          <div className="bc-detail-subheading"><h3>Respostas do questionário</h3><span>{answerEntries(lead).length} respostas</span></div>
          {answerEntries(lead).length === 0 ? <p className="bc-empty-state">Este lead não possui respostas estruturadas.</p> : <div className="bc-answer-list">{answerEntries(lead).map(([question, answer]) => <div key={question} className="bc-answer-item"><span>{humanizeAnswerKey(question)}</span><strong>{formatAnswer(answer, question)}</strong></div>)}</div>}
        </div>
        <div className="bc-message-section">
          <div className="bc-detail-subheading"><h3>Mensagem pronta para o WhatsApp</h3><button className="bc-button bc-button-secondary" onClick={() => void copyMessage()}><Clipboard size={14} />{copied ? "Copiada" : "Copiar mensagem"}</button></div>
          <textarea readOnly value={message} aria-label="Mensagem pronta para WhatsApp" />
          {contactUrl && <a className="bc-button bc-button-primary bc-whatsapp-cta" href={contactUrl} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Abrir conversa no WhatsApp</a>}
        </div>
      </section>
    </div>
  );
}

function UserDialog({ value, saving, onChange, onClose, onSubmit }: { value: UserFormState; saving: boolean; onChange: (value: UserFormState | null) => void; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const editing = Boolean(value.user_id);
  return (
    <div className="bc-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="bc-user-modal" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title">
        <div className="bc-detail-header"><div><div className="bc-kicker">Controle de acesso</div><h2 id="user-dialog-title">{editing ? "Editar usuário" : "Adicionar usuário"}</h2><p>{editing ? "Atualize os dados de acesso sem alterar os leads." : "O usuário será criado com acesso aprovado."}</p></div><button className="bc-modal-close" onClick={onClose} aria-label="Fechar formulário"><X size={19} /></button></div>
        <form className="bc-user-form" onSubmit={onSubmit}>
          <label>Nome<input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} placeholder="Nome do usuário" /></label>
          <label>E-mail<input type="email" required value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} placeholder="usuario@empresa.com" /></label>
          <label>{editing ? "Nova senha (opcional)" : "Senha inicial"}<input type="password" minLength={8} required={!editing} value={value.password} onChange={(event) => onChange({ ...value, password: event.target.value })} placeholder={editing ? "Deixe em branco para manter" : "Mínimo de 8 caracteres"} /></label>
          <div className="bc-user-form-actions"><button type="button" className="bc-button bc-button-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="bc-button bc-button-primary" disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar usuário"}<KeyRound size={14} /></button></div>
        </form>
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return <div className="bc-metric"><span>{title}</span><strong>{value}</strong></div>;
}
