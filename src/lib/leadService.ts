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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

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
        utm_source: payload.attribution.utm_source || null,
        utm_medium: payload.attribution.utm_medium || null,
        utm_campaign: payload.attribution.utm_campaign || null,
        utm_content: payload.attribution.utm_content || null,
        utm_term: payload.attribution.utm_term || null,
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
  user: { email?: string };
};

export async function signInAdmin(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, message: "Supabase ainda não foi configurado." };
  }

  const response = await fetch(supabaseUrl + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return { ok: false as const, message: "E-mail ou senha inválidos." };
  }

  const session = (await response.json()) as AdminSession;
  sessionStorage.setItem("bc_admin_session", JSON.stringify(session));
  return { ok: true as const, session };
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
    { headers: { apikey: publishableKey, Authorization: "Bearer " + session.access_token } },
  );
  if (!response.ok) return [];
  return (await response.json()) as Array<Record<string, unknown>>;
}
