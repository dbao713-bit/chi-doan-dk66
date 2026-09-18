import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/server-auth";

type PollOptionInput = {
  id?: string;
  optionText: string;
  sortOrder?: number;
};

type PollInput = {
  title: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  allowMultiple?: boolean;
  status?: "draft" | "published" | "closed";
  options: PollOptionInput[];
};

function cleanOptions(options: PollOptionInput[]) {
  return options
    .map((item, index) => ({
      id: item.id,
      optionText: String(item.optionText || "").trim(),
      sortOrder: item.sortOrder ?? index,
    }))
    .filter((item) => item.optionText.length > 0);
}

export async function GET(request: Request) {
  try {
    const { admin } = await requireStaff(request);

    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get("id");

    let query = admin
      .from("polls")
      .select(`
        id,
        title,
        description,
        starts_at,
        ends_at,
        allow_multiple,
        status,
        created_by,
        created_at,
        updated_at,
        poll_options (
          id,
          option_text,
          sort_order,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (pollId) {
      query = query.eq("id", pollId);
    }

    const { data: polls, error } = await query;

    if (error) {
      console.error("[ADMIN POLLS GET]", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const pollList = polls ?? [];

    if (pollList.length === 0) {
      return NextResponse.json([]);
    }

    const pollIds = pollList.map((poll) => poll.id);

    const { data: votes, error: voteError } = await admin
      .from("poll_votes")
      .select("id, poll_id, option_id, member_id, voted_at")
      .in("poll_id", pollIds);

    if (voteError) {
      console.error("[ADMIN POLLS VOTES GET]", voteError);
      return NextResponse.json(
        { error: voteError.message },
        { status: 500 }
      );
    }

    const voteList = votes ?? [];

    const result = pollList.map((poll) => {
      const pollVotes = voteList.filter(
        (vote) => vote.poll_id === poll.id
      );

      const options = (poll.poll_options ?? [])
        .sort(
          (a: { sort_order: number }, b: { sort_order: number }) =>
            a.sort_order - b.sort_order
        )
        .map(
          (option: {
            id: string;
            option_text: string;
            sort_order: number;
          }) => {
            const count = pollVotes.filter(
              (vote) => vote.option_id === option.id
            ).length;

            return {
              id: option.id,
              optionText: option.option_text,
              sortOrder: option.sort_order,
              votes: count,
            };
          }
        );

      const uniqueMembers = new Set(
        pollVotes.map((vote) => vote.member_id)
      );

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        startsAt: poll.starts_at,
        endsAt: poll.ends_at,
        allowMultiple: poll.allow_multiple,
        status: poll.status,
        createdBy: poll.created_by,
        createdAt: poll.created_at,
        updatedAt: poll.updated_at,
        totalVotes: pollVotes.length,
        totalVoters: uniqueMembers.size,
        options,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ADMIN POLLS GET ERROR]", error);

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { admin, user } = await requireStaff(request);

    const body = (await request.json()) as PollInput;

    const title = String(body.title || "").trim();
    const description =
      body.description == null
        ? null
        : String(body.description).trim();

    const options = cleanOptions(body.options ?? []);

    if (!title) {
      return NextResponse.json(
        { error: "Tiêu đề bình chọn không được để trống." },
        { status: 400 }
      );
    }

    if (options.length < 2) {
      return NextResponse.json(
        { error: "Poll phải có ít nhất 2 lựa chọn." },
        { status: 400 }
      );
    }

    if (
      body.startsAt &&
      body.endsAt &&
      new Date(body.startsAt).getTime() >=
        new Date(body.endsAt).getTime()
    ) {
      return NextResponse.json(
        { error: "Thời gian kết thúc phải sau thời gian bắt đầu." },
        { status: 400 }
      );
    }

    const status = body.status ?? "draft";

    const { data: poll, error: pollError } = await admin
      .from("polls")
      .insert({
        title,
        description: description || null,
        starts_at: body.startsAt || null,
        ends_at: body.endsAt || null,
        allow_multiple: Boolean(body.allowMultiple),
        status,
        created_by: user.id,
      })
      .select(
        "id,title,description,starts_at,ends_at,allow_multiple,status,created_by,created_at,updated_at"
      )
      .single();

    if (pollError || !poll) {
      console.error("[ADMIN POLLS CREATE]", pollError);
      return NextResponse.json(
        { error: pollError?.message || "Không thể tạo poll." },
        { status: 500 }
      );
    }

    const optionRows = options.map((option, index) => ({
      poll_id: poll.id,
      option_text: option.optionText,
      sort_order: option.sortOrder ?? index,
    }));

    const { error: optionError } = await admin
      .from("poll_options")
      .insert(optionRows);

    if (optionError) {
      await admin
        .from("polls")
        .delete()
        .eq("id", poll.id);

      console.error("[ADMIN POLL OPTIONS CREATE]", optionError);

      return NextResponse.json(
        { error: optionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Tạo poll thành công.",
        pollId: poll.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ADMIN POLLS POST ERROR]", error);

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { admin } = await requireStaff(request);

    const body = (await request.json()) as PollInput & {
      id: string;
    };

    if (!body.id) {
      return NextResponse.json(
        { error: "Thiếu poll id." },
        { status: 400 }
      );
    }

    const title = String(body.title || "").trim();
    const options = cleanOptions(body.options ?? []);

    if (!title) {
      return NextResponse.json(
        { error: "Tiêu đề bình chọn không được để trống." },
        { status: 400 }
      );
    }

    if (options.length < 2) {
      return NextResponse.json(
        { error: "Poll phải có ít nhất 2 lựa chọn." },
        { status: 400 }
      );
    }

    if (
      body.startsAt &&
      body.endsAt &&
      new Date(body.startsAt).getTime() >=
        new Date(body.endsAt).getTime()
    ) {
      return NextResponse.json(
        { error: "Thời gian kết thúc phải sau thời gian bắt đầu." },
        { status: 400 }
      );
    }

    const { error: pollError } = await admin
      .from("polls")
      .update({
        title,
        description:
          body.description == null
            ? null
            : String(body.description).trim() || null,
        starts_at: body.startsAt || null,
        ends_at: body.endsAt || null,
        allow_multiple: Boolean(body.allowMultiple),
        status: body.status ?? "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id);

    if (pollError) {
      console.error("[ADMIN POLLS UPDATE]", pollError);

      return NextResponse.json(
        { error: pollError.message },
        { status: 500 }
      );
    }

    const { error: deleteOptionsError } = await admin
      .from("poll_options")
      .delete()
      .eq("poll_id", body.id);

    if (deleteOptionsError) {
      return NextResponse.json(
        { error: deleteOptionsError.message },
        { status: 500 }
      );
    }

    const optionRows = options.map((option, index) => ({
      poll_id: body.id,
      option_text: option.optionText,
      sort_order: option.sortOrder ?? index,
    }));

    const { error: insertOptionsError } = await admin
      .from("poll_options")
      .insert(optionRows);

    if (insertOptionsError) {
      return NextResponse.json(
        { error: insertOptionsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Cập nhật poll thành công.",
    });
  } catch (error) {
    console.error("[ADMIN POLLS PATCH ERROR]", error);

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { admin } = await requireStaff(request);

    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get("id");

    if (!pollId) {
      return NextResponse.json(
        { error: "Thiếu poll id." },
        { status: 400 }
      );
    }

    const { error: voteError } = await admin
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId);

    if (voteError) {
      return NextResponse.json(
        { error: voteError.message },
        { status: 500 }
      );
    }

    const { error: optionError } = await admin
      .from("poll_options")
      .delete()
      .eq("poll_id", pollId);

    if (optionError) {
      return NextResponse.json(
        { error: optionError.message },
        { status: 500 }
      );
    }

    const { error: pollError } = await admin
      .from("polls")
      .delete()
      .eq("id", pollId);

    if (pollError) {
      return NextResponse.json(
        { error: pollError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Xóa poll thành công.",
    });
  } catch (error) {
    console.error("[ADMIN POLLS DELETE ERROR]", error);

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}