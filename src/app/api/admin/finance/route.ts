import { NextResponse } from "next/server";

import {
  getAdminContext,
} from "@/lib/admin-auth";

type FinanceResource =
  | "transaction"
  | "fee";

type TransactionType =
  | "income"
  | "expense";

type FeeStatus =
  | "unpaid"
  | "paid"
  | "waived";

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      error: message,
    },
    { status }
  );
}

function parseResource(
  value: string | null
): FinanceResource | null {
  if (
    value === "transaction" ||
    value === "fee"
  ) {
    return value;
  }

  return null;
}

function isValidDateString(
  value: unknown
) {
  if (typeof value !== "string") {
    return false;
  }

  const date =
    new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
}

function isValidAmount(
  value: unknown
) {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  request: Request
) {
  const context =
    await getAdminContext(
      request
    );

  if (!context) {
    return jsonError(
      "Bạn không có quyền truy cập.",
      401
    );
  }

  const { supabase } =
    context;

  const { searchParams } =
    new URL(request.url);

  const view =
    searchParams.get(
      "view"
    ) || "overview";

  /*
   * =======================================================
   * OVERVIEW
   * =======================================================
   */

  if (view === "overview") {
    const [
      transactionsResult,
      feesResult,
    ] = await Promise.all([
      supabase
        .from("fund_transactions")
        .select(
          "id, transaction_type, category, title, description, amount, transaction_date, member_id, receipt_url, receipt_name, created_by, created_at, updated_at"
        )
        .order(
          "transaction_date",
          {
            ascending: false,
          }
        ),

      supabase
        .from("membership_fees")
        .select(
          "id, member_id, fee_month, amount, status, paid_at, paid_method, note, created_by, created_at, updated_at"
        )
        .order(
          "fee_month",
          {
            ascending: false,
          }
        ),
    ]);

    if (
      transactionsResult.error
    ) {
      console.error(
        "[FINANCE GET TRANSACTIONS]",
        transactionsResult.error
      );

      return jsonError(
        transactionsResult.error.message,
        500
      );
    }

    if (
      feesResult.error
    ) {
      console.error(
        "[FINANCE GET FEES]",
        feesResult.error
      );

      return jsonError(
        feesResult.error.message,
        500
      );
    }

    const transactions =
      transactionsResult.data ??
      [];

    const fees =
      feesResult.data ?? [];

    let totalIncome = 0;
    let totalExpense = 0;

    for (const item of transactions) {
      const amount =
        Number(item.amount) || 0;

      if (
        item.transaction_type ===
        "income"
      ) {
        totalIncome += amount;
      } else if (
        item.transaction_type ===
        "expense"
      ) {
        totalExpense += amount;
      }
    }

    let totalFees = 0;
    let paidFees = 0;
    let unpaidFees = 0;
    let waivedFees = 0;

    for (const item of fees) {
      const amount =
        Number(item.amount) || 0;

      if (
        item.status === "waived"
      ) {
        waivedFees += amount;
        continue;
      }

      totalFees += amount;

      if (
        item.status === "paid"
      ) {
        paidFees += amount;
      }

      if (
        item.status === "unpaid"
      ) {
        unpaidFees += amount;
      }
    }

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpense,
        balance:
          totalIncome -
          totalExpense,

        totalFees,
        paidFees,
        unpaidFees,
        waivedFees,

        transactionCount:
          transactions.length,

        feeCount:
          fees.length,
      },

      recentTransactions:
        transactions.slice(
          0,
          10
        ),

      recentFees:
        fees.slice(
          0,
          10
        ),
    });
  }

  /*
   * =======================================================
   * TRANSACTIONS
   * =======================================================
   */

  if (view === "transactions") {
    const limitRaw =
      Number(
        searchParams.get(
          "limit"
        ) || "100"
      );

    const limit =
      Number.isInteger(
        limitRaw
      )
        ? Math.min(
            Math.max(
              limitRaw,
              1
            ),
            500
          )
        : 100;

    const {
      data,
      error,
    } = await supabase
      .from(
        "fund_transactions"
      )
      .select(
        "id, transaction_type, category, title, description, amount, transaction_date, member_id, receipt_url, receipt_name, created_by, created_at, updated_at"
      )
      .order(
        "transaction_date",
        {
          ascending: false,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(limit);

    if (error) {
      console.error(
        "[FINANCE TRANSACTIONS]",
        error
      );

      return jsonError(
        error.message,
        500
      );
    }

    return NextResponse.json({
      data: data ?? [],
    });
  }

  /*
   * =======================================================
   * FEES
   * =======================================================
   */

  if (view === "fees") {
    const limitRaw =
      Number(
        searchParams.get(
          "limit"
        ) || "500"
      );

    const limit =
      Number.isInteger(
        limitRaw
      )
        ? Math.min(
            Math.max(
              limitRaw,
              1
            ),
            1000
          )
        : 500;

    const {
      data,
      error,
    } = await supabase
      .from(
        "membership_fees"
      )
      .select(
        "id, member_id, fee_month, amount, status, paid_at, paid_method, note, created_by, created_at, updated_at"
      )
      .order(
        "fee_month",
        {
          ascending: false,
        }
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(limit);

    if (error) {
      console.error(
        "[FINANCE FEES]",
        error
      );

      return jsonError(
        error.message,
        500
      );
    }

    return NextResponse.json({
      data: data ?? [],
    });
  }

  return jsonError(
    "view không hợp lệ."
  );
}

/* =========================================================
   POST
   ========================================================= */

export async function POST(
  request: Request
) {
  const context =
    await getAdminContext(
      request
    );

  if (!context) {
    return jsonError(
      "Bạn không có quyền truy cập.",
      401
    );
  }

  let body: Record<
    string,
    unknown
  >;

  try {
    body =
      (await request.json()) as Record<
        string,
        unknown
      >;
  } catch {
    return jsonError(
      "Dữ liệu gửi lên không hợp lệ."
    );
  }

  const resource =
    parseResource(
      typeof body.resource ===
        "string"
        ? body.resource
        : null
    );

  if (!resource) {
    return jsonError(
      "resource phải là transaction hoặc fee."
    );
  }

  const { supabase, user } =
    context;

  /*
   * =======================================================
   * CREATE TRANSACTION
   * =======================================================
   */

  if (
    resource ===
    "transaction"
  ) {
    const transactionType =
      body.transaction_type;

    const category =
      body.category;

    const title =
      body.title;

    const description =
      body.description;

    const amount =
      body.amount;

    const transactionDate =
      body.transaction_date;

    const memberId =
      body.member_id;

    const receiptUrl =
      body.receipt_url;

    const receiptName =
      body.receipt_name;

    if (
      transactionType !==
        "income" &&
      transactionType !==
        "expense"
    ) {
      return jsonError(
        "transaction_type không hợp lệ."
      );
    }

    if (
      typeof category !==
        "string" ||
      !category.trim()
    ) {
      return jsonError(
        "Vui lòng nhập category."
      );
    }

    if (
      typeof title !==
        "string" ||
      !title.trim()
    ) {
      return jsonError(
        "Vui lòng nhập tiêu đề khoản thu/chi."
      );
    }

    if (
      !isValidAmount(amount)
    ) {
      return jsonError(
        "amount phải là số nguyên dương."
      );
    }

    if (
      transactionDate !==
        undefined &&
      !isValidDateString(
        transactionDate
      )
    ) {
      return jsonError(
        "transaction_date không hợp lệ."
      );
    }

    if (
      memberId !==
        undefined &&
      memberId !== null &&
      !Number.isSafeInteger(
        Number(memberId)
      )
    ) {
      return jsonError(
        "member_id không hợp lệ."
      );
    }

    const payload = {
      transaction_type:
        transactionType as TransactionType,

      category:
        category.trim(),

      title:
        title.trim(),

      description:
        typeof description ===
        "string"
          ? description.trim() ||
            null
          : null,

      amount,

      transaction_date:
        typeof transactionDate ===
        "string"
          ? transactionDate
          : new Date()
              .toISOString()
              .slice(0, 10),

      member_id:
        memberId ===
          undefined ||
        memberId === null
          ? null
          : Number(memberId),

      receipt_url:
        typeof receiptUrl ===
        "string"
          ? receiptUrl.trim() ||
            null
          : null,

      receipt_name:
        typeof receiptName ===
        "string"
          ? receiptName.trim() ||
            null
          : null,

      created_by:
        user.id,
    };

    const {
      data,
      error,
    } = await supabase
      .from(
        "fund_transactions"
      )
      .insert(
        payload
      )
      .select()
      .single();

    if (error) {
      console.error(
        "[FINANCE CREATE TRANSACTION]",
        error
      );

      return jsonError(
        error.message,
        500
      );
    }

    return NextResponse.json(
      {
        data,
      },
      { status: 201 }
    );
  }

  /*
   * =======================================================
   * CREATE MEMBERSHIP FEE
   * =======================================================
   */

  const memberId =
    Number(
      body.member_id
    );

  const feeMonth =
    body.fee_month;

  const amount =
    body.amount;

  const status =
    body.status;

  const paidMethod =
    body.paid_method;

  const note =
    body.note;

  if (
    !Number.isSafeInteger(
      memberId
    ) ||
    memberId <= 0
  ) {
    return jsonError(
      "member_id không hợp lệ."
    );
  }

  if (
    typeof feeMonth !==
      "string" ||
    !isValidDateString(
      feeMonth
    )
  ) {
    return jsonError(
      "fee_month không hợp lệ."
    );
  }

  if (
    !isValidAmount(amount) &&
    Number(amount) !== 0
  ) {
    return jsonError(
      "amount phải là số nguyên không âm."
    );
  }

  const normalizedStatus: FeeStatus =
    status === "paid" ||
    status === "waived" ||
    status === "unpaid"
      ? status
      : "unpaid";

  const payload = {
    member_id:
      memberId,

    fee_month:
      feeMonth,

    amount:
      Number(amount),

    status:
      normalizedStatus,

    paid_at:
      normalizedStatus ===
      "paid"
        ? new Date().toISOString()
        : null,

    paid_method:
      typeof paidMethod ===
      "string"
        ? paidMethod.trim() ||
          null
        : null,

    note:
      typeof note ===
      "string"
        ? note.trim() ||
          null
        : null,

    created_by:
      user.id,
  };

  const {
    data,
    error,
  } = await supabase
    .from(
      "membership_fees"
    )
    .insert(
      payload
    )
    .select()
    .single();

  if (error) {
    console.error(
      "[FINANCE CREATE FEE]",
      error
    );

    return jsonError(
      error.message,
      500
    );
  }

  return NextResponse.json(
    {
      data,
    },
    { status: 201 }
  );
}

/* =========================================================
   PATCH
   ========================================================= */

export async function PATCH(
  request: Request
) {
  const context =
    await getAdminContext(
      request
    );

  if (!context) {
    return jsonError(
      "Bạn không có quyền truy cập.",
      401
    );
  }

  let body: Record<
    string,
    unknown
  >;

  try {
    body =
      (await request.json()) as Record<
        string,
        unknown
      >;
  } catch {
    return jsonError(
      "Dữ liệu gửi lên không hợp lệ."
    );
  }

  const resource =
    parseResource(
      typeof body.resource ===
        "string"
        ? body.resource
        : null
    );

  if (!resource) {
    return jsonError(
      "resource không hợp lệ."
    );
  }

  const id =
    typeof body.id ===
    "string"
      ? body.id.trim()
      : "";

  if (!id) {
    return jsonError(
      "Thiếu id."
    );
  }

  const { supabase } =
    context;

  /*
   * =======================================================
   * UPDATE TRANSACTION
   * =======================================================
   */

  if (
    resource ===
    "transaction"
  ) {
    const updateData: Record<
      string,
      unknown
    > = {};

    if (
      body.transaction_type !==
      undefined
    ) {
      if (
        body.transaction_type !==
          "income" &&
        body.transaction_type !==
          "expense"
      ) {
        return jsonError(
          "transaction_type không hợp lệ."
        );
      }

      updateData.transaction_type =
        body.transaction_type;
    }

    if (
      body.category !==
      undefined
    ) {
      if (
        typeof body.category !==
          "string" ||
        !body.category.trim()
      ) {
        return jsonError(
          "category không hợp lệ."
        );
      }

      updateData.category =
        body.category.trim();
    }

    if (
      body.title !==
      undefined
    ) {
      if (
        typeof body.title !==
          "string" ||
        !body.title.trim()
      ) {
        return jsonError(
          "title không hợp lệ."
        );
      }

      updateData.title =
        body.title.trim();
    }

    if (
      body.description !==
      undefined
    ) {
      updateData.description =
        typeof body.description ===
        "string"
          ? body.description.trim() ||
            null
          : null;
    }

    if (
      body.amount !==
      undefined
    ) {
      if (
        !isValidAmount(
          body.amount
        )
      ) {
        return jsonError(
          "amount phải là số nguyên dương."
        );
      }

      updateData.amount =
        body.amount;
    }

    if (
      body.transaction_date !==
      undefined
    ) {
      if (
        !isValidDateString(
          body.transaction_date
        )
      ) {
        return jsonError(
          "transaction_date không hợp lệ."
        );
      }

      updateData.transaction_date =
        body.transaction_date;
    }

    if (
      body.member_id !==
      undefined
    ) {
      if (
        body.member_id !== null &&
        !Number.isSafeInteger(
          Number(
            body.member_id
          )
        )
      ) {
        return jsonError(
          "member_id không hợp lệ."
        );
      }

      updateData.member_id =
        body.member_id === null
          ? null
          : Number(
              body.member_id
            );
    }

    if (
      body.receipt_url !==
      undefined
    ) {
      updateData.receipt_url =
        typeof body.receipt_url ===
        "string"
          ? body.receipt_url.trim() ||
            null
          : null;
    }

    if (
      body.receipt_name !==
      undefined
    ) {
      updateData.receipt_name =
        typeof body.receipt_name ===
        "string"
          ? body.receipt_name.trim() ||
            null
          : null;
    }

    if (
      Object.keys(
        updateData
      ).length === 0
    ) {
      return jsonError(
        "Không có dữ liệu để cập nhật."
      );
    }

    updateData.updated_at =
      new Date().toISOString();

    const {
      data,
      error,
    } = await supabase
      .from(
        "fund_transactions"
      )
      .update(
        updateData
      )
      .eq(
        "id",
        id
      )
      .select()
      .single();

    if (error) {
      console.error(
        "[FINANCE UPDATE TRANSACTION]",
        error
      );

      return jsonError(
        error.message,
        500
      );
    }

    return NextResponse.json({
      data,
    });
  }

  /*
   * =======================================================
   * UPDATE FEE
   * =======================================================
   */

  const updateData: Record<
    string,
    unknown
  > = {};

  if (
    body.member_id !==
    undefined
  ) {
    const memberId =
      Number(
        body.member_id
      );

    if (
      !Number.isSafeInteger(
        memberId
      ) ||
      memberId <= 0
    ) {
      return jsonError(
        "member_id không hợp lệ."
      );
    }

    updateData.member_id =
      memberId;
  }

  if (
    body.fee_month !==
    undefined
  ) {
    if (
      !isValidDateString(
        body.fee_month
      )
    ) {
      return jsonError(
        "fee_month không hợp lệ."
      );
    }

    updateData.fee_month =
      body.fee_month;
  }

  if (
    body.amount !==
    undefined
  ) {
    const amount =
      Number(
        body.amount
      );

    if (
      !Number.isSafeInteger(
        amount
      ) ||
      amount < 0
    ) {
      return jsonError(
        "amount phải là số nguyên không âm."
      );
    }

    updateData.amount =
      amount;
  }

  if (
    body.status !==
    undefined
  ) {
    if (
      body.status !==
        "unpaid" &&
      body.status !==
        "paid" &&
      body.status !==
        "waived"
    ) {
      return jsonError(
        "status không hợp lệ."
      );
    }

    updateData.status =
      body.status;

    updateData.paid_at =
      body.status ===
      "paid"
        ? new Date().toISOString()
        : null;
  }

  if (
    body.paid_method !==
    undefined
  ) {
    updateData.paid_method =
      typeof body.paid_method ===
      "string"
        ? body.paid_method.trim() ||
          null
        : null;
  }

  if (
    body.note !==
    undefined
  ) {
    updateData.note =
      typeof body.note ===
      "string"
        ? body.note.trim() ||
          null
        : null;
  }

  if (
    Object.keys(
      updateData
    ).length === 0
  ) {
    return jsonError(
      "Không có dữ liệu để cập nhật."
    );
  }

  updateData.updated_at =
    new Date().toISOString();

  const {
    data,
    error,
  } = await supabase
    .from(
      "membership_fees"
    )
    .update(
      updateData
    )
    .eq(
      "id",
      id
    )
    .select()
    .single();

  if (error) {
    console.error(
      "[FINANCE UPDATE FEE]",
      error
    );

    return jsonError(
      error.message,
      500
    );
  }

  return NextResponse.json({
    data,
  });
}

/* =========================================================
   DELETE
   ========================================================= */

export async function DELETE(
  request: Request
) {
  const context =
    await getAdminContext(
      request
    );

  if (!context) {
    return jsonError(
      "Bạn không có quyền truy cập.",
      401
    );
  }

  const { searchParams } =
    new URL(request.url);

  const resource =
    parseResource(
      searchParams.get(
        "resource"
      )
    );

  const id =
    searchParams.get(
      "id"
    );

  if (!resource) {
    return jsonError(
      "resource không hợp lệ."
    );
  }

  if (!id) {
    return jsonError(
      "Thiếu id."
    );
  }

  const table =
    resource ===
    "transaction"
      ? "fund_transactions"
      : "membership_fees";

  const {
    error,
  } = await context
    .supabase
    .from(table)
    .delete()
    .eq(
      "id",
      id
    );

  if (error) {
    console.error(
      "[FINANCE DELETE]",
      error
    );

    return jsonError(
      error.message,
      500
    );
  }

  return NextResponse.json({
    success: true,
  });
}