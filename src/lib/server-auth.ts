import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

const SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || "";

export function createAdminClient() {
  if (!SUPABASE_URL || !SECRET_KEY) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(SUPABASE_URL, SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createUserClient(accessToken: string) {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    throw new Error("Supabase public credentials are not configured.");
  }

  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function getBearerToken(request: Request) {
  const value = request.headers.get("authorization") || "";
  if (!value.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return value.slice(7).trim() || null;
}

export async function requireUser(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    throw new Response(
      JSON.stringify({ error: "UNAUTHENTICATED" }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      }
    );
  }

  const client = createUserClient(token);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Response(
      JSON.stringify({ error: "UNAUTHENTICATED" }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      }
    );
  }

  return {
    user: data.user,
    client,
    token,
  };
}

export async function requireStaff(request: Request) {
  const auth = await requireUser(request);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("staff_accounts")
    .select("id,auth_user_id,role,display_name,is_active")
    .eq("auth_user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    throw new Response(
      JSON.stringify({ error: "FORBIDDEN" }),
      {
        status: 403,
        headers: { "content-type": "application/json" },
      }
    );
  }

  return {
    ...auth,
    staff: data,
    admin,
  };
}

export async function requireAdmin(request: Request) {
  const staff = await requireStaff(request);

  if (!["admin", "bch"].includes(staff.staff.role)) {
    throw new Response(
      JSON.stringify({ error: "FORBIDDEN" }),
      {
        status: 403,
        headers: { "content-type": "application/json" },
      }
    );
  }

  return staff;
}
