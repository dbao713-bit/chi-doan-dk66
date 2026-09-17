import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_SECRET_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      )
    : null;

const STAFF_ROLES = [
  "admin",
  "bch",
  "editor",
] as const;

export type StaffRole =
  (typeof STAFF_ROLES)[number];

export type AdminContext = {
  supabase: NonNullable<typeof supabase>;
  user: {
    id: string;
    email?: string | null;
  };
  staff: {
    id: string;
    auth_user_id: string;
    role: StaffRole;
    display_name: string | null;
    is_active: boolean;
  };
};

function getBearerToken(
  request: Request
) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  return match?.[1] || null;
}

export async function getAdminContext(
  request: Request
): Promise<AdminContext | null> {
  if (!supabase) {
    console.error(
      "[ADMIN AUTH] Supabase server config is missing."
    );

    return null;
  }

  const token =
    getBearerToken(request);

  if (!token) {
    return null;
  }

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser(
    token
  );

  if (
    userError ||
    !userData?.user
  ) {
    return null;
  }

  const user =
    userData.user;

  const {
    data: staff,
    error: staffError,
  } = await supabase
    .from("staff_accounts")
    .select(
      "id, auth_user_id, role, display_name, is_active"
    )
    .eq(
      "auth_user_id",
      user.id
    )
    .eq(
      "is_active",
      true
    )
    .maybeSingle();

  if (
    staffError ||
    !staff
  ) {
    return null;
  }

  if (
    !STAFF_ROLES.includes(
      staff.role as StaffRole
    )
  ) {
    return null;
  }

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email,
    },
    staff: {
      id: staff.id,
      auth_user_id:
        staff.auth_user_id,
      role:
        staff.role as StaffRole,
      display_name:
        staff.display_name,
      is_active:
        staff.is_active,
    },
  };
}