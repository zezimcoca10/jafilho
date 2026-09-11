import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { signInAdmin } from "../../lib/leadService";

export const Route = createFileRoute("/admin/login")({ component: AdminLogin });

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const result = await signInAdmin(email, password);
    setLoading(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    await navigate({ to: "/admin" });
  }

  return (
    <main className="bc-admin-shell">
      <div className="bc-admin-card">
        <Link className="bc-admin-back" to="/"><ArrowLeft size={16} /> Voltar para a landing page</Link>
        <div className="bc-admin-brand"><span className="bc-logo-mark"><span /></span><span>Business <strong>Control</strong></span></div>
        <div className="bc-admin-icon"><LockKeyhole size={22} /></div>
        <div className="bc-kicker">Área restrita</div>
        <h1>Acesso administrativo</h1>
        <p>Entre para acompanhar os leads e organizar o processo comercial.</p>
        <form onSubmit={submit} className="bc-admin-form">
          <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
          {message && <p className="bc-form-error" role="alert">{message}</p>}
          <button className="bc-button bc-button-primary" disabled={loading}>{loading ? "Entrando..." : "Entrar no painel"}</button>
        </form>
        <div className="bc-admin-security"><ShieldCheck size={16} /> Acesso protegido por autenticação Supabase.</div>
      </div>
    </main>
  );
}
