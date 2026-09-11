import type { Diagnosis } from "./leadScoring";

export type LeadPayload = {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  role: string;
  answers: Record<string, string>;
  diagnosis: Diagnosis;
  consent: boolean;
  honeypot: string;
  attribution: Record<string, string>;
};

type LeadResult =
  | { ok: true; id?: string }
  | { ok: false; code: "not_configured" | "failed"; message: string };

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || "https://bqyalzeslhghfghacsqa.supabase.co";
const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_g2GKrSGGsHsSVy_f80cVWg_ugE2CCQE";

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && publishableKey);
}

export async function submitLead(payload: LeadPayload): Promise<LeadResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      code: "not_configured",
      message: "A conexão segura com o banco ainda está pendente de configuração.",
    };
  }

  try {
    const response = await fetch(supabaseUrl + "/rest/v1/leads", {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: "Bearer " + publishableKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name: payload.name.trim(),
        company_name: payload.companyName.trim(),
        phone: payload.phone.trim(),
        email: payload.email.trim().toLowerCase(),
        role: payload.role.trim() || null,
        answers: payload.answers,
        lead_score: payload.diagnosis.score,
        lead_temperature: payload.diagnosis.temperature,
        source: "business-control-landing",
        referrer: document.referrer || null,
        landing_page: window.location.href,
        consent_at: new Date().toISOString(),
        utm_source: payload.attribution["utm_source"] || null,
        utm_medium: payload.attribution["utm_medium"] || null,
        utm_campaign: payload.attribution["utm_campaign"] || null,
        utm_content: payload.attribution["utm_content"] || null,
        utm_term: payload.attribution["utm_term"] || null,
      }),
    });

    if (!response.ok) {
      return { ok: false, code: "failed", message: "Não foi possível enviar seus dados agora." };
    }

    return { ok: true };
  } catch {
    return { ok: false, code: "failed", message: "Não foi possível conectar ao banco agora." };
  }
}

export function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
    utm_content: params.get("utm_content") ?? "",
    utm_term: params.get("utm_term") ?? "",
  };
}

export type AdminSession = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email?: string };
};

type AuthResponse = AdminSession & {
  user?: { id: string; email?: string };
};

type AdminOperationResult =
  | { ok: true; session?: AdminSession; needsConfirmation?: boolean; message?: string }
  | { ok: false; message: string };

function adminHeaders(accessToken?: string) {
  return {
    apikey: publishableKey,
    ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
  };
}

export async function canCreateMasterAdmin() {
  if (!isSupabaseConfigured()) return false;

  try {
    const response = await fetch(
      supabaseUrl + "/rest/v1/admin_bootstrap?select=claimed&id=eq.true&limit=1",
      { headers: adminHeaders() },
    );
    if (!response.ok) return false;
    const rows = (await response.json()) as Array<{ claimed?: boolean }>;
    return rows[0]?.claimed === false;
  } catch {
    return false;
  }
}

async function hasAdminRecord(session: AdminSession) {
  const response = await fetch(
    supabaseUrl + "/rest/v1/admin_users?select=user_id&user_id=eq." + encodeURIComponent(session.user.id) + "&limit=1",
    { headers: adminHeaders(session.access_token) },
  );
  if (!response.ok) return false;
  const rows = (await response.json()) as Array<{ user_id?: string }>;
  return rows.length > 0;
}

async function claimMasterAdmin(session: AdminSession) {
  const response = await fetch(supabaseUrl + "/rest/v1/admin_users", {
    method: "POST",
    headers: {
      ...adminHeaders(session.access_token),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ user_id: session.user.id }),
  });
  return response.ok;
}

async function ensureMasterAdmin(session: AdminSession) {
  if (await hasAdminRecord(session)) return true;
  return claimMasterAdmin(session);
}

export async function createMasterAdmin(email: string, password: string): Promise<AdminOperationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase ainda não foi configurado." };
  }

  if (!(await canCreateMasterAdmin())) {
    return { ok: false, message: "A conta do administrador master já foi criada." };
  }

  try {
    const response = await fetch(supabaseUrl + "/auth/v1/signup", {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    const payload = (await response.json()) as Partial<AuthResponse> & { msg?: string; error_description?: string };
    if (!response.ok) {
      return {
        ok: false,
        message: payload.error_description || payload.msg || "Não foi possível criar a conta.",
      };
    }

    if (payload.access_token && payload.refresh_token && payload.user?.id) {
      const session = payload as AdminSession;
      if (!(await ensureMasterAdmin(session))) {
        return { ok: false, message: "A conta foi criada, mas não pôde ser definida como master." };
      }
      sessionStorage.setItem("bc_admin_session", JSON.stringify(session));
      return { ok: true, session };
    }

    return {
      ok: true,
      needsConfirmation: true,
      message: "Conta criada. Confirme o e-mail recebido e depois entre no painel.",
    };
  } catch {
    return { ok: false, message: "Não foi possível conectar ao banco agora." };
  }
}

export async function signInAdmin(email: string, password: string): Promise<AdminOperationResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase ainda não foi configurado." };
  }

  try {
    const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });

    if (!response.ok) {
      return { ok: false, message: "E-mail ou senha inválidos." };
    }

    const session = (await response.json()) as AdminSession;
    if (!session.user?.id || !(await ensureMasterAdmin(session))) {
      return { ok: false, message: "Este usuário não é o administrador master deste sistema." };
    }

    sessionStorage.setItem("bc_admin_session", JSON.stringify(session));
    return { ok: true, session };
  } catch {
    return { ok: false, message: "Não foi possível conectar ao banco agora." };
  }
}

export function getAdminSession(): AdminSession | null {
  const raw = sessionStorage.getItem("bc_admin_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function signOutAdmin() {
  sessionStorage.removeItem("bc_admin_session");
}

export async function fetchAdminLeads() {
  const session = getAdminSession();
  if (!session || !isSupabaseConfigured()) return [];
  const response = await fetch(
    supabaseUrl + "/rest/v1/leads?select=*&order=created_at.desc",
    { headers: adminHeaders(session.access_token) },
  );
  if (!response.ok) return [];
  return (await response.json()) as Array<Record<string, unknown>>;
}
