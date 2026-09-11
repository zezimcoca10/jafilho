import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { canCreateMasterAdmin, createMasterAdmin, signInAdmin } from "../../lib/leadService";

export const Route = createFileRoute("/admin/login")({ component: AdminLogin });

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [masterAvailable, setMasterAvailable] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"login" | "create">("login");

  useEffect(() => {
    void canCreateMasterAdmin().then(setMasterAvailable);
  }, []);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
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

  async function submitCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (createPassword.length < 8) {
      setMessage("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    if (createPassword !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const result = await createMasterAdmin(email, createPassword);
    setLoading(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMasterAvailable(false);
    setPassword("");
    setCreatePassword("");
    setConfirmPassword("");

    if (result.session) {
      await navigate({ to: "/admin" });
      return;
    }

    setMode("login");
    setMessage(result.message || "Conta criada. Confirme seu e-mail e entre no painel.");
  }

  return (
    <main className="bc-admin-shell">
      <div className="bc-admin-card">
        <Link className="bc-admin-back" to="/"><ArrowLeft size={16} /> Voltar para a landing page</Link>
        <div className="bc-admin-brand"><span className="bc-logo-mark"><span /></span><span>Business <strong>Control</strong></span></div>
        <div className="bc-admin-icon"><LockKeyhole size={22} /></div>
        <div className="bc-kicker">Área restrita</div>
        <h1>{mode === "login" ? "Acesso administrativo" : "Criar conta master"}</h1>
        <p>
          {mode === "login"
            ? "Entre para acompanhar os leads e organizar o processo comercial."
            : "A primeira conta será o único administrador master deste sistema."}
        </p>

        {mode === "login" ? (
          <form onSubmit={submitLogin} className="bc-admin-form">
            <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
            {message && <p className="bc-form-error" role="alert">{message}</p>}
            <button className="bc-button bc-button-primary" disabled={loading}>{loading ? "Entrando..." : "Entrar no painel"}</button>
          </form>
        ) : (
          <form onSubmit={submitCreate} className="bc-admin-form">
            <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label>Senha<input type="password" value={createPassword} onChange={(event) => setCreatePassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
            <label>Confirmar senha<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
            {message && <p className="bc-form-error" role="alert">{message}</p>}
            <button className="bc-button bc-button-primary" disabled={loading}>{loading ? "Criando conta..." : "Criar conta master"}</button>
          </form>
        )}

        {masterAvailable && mode === "login" && (
          <button className="bc-button bc-button-secondary bc-admin-create-account" type="button" onClick={() => { setMessage(""); setMode("create"); }}>
            Criar conta
          </button>
        )}

        {mode === "create" && (
          <button className="bc-admin-switch" type="button" onClick={() => { setMessage(""); setMode("login"); }}>
            Já tenho uma conta
          </button>
        )}

        <div className="bc-admin-security"><ShieldCheck size={16} /> Acesso protegido por autenticação Supabase.</div>
      </div>
    </main>
  );
}
