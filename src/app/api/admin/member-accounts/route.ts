import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^\+|\+$/g, "");
}

const DEFAULT_BIRTH_YEAR = 2010;

function getBirthYear(value: unknown) {
  const year = Number(value);

  if (Number.isInteger(year) && year >= 1900 && year <= 2100) {
    return year;
  }

  return DEFAULT_BIRTH_YEAR;
}

export async function GET(request: Request) {
  try {
    const { admin, staff } = await requireAdmin(request);

    const { data, error } = await admin
      .from("members")
      .select(`
        id,
        student_id,
        full_name,
        class_name,
        gender,
        birth_year,
        avatar,
        member_accounts(
          id,
          email,
          status,
          must_change_password,
          created_at,
          last_login_at
        )
      `)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      staff,
      members: data ?? [],
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[ADMIN ACCOUNTS GET]", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách tài khoản." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { admin } = await requireAdmin(request);
    const body = (await request.json()) as {
      memberIds?: unknown;
      action?: unknown;
    };

    const ids = Array.isArray(body.memberIds)
      ? body.memberIds
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id))
      : [];

    if (!ids.length) {
      return NextResponse.json(
        { error: "Chưa chọn đoàn viên." },
        { status: 400 }
      );
    }

    const action = body.action === "reset"
      ? "reset"
      : "create";

    const { data: members, error: membersError } = await admin
      .from("members")
      .select("id,student_id,full_name,birth_year")
      .in("id", ids);

    if (membersError) {
      return NextResponse.json(
        { error: membersError.message },
        { status: 500 }
      );
    }

    const results: Array<Record<string, unknown>> = [];

    for (const member of members ?? []) {
const username = normalizeName(member.full_name);
const year = getBirthYear(member.birth_year);

if (!username) {
  results.push({
    member_id: member.id,
    full_name: member.full_name,
    status: "error",
    message: "Họ tên đoàn viên không hợp lệ.",
  });
  continue;
}

      const email = `${username}@dk66.vn`;
      const temporaryPassword = `${username}${year}`;

      const { data: existingAccount } = await admin
        .from("member_accounts")
        .select("id,auth_user_id,email,status")
        .eq("member_id", member.id)
        .maybeSingle();

      if (existingAccount) {
        if (action === "reset") {
          const { error: resetError } = await admin.auth.admin.updateUserById(
            existingAccount.auth_user_id,
            { password: temporaryPassword }
          );

          if (resetError) {
            results.push({
              member_id: member.id,
              full_name: member.full_name,
              email: existingAccount.email,
              status: "error",
              message: resetError.message,
            });
            continue;
          }

          const { error: updateError } = await admin
            .from("member_accounts")
            .update({
              status: "active",
              must_change_password: true,
            })
            .eq("id", existingAccount.id);

          if (updateError) {
            results.push({
              member_id: member.id,
              full_name: member.full_name,
              email: existingAccount.email,
              status: "error",
              message: updateError.message,
            });
            continue;
          }

          results.push({
            member_id: member.id,
            full_name: member.full_name,
            email: existingAccount.email,
            temporary_password: temporaryPassword,
            status: "reset",
          });
          continue;
        }

        results.push({
          member_id: member.id,
          full_name: member.full_name,
          email: existingAccount.email,
          status: "exists",
          message: "Đã có tài khoản.",
        });
        continue;
      }

      const { data: createdUser, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            account_type: "member",
            member_id: member.id,
            full_name: member.full_name,
          },
        });

      if (createError || !createdUser.user) {
        results.push({
          member_id: member.id,
          full_name: member.full_name,
          email,
          status: "error",
          message:
            createError?.message ||
            "Không tạo được tài khoản Auth.",
        });
        continue;
      }

      const { error: accountError } = await admin
        .from("member_accounts")
        .insert({
          member_id: member.id,
          auth_user_id: createdUser.user.id,
          email,
          status: "active",
          must_change_password: true,
        });

      if (accountError) {
        await admin.auth.admin.deleteUser(createdUser.user.id);

        results.push({
          member_id: member.id,
          full_name: member.full_name,
          email,
          status: "error",
          message: accountError.message,
        });
        continue;
      }

      results.push({
        member_id: member.id,
        student_id: member.student_id,
        full_name: member.full_name,
        email,
        temporary_password: temporaryPassword,
        status: "created",
      });
    }

    return NextResponse.json({
      operator: admin ? "authenticated" : "unknown",
      results,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[ADMIN ACCOUNTS POST]", error);
    return NextResponse.json(
      { error: "Không thể cấp tài khoản." },
      { status: 500 }
    );
  }
}
