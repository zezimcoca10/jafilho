import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type UserAction = "list" | "create" | "update" | "approve" | "revoke" | "remove";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function getKey(jsonName: string, legacyName: string) {
  const jsonValue = Deno.env.get(jsonName);
  if (jsonValue) {
    try {
      const parsed = JSON.parse(jsonValue);
      if (typeof parsed === "string") return parsed;
      if (parsed?.default) return parsed.default;
    } catch {
      // Fall back to the legacy environment variable below.
    }
  }
  return Deno.env.get(legacyName) ?? "";
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const publishableKey = getKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
const secretKey = getKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");

async function authenticate(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length);
  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;

  return { token, user: data.user };
}

async function requireMaster(request: Request) {
  const caller = await authenticate(request);
  if (!caller) return { caller: null, admin: null };

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", caller.user.id)
    .maybeSingle();

  if (error || !data) return { caller: null, admin: null };
  return { caller, admin };
}

async function listAllUsers(admin: ReturnType<typeof createClient>) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
    page += 1;
  }

  return users;
}

async function buildUsers(admin: ReturnType<typeof createClient>) {
  const [users, requestsResult, adminsResult] = await Promise.all([
    listAllUsers(admin),
    admin.from("admin_access_requests").select("user_id,email,status,requested_at,reviewed_at,reviewed_by"),
    admin.from("admin_users").select("user_id,created_at"),
  ]);

  if (requestsResult.error) throw requestsResult.error;
  if (adminsResult.error) throw adminsResult.error;

  const requests = new Map((requestsResult.data ?? []).map((item) => [item.user_id, item]));
  const masters = new Map((adminsResult.data ?? []).map((item) => [item.user_id, item]));

  return users
    .filter((user) => Boolean(user.email))
    .map((user) => {
      const request = requests.get(user.id);
      const master = masters.get(user.id);
      return {
        user_id: user.id,
        email: user.email ?? "",
        name: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""),
        status: master ? "master" : request?.status ?? "none",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        requested_at: request?.requested_at ?? null,
        reviewed_at: request?.reviewed_at ?? null,
      };
    })
    .sort((left, right) => {
      if (left.status === "master") return -1;
      if (right.status === "master") return 1;
      return left.email.localeCompare(right.email);
    });
}

async function findUser(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("Usuário não encontrado.");
  return data.user;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const { caller, admin } = await requireMaster(request);
  if (!caller || !admin) return response({ error: "Apenas o administrador master pode executar esta ação." }, 403);

  let body: {
    action?: UserAction;
    user_id?: string;
    email?: string;
    password?: string;
    name?: string;
  };

  try {
    body = await request.json();
  } catch {
    return response({ error: "Requisição inválida." }, 400);
  }

  const action = body.action;
  if (!action) return response({ error: "Ação não informada." }, 400);

  try {
    if (action === "list") {
      return response({ users: await buildUsers(admin) });
    }

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const name = String(body.name ?? "").trim();

      if (!email || !email.includes("@")) return response({ error: "Informe um e-mail válido." }, 400);
      if (password.length < 8) return response({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: name ? { full_name: name } : {},
      });
      if (error || !data.user) return response({ error: error?.message ?? "Não foi possível criar o usuário." }, 400);

      const { error: requestError } = await admin.from("admin_access_requests").upsert({
        user_id: data.user.id,
        email,
        status: "approved",
        requested_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: caller.user.id,
      }, { onConflict: "user_id" });

      if (requestError) {
        await admin.auth.admin.deleteUser(data.user.id, true);
        return response({ error: "Usuário criado, mas o acesso não pôde ser registrado." }, 500);
      }

      return response({ user_id: data.user.id });
    }

    const userId = String(body.user_id ?? "").trim();
    if (!userId) return response({ error: "Usuário não informado." }, 400);

    const { data: targetMaster } = await admin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if ((action === "remove" || action === "revoke") && targetMaster) {
      return response({ error: "O administrador master não pode ser removido ou revogado." }, 400);
    }

    if (action === "update") {
      const updates: { email?: string; password?: string; user_metadata?: Record<string, string> } = {};
      if (body.email !== undefined) {
        const email = String(body.email).trim().toLowerCase();
        if (!email || !email.includes("@")) return response({ error: "Informe um e-mail válido." }, 400);
        updates.email = email;
      }
      if (body.password) {
        if (body.password.length < 8) return response({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
        updates.password = body.password;
      }
      if (body.name !== undefined) {
        updates.user_metadata = { full_name: String(body.name).trim() };
      }
      if (Object.keys(updates).length === 0) return response({ error: "Nenhuma alteração foi informada." }, 400);

      const { data, error } = await admin.auth.admin.updateUserById(userId, updates);
      if (error || !data.user) return response({ error: error?.message ?? "Não foi possível editar o usuário." }, 400);

      if (updates.email) {
        const { error: requestError } = await admin
          .from("admin_access_requests")
          .update({ email: updates.email })
          .eq("user_id", userId);
        if (requestError) return response({ error: "Usuário editado, mas o e-mail de acesso não foi atualizado." }, 500);
      }

      return response({ user_id: userId });
    }

    const target = await findUser(admin, userId);
    const targetEmail = target.email ?? "";

    if (action === "approve" || action === "revoke") {
      const status = action === "approve" ? "approved" : "revoked";
      const { error } = await admin.from("admin_access_requests").upsert({
        user_id: userId,
        email: targetEmail,
        status,
        requested_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: caller.user.id,
      }, { onConflict: "user_id" });
      if (error) return response({ error: error.message }, 500);
      return response({ user_id: userId, status });
    }

    if (action === "remove") {
      const { error } = await admin.auth.admin.deleteUser(userId, true);
      if (error) return response({ error: error.message }, 400);
      return response({ user_id: userId, removed: true });
    }

    return response({ error: "Ação desconhecida." }, 400);
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Erro interno ao gerenciar usuário." }, 500);
  }
});
