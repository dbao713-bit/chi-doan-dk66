import { NextResponse } from "next/server";
import {
  createAdminClient,
  requireUser,
} from "@/lib/server-auth";

type PollOption = {
  id: string;
  option_text: string;
  sort_order: number;
};

type Poll = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  allow_multiple: boolean;
  status: "draft" | "published" | "closed";
  created_at: string;
  poll_options: PollOption[];
};

type PollVote = {
  poll_id: string;
  option_id: string;
};

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const admin = createAdminClient();

    const { data: account, error: accountError } = await admin
      .from("member_accounts")
      .select("member_id,auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        {
          error: "Không tìm thấy tài khoản đoàn viên.",
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    const { data: pollData, error: pollError } = await admin
      .from("polls")
      .select(`
        id,
        title,
        description,
        starts_at,
        ends_at,
        allow_multiple,
        status,
        created_at,
        poll_options (
          id,
          option_text,
          sort_order
        )
      `)
      .eq("status", "published")
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("created_at", { ascending: false });

    if (pollError) {
      console.error("[MEMBER POLLS GET]", pollError);

      return NextResponse.json(
        { error: pollError.message },
        { status: 500 }
      );
    }

    const polls = (pollData ?? []) as Poll[];

    if (polls.length === 0) {
      return NextResponse.json([]);
    }

    const pollIds = polls.map((poll: Poll) => poll.id);

    const { data: myVoteData, error: myVoteError } =
      await admin
        .from("poll_votes")
        .select("poll_id,option_id")
        .eq("member_id", account.member_id)
        .in("poll_id", pollIds);

    if (myVoteError) {
      console.error(
        "[MEMBER POLLS MY VOTES]",
        myVoteError
      );

      return NextResponse.json(
        { error: myVoteError.message },
        { status: 500 }
      );
    }

    const myVotes = (myVoteData ?? []) as PollVote[];

    const { data: allVoteData, error: allVoteError } =
      await admin
        .from("poll_votes")
        .select("poll_id,option_id")
        .in("poll_id", pollIds);

    if (allVoteError) {
      console.error(
        "[MEMBER POLLS ALL VOTES]",
        allVoteError
      );

      return NextResponse.json(
        { error: allVoteError.message },
        { status: 500 }
      );
    }

    const allVotes = (allVoteData ?? []) as PollVote[];

    const result = polls.map((poll: Poll) => {
      const votes = allVotes.filter(
        (vote: PollVote) => vote.poll_id === poll.id
      );

      const myPollVotes = myVotes.filter(
        (vote: PollVote) => vote.poll_id === poll.id
      );

      const sortedOptions = [...poll.poll_options].sort(
        (a: PollOption, b: PollOption) =>
          a.sort_order - b.sort_order
      );

      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        startsAt: poll.starts_at,
        endsAt: poll.ends_at,
        allowMultiple: poll.allow_multiple,
        status: poll.status,
        createdAt: poll.created_at,

        votedOptionIds: myPollVotes.map(
          (vote: PollVote) => vote.option_id
        ),

        totalVotes: votes.length,

        options: sortedOptions.map(
          (option: PollOption) => ({
            id: option.id,
            optionText: option.option_text,
            sortOrder: option.sort_order,
            votes: votes.filter(
              (vote: PollVote) =>
                vote.option_id === option.id
            ).length,
          })
        ),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[MEMBER POLLS GET ERROR]", error);

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const admin = createAdminClient();

    const body = await request.json();

    const pollId = String(body.pollId || "");

    const optionIds: string[] = Array.isArray(body.optionIds)
  ? body.optionIds.map((id: unknown) => String(id))
  : [];

    if (!pollId || optionIds.length === 0) {
      return NextResponse.json(
        {
          error: "Thiếu poll hoặc lựa chọn.",
        },
        { status: 400 }
      );
    }

    const uniqueOptionIds: string[] = [...new Set(optionIds)];

    const { data: account, error: accountError } =
      await admin
        .from("member_accounts")
        .select("member_id,auth_user_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (accountError || !account) {
      return NextResponse.json(
        {
          error: "Không tìm thấy tài khoản đoàn viên.",
        },
        { status: 403 }
      );
    }

    const { data: pollData, error: pollError } =
      await admin
        .from("polls")
        .select(`
          id,
          allow_multiple,
          status,
          starts_at,
          ends_at,
          poll_options (
            id
          )
        `)
        .eq("id", pollId)
        .maybeSingle();

    if (pollError || !pollData) {
      return NextResponse.json(
        {
          error: "Không tìm thấy cuộc bình chọn.",
        },
        { status: 404 }
      );
    }

    const poll = pollData as {
      id: string;
      allow_multiple: boolean;
      status: "draft" | "published" | "closed";
      starts_at: string | null;
      ends_at: string | null;
      poll_options: {
        id: string;
      }[];
    };

    if (poll.status !== "published") {
      return NextResponse.json(
        {
          error: "Cuộc bình chọn hiện không mở.",
        },
        { status: 400 }
      );
    }

    const now = Date.now();

    if (
      poll.starts_at &&
      new Date(poll.starts_at).getTime() > now
    ) {
      return NextResponse.json(
        {
          error: "Cuộc bình chọn chưa bắt đầu.",
        },
        { status: 400 }
      );
    }

    if (
      poll.ends_at &&
      new Date(poll.ends_at).getTime() < now
    ) {
      return NextResponse.json(
        {
          error: "Cuộc bình chọn đã kết thúc.",
        },
        { status: 400 }
      );
    }

    if (
      !poll.allow_multiple &&
      uniqueOptionIds.length > 1
    ) {
      return NextResponse.json(
        {
          error:
            "Cuộc bình chọn này chỉ cho phép chọn một đáp án.",
        },
        { status: 400 }
      );
    }

    const validOptionIds = new Set(
      poll.poll_options.map(
        (option: { id: string }) => option.id
      )
    );

    for (const optionId of uniqueOptionIds) {
      if (!validOptionIds.has(optionId)) {
        return NextResponse.json(
          {
            error:
              "Lựa chọn không thuộc cuộc bình chọn.",
          },
          { status: 400 }
        );
      }
    }

    const {
      data: existingVoteData,
      error: existingError,
    } = await admin
      .from("poll_votes")
      .select("id,option_id")
      .eq("poll_id", pollId)
      .eq("member_id", account.member_id);

    if (existingError) {
      return NextResponse.json(
        {
          error: existingError.message,
        },
        { status: 500 }
      );
    }

    if (
      existingVoteData &&
      existingVoteData.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Bạn đã bình chọn cho cuộc khảo sát này.",
        },
        { status: 409 }
      );
    }

    const rows = uniqueOptionIds.map((optionId) => ({
  poll_id: pollId,
  option_id: optionId,
  member_id: account.member_id,
}));

    const { error: insertError } = await admin
      .from("poll_votes")
      .insert(rows);

    if (insertError) {
      console.error(
        "[MEMBER POLL VOTE]",
        insertError
      );

      return NextResponse.json(
        {
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Bình chọn thành công.",
      pollId,
      optionIds: uniqueOptionIds,
    });
  } catch (error) {
    console.error(
      "[MEMBER POLL POST ERROR]",
      error
    );

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}