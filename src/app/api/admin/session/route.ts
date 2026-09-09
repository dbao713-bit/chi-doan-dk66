import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const { user, staff } = await requireStaff(request);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      staff,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
