"use client";

import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowUpRight,
  ArrowUpFromLine,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type {
  FormEvent,
  ReactNode,
} from "react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";

type FinanceTab =
  | "overview"
  | "transactions"
  | "fees";

type TransactionType =
  | "income"
  | "expense";

type FeeStatus =
  | "unpaid"
  | "paid"
  | "waived";

type Transaction = {
  id: string;
  transaction_type: TransactionType;
  category: string;
  title: string;
  description: string | null;
  amount: number;
  transaction_date: string;
  member_id: number | null;
  receipt_url: string | null;
  receipt_name: string | null;
  created_at: string;
};

type MembershipFee = {
  id: string;
  member_id: number;
  fee_month: string;
  amount: number;
  status: FeeStatus;
  paid_at: string | null;
  paid_method: string | null;
  note: string | null;
  created_at: string;
};

type Member = {
  id: number;
  student_id: string;
  full_name: string;
  class_name: string;
};

type Summary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalFees: number;
  paidFees: number;
  unpaidFees: number;
  waivedFees: number;
  transactionCount: number;
  feeCount: number;
};

const emptySummary: Summary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  totalFees: 0,
  paidFees: 0,
  unpaidFees: 0,
  waivedFees: 0,
  transactionCount: 0,
  feeCount: 0,
};

function formatMoney(value: number) {
  return (
    new Intl.NumberFormat("vi-VN").format(
      Math.round(value)
    ) + " ₫"
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatMonth(value: string) {
  const date = new Date(value);

  return `Tháng ${
    date.getMonth() + 1
  }/${date.getFullYear()}`;
}

function getMemberName(
  members: Member[],
  memberId: number | null
) {
  if (!memberId) {
    return "Quỹ Chi đoàn";
  }

  return (
    members.find(
      (member) => member.id === memberId
    )?.full_name ||
    `Đoàn viên #${memberId}`
  );
}

function getMemberInfo(
  members: Member[],
  memberId: number
) {
  return members.find(
    (member) => member.id === memberId
  );
}

export default function FinancePage() {
  const [tab, setTab] =
    useState<FinanceTab>("overview");

  const [summary, setSummary] =
    useState<Summary>(emptySummary);

  const [
    transactions,
    setTransactions,
  ] = useState<Transaction[]>([]);

  const [fees, setFees] =
    useState<MembershipFee[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [modal, setModal] =
    useState<
      "transaction" | "fee" | null
    >(null);

  const [
    editingTransactionId,
    setEditingTransactionId,
  ] = useState<string | null>(null);

  const [
    editingFeeId,
    setEditingFeeId,
  ] = useState<string | null>(null);

  const [
    transactionType,
    setTransactionType,
  ] = useState<TransactionType>(
    "income"
  );

  const [
    transactionCategory,
    setTransactionCategory,
  ] = useState("");

  const [
    transactionTitle,
    setTransactionTitle,
  ] = useState("");

  const [
    transactionDescription,
    setTransactionDescription,
  ] = useState("");

  const [
    transactionAmount,
    setTransactionAmount,
  ] = useState("");

  const [
    transactionDate,
    setTransactionDate,
  ] = useState(
    new Date()
      .toISOString()
      .slice(0, 10)
  );

  const [
    transactionMemberId,
    setTransactionMemberId,
  ] = useState("");

  const [
    feeMemberId,
    setFeeMemberId,
  ] = useState("");

  const [
    feeMonth,
    setFeeMonth,
  ] = useState(
    new Date()
      .toISOString()
      .slice(0, 7) + "-01"
  );

  const [
    feeAmount,
    setFeeAmount,
  ] = useState("");

  const [
    feeStatus,
    setFeeStatus,
  ] = useState<FeeStatus>("unpaid");

  const [
    feeMethod,
    setFeeMethod,
  ] = useState("");

  const [
    feeNote,
    setFeeNote,
  ] = useState("");

  useEffect(() => {
    void loadAll();
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
    } =
      await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadMembers() {
    const { data, error } =
      await supabase
        .from("members")
        .select(
          "id, student_id, full_name, class_name"
        )
        .order("full_name");

    if (error) {
      throw new Error(error.message);
    }

    setMembers(data ?? []);
  }

  async function fetchFinanceData(
    view: string,
    limit: number
  ) {
    const token =
      await getAccessToken();

    if (!token) {
      throw new Error(
        "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
      );
    }

    const response = await fetch(
      `/api/admin/finance?view=${view}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const data =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Không thể tải dữ liệu tài chính."
      );
    }

    return data;
  }

  async function loadFinance() {
    const [
      overview,
      transactionData,
      feeData,
    ] = await Promise.all([
      fetchFinanceData(
        "overview",
        500
      ),
      fetchFinanceData(
        "transactions",
        500
      ),
      fetchFinanceData(
        "fees",
        1000
      ),
    ]);

    setSummary(
      overview.summary ||
        emptySummary
    );

    setTransactions(
      transactionData.data || []
    );

    setFees(
      feeData.data || []
    );
  }

  async function loadAll(
    showRefresh = false
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      await Promise.all([
        loadMembers(),
        loadFinance(),
      ]);
    } catch (error) {
      console.error(
        "[FINANCE LOAD]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tải dữ liệu tài chính."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function resetTransactionForm() {
    setEditingTransactionId(null);
    setTransactionType("income");
    setTransactionCategory("");
    setTransactionTitle("");
    setTransactionDescription("");
    setTransactionAmount("");
    setTransactionDate(
      new Date()
        .toISOString()
        .slice(0, 10)
    );
    setTransactionMemberId("");
  }

  function resetFeeForm() {
    setEditingFeeId(null);
    setFeeMemberId("");
    setFeeMonth(
      new Date()
        .toISOString()
        .slice(0, 7) + "-01"
    );
    setFeeAmount("");
    setFeeStatus("unpaid");
    setFeeMethod("");
    setFeeNote("");
  }

  function openTransactionModal(
    item?: Transaction
  ) {
    if (item) {
      setEditingTransactionId(
        item.id
      );

      setTransactionType(
        item.transaction_type
      );

      setTransactionCategory(
        item.category
      );

      setTransactionTitle(
        item.title
      );

      setTransactionDescription(
        item.description || ""
      );

      setTransactionAmount(
        String(item.amount)
      );

      setTransactionDate(
        item.transaction_date
      );

      setTransactionMemberId(
        item.member_id
          ? String(item.member_id)
          : ""
      );
    } else {
      resetTransactionForm();
    }

    setModal("transaction");
  }

  function openFeeModal(
    item?: MembershipFee
  ) {
    if (item) {
      setEditingFeeId(item.id);

      setFeeMemberId(
        String(item.member_id)
      );

      setFeeMonth(
        item.fee_month.slice(
          0,
          10
        )
      );

      setFeeAmount(
        String(item.amount)
      );

      setFeeStatus(item.status);

      setFeeMethod(
        item.paid_method ||
          ""
      );

      setFeeNote(item.note || "");
    } else {
      resetFeeForm();
    }

    setModal("fee");
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModal(null);
    resetTransactionForm();
    resetFeeForm();
  }

  async function saveTransaction(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !transactionTitle.trim() ||
      !transactionCategory.trim() ||
      !transactionAmount
    ) {
      toast.error(
        "Vui lòng nhập đầy đủ thông tin khoản thu/chi."
      );
      return;
    }

    const amount =
      Number(transactionAmount);

    if (
      !Number.isSafeInteger(
        amount
      ) ||
      amount <= 0
    ) {
      toast.error(
        "Số tiền phải là số nguyên dương."
      );
      return;
    }

    try {
      setSaving(true);

      const token =
        await getAccessToken();

      if (!token) {
        throw new Error(
          "Phiên đăng nhập đã hết."
        );
      }

      const isEdit =
        Boolean(
          editingTransactionId
        );

      const response =
        await fetch(
          "/api/admin/finance",
          {
            method: isEdit
              ? "PATCH"
              : "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(
              isEdit
                ? {
                    resource:
                      "transaction",
                    id:
                      editingTransactionId,
                    transaction_type:
                      transactionType,
                    category:
                      transactionCategory,
                    title:
                      transactionTitle,
                    description:
                      transactionDescription,
                    amount,
                    transaction_date:
                      transactionDate,
                    member_id:
                      transactionMemberId
                        ? Number(
                            transactionMemberId
                          )
                        : null,
                  }
                : {
                    resource:
                      "transaction",
                    transaction_type:
                      transactionType,
                    category:
                      transactionCategory,
                    title:
                      transactionTitle,
                    description:
                      transactionDescription,
                    amount,
                    transaction_date:
                      transactionDate,
                    member_id:
                      transactionMemberId
                        ? Number(
                            transactionMemberId
                          )
                        : null,
                  }
            ),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể lưu khoản thu/chi."
        );
      }

      toast.success(
        isEdit
          ? "Đã cập nhật khoản thu/chi."
          : "Đã thêm khoản thu/chi."
      );

      closeModal();
      await loadAll(true);
    } catch (error) {
      console.error(
        "[FINANCE SAVE TRANSACTION]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể lưu khoản thu/chi."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveFee(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !feeMemberId ||
      !feeMonth ||
      feeAmount === ""
    ) {
      toast.error(
        "Vui lòng nhập đủ thông tin đoàn phí."
      );
      return;
    }

    const amount =
      Number(feeAmount);

    if (
      !Number.isSafeInteger(
        amount
      ) ||
      amount < 0
    ) {
      toast.error(
        "Số tiền phải là số nguyên không âm."
      );
      return;
    }

    try {
      setSaving(true);

      const token =
        await getAccessToken();

      if (!token) {
        throw new Error(
          "Phiên đăng nhập đã hết."
        );
      }

      const isEdit =
        Boolean(editingFeeId);

      const response =
        await fetch(
          "/api/admin/finance",
          {
            method: isEdit
              ? "PATCH"
              : "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(
              isEdit
                ? {
                    resource: "fee",
                    id: editingFeeId,
                    member_id:
                      Number(
                        feeMemberId
                      ),
                    fee_month:
                      feeMonth,
                    amount,
                    status:
                      feeStatus,
                    paid_method:
                      feeMethod,
                    note: feeNote,
                  }
                : {
                    resource: "fee",
                    member_id:
                      Number(
                        feeMemberId
                      ),
                    fee_month:
                      feeMonth,
                    amount,
                    status:
                      feeStatus,
                    paid_method:
                      feeMethod,
                    note: feeNote,
                  }
            ),
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể lưu đoàn phí."
        );
      }

      toast.success(
        isEdit
          ? "Đã cập nhật đoàn phí."
          : "Đã thêm đoàn phí."
      );

      closeModal();
      await loadAll(true);
    } catch (error) {
      console.error(
        "[FINANCE SAVE FEE]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể lưu đoàn phí."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(
    resource:
      | "transaction"
      | "fee",
    id: string
  ) {
    const confirmed =
      window.confirm(
        resource === "transaction"
          ? "Bạn có chắc muốn xóa khoản thu/chi này?"
          : "Bạn có chắc muốn xóa bản ghi đoàn phí này?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const token =
        await getAccessToken();

      if (!token) {
        throw new Error(
          "Phiên đăng nhập đã hết."
        );
      }

      const response =
        await fetch(
          `/api/admin/finance?resource=${resource}&id=${encodeURIComponent(
            id
          )}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể xóa dữ liệu."
        );
      }

      toast.success(
        "Đã xóa dữ liệu."
      );

      await loadAll(true);
    } catch (error) {
      console.error(
        "[FINANCE DELETE]",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xóa dữ liệu."
      );
    }
  }

  const filteredTransactions =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      if (!keyword) {
        return transactions;
      }

      return transactions.filter(
        (item) =>
          item.title
            .toLowerCase()
            .includes(keyword) ||
          item.category
            .toLowerCase()
            .includes(keyword) ||
          getMemberName(
            members,
            item.member_id
          )
            .toLowerCase()
            .includes(keyword)
      );
    }, [
      transactions,
      search,
      members,
    ]);

  const filteredFees =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      if (!keyword) {
        return fees;
      }

      return fees.filter(
        (item) => {
          const member =
            getMemberInfo(
              members,
              item.member_id
            );

          return (
            member?.full_name
              .toLowerCase()
              .includes(keyword) ||
            member?.student_id
              .toLowerCase()
              .includes(keyword) ||
            member?.class_name
              .toLowerCase()
              .includes(keyword)
          );
        }
      );
    }, [
      fees,
      search,
      members,
    ]);

  const feeTotal =
    summary.totalFees +
    summary.waivedFees;

  const feePaidRate =
    feeTotal > 0
      ? Math.round(
          (summary.paidFees /
            feeTotal) *
            100
        )
      : 0;

  const expenseRate =
    summary.totalIncome > 0
      ? Math.min(
          100,
          Math.round(
            (summary.totalExpense /
              summary.totalIncome) *
              100
          )
        )
      : 0;

  if (loading) {
    return (
      <section className="finance-page finance-loading-page">
        <div className="finance-container">
          <div className="finance-skeleton finance-skeleton-hero" />

          <div className="finance-skeleton-grid">
            {Array.from({
              length: 4,
            }).map((_, index) => (
              <div
                key={index}
                className="finance-skeleton finance-skeleton-card"
              />
            ))}
          </div>

          <div className="finance-skeleton finance-skeleton-main" />
        </div>
      </section>
    );
  }

  return (
    <section className="finance-page">
      <div className="finance-container">
        {/* =================================================
            PAGE INTRO
        ================================================= */}

        <section className="finance-intro">
          <div className="finance-intro-copy">
            <div className="finance-eyebrow">
              <span className="finance-eyebrow-icon">
                <CircleDollarSign
                  size={15}
                />
              </span>

              FINANCIAL HUB
            </div>

            <h1>
              Quỹ & đoàn phí
            </h1>

            <p>
              Trung tâm quản lý tài chính
              Chi đoàn — theo dõi dòng tiền,
              đoàn phí và số dư một cách
              rõ ràng, trực quan.
            </p>
          </div>

          <div className="finance-intro-actions">
            <button
              type="button"
              className="finance-button finance-button-primary"
              onClick={() =>
                openTransactionModal()
              }
            >
              <Plus size={17} />
              Thêm thu / chi
            </button>

            <button
              type="button"
              className="finance-button finance-button-secondary"
              onClick={() =>
                openFeeModal()
              }
            >
              <Receipt size={17} />
              Ghi đoàn phí
            </button>

            <button
              type="button"
              className="finance-refresh-button"
              onClick={() =>
                loadAll(true)
              }
              disabled={refreshing}
              aria-label="Làm mới"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "finance-spin"
                    : ""
                }
              />
            </button>
          </div>
        </section>

        {/* =================================================
            BALANCE HERO
        ================================================= */}

        <section className="finance-balance-card">
          <div className="finance-balance-main">
            <span>
              SỐ DƯ QUỸ HIỆN TẠI
            </span>

            <strong>
              {formatMoney(
                summary.balance
              )}
            </strong>

            <div className="finance-balance-meta">
              <span>
                <TrendingUp size={14} />
                Tổng thu{" "}
                {formatMoney(
                  summary.totalIncome
                )}
              </span>

              <span>
                <TrendingDown size={14} />
                Tổng chi{" "}
                {formatMoney(
                  summary.totalExpense
                )}
              </span>
            </div>
          </div>

          <div className="finance-balance-side">
            <div>
              <span>
                Tỷ lệ sử dụng quỹ
              </span>

              <strong>
                {expenseRate}%
              </strong>
            </div>

            <div className="finance-progress finance-progress-dark">
              <span
                style={{
                  width: `${expenseRate}%`,
                }}
              />
            </div>

            <small>
              Tổng chi so với tổng thu
            </small>
          </div>
        </section>

        {/* =================================================
            KPI
        ================================================= */}

        <section className="finance-kpi-grid">
          <FinanceKpi
            tone="green"
            icon={
              <ArrowUpFromLine
                size={20}
              />
            }
            label="Tổng thu"
            value={formatMoney(
              summary.totalIncome
            )}
            detail={`${summary.transactionCount} giao dịch`}
          />

          <FinanceKpi
            tone="red"
            icon={
              <ArrowDownToLine
                size={20}
              />
            }
            label="Tổng chi"
            value={formatMoney(
              summary.totalExpense
            )}
            detail="Các khoản chi đã ghi nhận"
          />

          <FinanceKpi
            tone="blue"
            icon={
              <Wallet size={20} />
            }
            label="Số dư quỹ"
            value={formatMoney(
              summary.balance
            )}
            detail="Tổng thu trừ tổng chi"
          />

          <FinanceKpi
            tone="amber"
            icon={
              <Receipt size={20} />
            }
            label="Đoàn phí chưa thu"
            value={formatMoney(
              summary.unpaidFees
            )}
            detail={`${feePaidRate}% đoàn phí đã thu`}
          />
        </section>

        {/* =================================================
            QUICK INSIGHTS
        ================================================= */}

        <section className="finance-insight-grid">
          <InsightCard
            tone="green"
            icon={
              <TrendingUp size={18} />
            }
            label="NGUỒN THU"
            title="Dòng tiền vào"
            value={formatMoney(
              summary.totalIncome
            )}
            description="Tổng giá trị các khoản thu được ghi nhận."
          />

          <InsightCard
            tone="red"
            icon={
              <TrendingDown size={18} />
            }
            label="CHI TIÊU"
            title="Mức sử dụng quỹ"
            value={`${expenseRate}%`}
            description="Tỷ lệ tổng chi so với tổng thu hiện tại."
          />

          <InsightCard
            tone="blue"
            icon={
              <Users size={18} />
            }
            label="ĐOÀN PHÍ"
            title="Tỷ lệ đã thu"
            value={`${feePaidRate}%`}
            description={`${formatMoney(
              summary.paidFees
            )} đã được ghi nhận.`}
          />
        </section>

        {/* =================================================
            WORKSPACE
        ================================================= */}

        <section className="finance-workspace">
          <div className="finance-workspace-header">
            <div>
              <span className="finance-section-label">
                FINANCIAL CONTROL
              </span>

              <h2>
                Trung tâm tài chính
              </h2>

              <p>
                Quản lý sổ quỹ và đoàn phí
                trong cùng một không gian.
              </p>
            </div>

            <div className="finance-tabs">
              <button
                type="button"
                className={
                  tab === "overview"
                    ? "finance-tab finance-tab-active"
                    : "finance-tab"
                }
                onClick={() =>
                  setTab("overview")
                }
              >
                Tổng quan
              </button>

              <button
                type="button"
                className={
                  tab ===
                  "transactions"
                    ? "finance-tab finance-tab-active"
                    : "finance-tab"
                }
                onClick={() =>
                  setTab(
                    "transactions"
                  )
                }
              >
                Sổ quỹ
              </button>

              <button
                type="button"
                className={
                  tab === "fees"
                    ? "finance-tab finance-tab-active"
                    : "finance-tab"
                }
                onClick={() =>
                  setTab("fees")
                }
              >
                Đoàn phí
              </button>
            </div>
          </div>

          {tab !== "overview" && (
            <div className="finance-toolbar">
              <div className="finance-toolbar-count">
                {tab ===
                "transactions"
                  ? `${filteredTransactions.length} giao dịch`
                  : `${filteredFees.length} bản ghi`}
              </div>

              <div className="finance-search">
                <Search size={17} />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    tab ===
                    "transactions"
                      ? "Tìm khoản thu, chi..."
                      : "Tìm đoàn viên..."
                  }
                />
              </div>
            </div>
          )}

          {tab === "overview" && (
            <div className="finance-overview-grid">
              <OverviewTransactions
                transactions={
                  transactions
                }
                members={members}
                onViewAll={() =>
                  setTab(
                    "transactions"
                  )
                }
              />

              <OverviewFees
                summary={summary}
                onViewAll={() =>
                  setTab("fees")
                }
              />
            </div>
          )}

          {tab === "transactions" && (
            <TransactionTable
              items={
                filteredTransactions
              }
              members={members}
              onEdit={
                openTransactionModal
              }
              onDelete={(id) =>
                deleteItem(
                  "transaction",
                  id
                )
              }
              onCreate={() =>
                openTransactionModal()
              }
            />
          )}

          {tab === "fees" && (
            <FeeTable
              items={filteredFees}
              members={members}
              onEdit={openFeeModal}
              onDelete={(id) =>
                deleteItem(
                  "fee",
                  id
                )
              }
              onCreate={() =>
                openFeeModal()
              }
            />
          )}
        </section>

        {/* STATUS */}

        <div className="finance-status-bar">
          <div className="finance-status-left">
            <span className="finance-status-icon">
              <Check size={15} />
            </span>

            <div>
              <strong>
                Hệ thống tài chính đang hoạt động
              </strong>

              <span>
                Dữ liệu được đồng bộ trực
                tiếp với Supabase.
              </span>
            </div>
          </div>

          <div className="finance-status-count">
            {summary.transactionCount} giao dịch
            {" · "}
            {summary.feeCount} bản ghi đoàn phí
          </div>
        </div>
      </div>

      {/* =================================================
          TRANSACTION MODAL
      ================================================= */}

      {modal === "transaction" && (
        <FinanceModal
          eyebrow={
            editingTransactionId
              ? "CẬP NHẬT SỔ QUỸ"
              : "GIAO DỊCH MỚI"
          }
          title={
            editingTransactionId
              ? "Chỉnh sửa khoản thu / chi"
              : "Thêm khoản thu / chi"
          }
          description="Nhập thông tin để giao dịch được ghi nhận đầy đủ trong sổ quỹ."
          onClose={closeModal}
          saving={saving}
        >
          <form
            className="finance-form"
            onSubmit={
              saveTransaction
            }
          >
            <div className="finance-form-grid">
              <FinanceField
                label="Loại giao dịch"
                required
              >
                <div className="finance-choice-grid">
                  <button
                    type="button"
                    className={
                      transactionType ===
                      "income"
                        ? "finance-choice finance-choice-income finance-choice-active"
                        : "finance-choice finance-choice-income"
                    }
                    onClick={() =>
                      setTransactionType(
                        "income"
                      )
                    }
                  >
                    <ArrowUpFromLine
                      size={17}
                    />
                    Khoản thu
                  </button>

                  <button
                    type="button"
                    className={
                      transactionType ===
                      "expense"
                        ? "finance-choice finance-choice-expense finance-choice-active"
                        : "finance-choice finance-choice-expense"
                    }
                    onClick={() =>
                      setTransactionType(
                        "expense"
                      )
                    }
                  >
                    <ArrowDownToLine
                      size={17}
                    />
                    Khoản chi
                  </button>
                </div>
              </FinanceField>

              <FinanceField
                label="Danh mục"
                required
              >
                <input
                  value={
                    transactionCategory
                  }
                  onChange={(event) =>
                    setTransactionCategory(
                      event.target
                        .value
                    )
                  }
                  className="finance-form-input"
                  placeholder="Ví dụ: Đoàn phí, vật tư..."
                />
              </FinanceField>
            </div>

            <FinanceField
              label="Tên khoản thu / chi"
              required
            >
              <input
                value={
                  transactionTitle
                }
                onChange={(event) =>
                  setTransactionTitle(
                    event.target
                      .value
                  )
                }
                className="finance-form-input"
                placeholder="Nhập nội dung giao dịch..."
              />
            </FinanceField>

            <div className="finance-form-grid">
              <FinanceField
                label="Số tiền"
                required
              >
                <div className="finance-money-input">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      transactionAmount
                    }
                    onChange={(event) =>
                      setTransactionAmount(
                        event.target
                          .value
                      )
                    }
                    className="finance-form-input"
                    placeholder="0"
                  />

                  <span>₫</span>
                </div>
              </FinanceField>

              <FinanceField
                label="Ngày giao dịch"
                required
              >
                <div className="finance-icon-input">
                  <CalendarDays
                    size={17}
                  />

                  <input
                    type="date"
                    value={
                      transactionDate
                    }
                    onChange={(event) =>
                      setTransactionDate(
                        event.target
                          .value
                      )
                    }
                    className="finance-form-input"
                  />
                </div>
              </FinanceField>
            </div>

            <FinanceField label="Đoàn viên liên quan">
              <select
                value={
                  transactionMemberId
                }
                onChange={(event) =>
                  setTransactionMemberId(
                    event.target
                      .value
                  )
                }
                className="finance-form-input"
              >
                <option value="">
                  Không gắn đoàn viên
                </option>

                {members.map(
                  (member) => (
                    <option
                      key={
                        member.id
                      }
                      value={
                        member.id
                      }
                    >
                      {member.full_name} ·{" "}
                      {
                        member.class_name
                      }
                    </option>
                  )
                )}
              </select>
            </FinanceField>

            <FinanceField label="Mô tả">
              <textarea
                value={
                  transactionDescription
                }
                onChange={(event) =>
                  setTransactionDescription(
                    event.target
                      .value
                  )
                }
                className="finance-form-input finance-textarea"
                placeholder="Ghi rõ lý do hoặc thông tin liên quan..."
              />
            </FinanceField>

            <ModalActions
              saving={saving}
              onCancel={closeModal}
              submitText={
                editingTransactionId
                  ? "Lưu thay đổi"
                  : "Thêm giao dịch"
              }
              icon={
                <Banknote size={17} />
              }
            />
          </form>
        </FinanceModal>
      )}

      {/* =================================================
          FEE MODAL
      ================================================= */}

      {modal === "fee" && (
        <FinanceModal
          eyebrow={
            editingFeeId
              ? "CẬP NHẬT ĐOÀN PHÍ"
              : "ĐOÀN PHÍ"
          }
          title={
            editingFeeId
              ? "Chỉnh sửa đoàn phí"
              : "Ghi nhận đoàn phí"
          }
          description="Theo dõi khoản đóng góp của từng đoàn viên theo từng kỳ thu."
          onClose={closeModal}
          saving={saving}
        >
          <form
            className="finance-form"
            onSubmit={saveFee}
          >
            <FinanceField
              label="Đoàn viên"
              required
            >
              <select
                value={feeMemberId}
                onChange={(event) =>
                  setFeeMemberId(
                    event.target
                      .value
                  )
                }
                className="finance-form-input"
              >
                <option value="">
                  Chọn đoàn viên
                </option>

                {members.map(
                  (member) => (
                    <option
                      key={
                        member.id
                      }
                      value={
                        member.id
                      }
                    >
                      {member.full_name} ·{" "}
                      {
                        member.class_name
                      }
                    </option>
                  )
                )}
              </select>
            </FinanceField>

            <div className="finance-form-grid">
              <FinanceField
                label="Tháng thu"
                required
              >
                <input
                  type="month"
                  value={feeMonth.slice(
                    0,
                    7
                  )}
                  onChange={(event) =>
                    setFeeMonth(
                      `${event.target.value}-01`
                    )
                  }
                  className="finance-form-input"
                />
              </FinanceField>

              <FinanceField
                label="Số tiền"
                required
              >
                <div className="finance-money-input">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={feeAmount}
                    onChange={(event) =>
                      setFeeAmount(
                        event.target
                          .value
                      )
                    }
                    className="finance-form-input"
                    placeholder="0"
                  />

                  <span>₫</span>
                </div>
              </FinanceField>
            </div>

            <FinanceField
              label="Trạng thái"
              required
            >
              <div className="finance-status-choice-grid">
                <button
                  type="button"
                  className={
                    feeStatus ===
                    "unpaid"
                      ? "finance-status-choice finance-status-choice-active finance-status-choice-amber"
                      : "finance-status-choice"
                  }
                  onClick={() =>
                    setFeeStatus(
                      "unpaid"
                    )
                  }
                >
                  Chưa thu
                </button>

                <button
                  type="button"
                  className={
                    feeStatus ===
                    "paid"
                      ? "finance-status-choice finance-status-choice-active finance-status-choice-green"
                      : "finance-status-choice"
                  }
                  onClick={() =>
                    setFeeStatus(
                      "paid"
                    )
                  }
                >
                  Đã thu
                </button>

                <button
                  type="button"
                  className={
                    feeStatus ===
                    "waived"
                      ? "finance-status-choice finance-status-choice-active finance-status-choice-slate"
                      : "finance-status-choice"
                  }
                  onClick={() =>
                    setFeeStatus(
                      "waived"
                    )
                  }
                >
                  Được miễn
                </button>
              </div>
            </FinanceField>

            <FinanceField label="Hình thức thanh toán">
              <input
                value={feeMethod}
                onChange={(event) =>
                  setFeeMethod(
                    event.target
                      .value
                  )
                }
                className="finance-form-input"
                placeholder="Tiền mặt, chuyển khoản..."
              />
            </FinanceField>

            <FinanceField label="Ghi chú">
              <textarea
                value={feeNote}
                onChange={(event) =>
                  setFeeNote(
                    event.target
                      .value
                  )
                }
                className="finance-form-input finance-textarea finance-textarea-small"
                placeholder="Ghi chú thêm..."
              />
            </FinanceField>

            <ModalActions
              saving={saving}
              onCancel={closeModal}
              submitText={
                editingFeeId
                  ? "Lưu thay đổi"
                  : "Lưu đoàn phí"
              }
              icon={
                <Receipt size={17} />
              }
            />
          </form>
        </FinanceModal>
      )}
    </section>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function FinanceKpi({
  tone,
  icon,
  label,
  value,
  detail,
}: {
  tone:
    | "green"
    | "red"
    | "blue"
    | "amber";
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article
      className={`finance-kpi finance-kpi-${tone}`}
    >
      <div className="finance-kpi-top">
        <span className="finance-kpi-icon">
          {icon}
        </span>

        <span className="finance-kpi-dot" />
      </div>

      <div className="finance-kpi-body">
        <span>{label}</span>

        <strong>{value}</strong>

        <small>{detail}</small>
      </div>
    </article>
  );
}

function InsightCard({
  tone,
  icon,
  label,
  title,
  value,
  description,
}: {
  tone:
    | "green"
    | "red"
    | "blue";
  icon: ReactNode;
  label: string;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article
      className={`finance-insight finance-insight-${tone}`}
    >
      <div className="finance-insight-top">
        <div>
          <span>{label}</span>

          <h3>{title}</h3>
        </div>

        <span className="finance-insight-icon">
          {icon}
        </span>
      </div>

      <strong>{value}</strong>

      <p>{description}</p>
    </article>
  );
}

function OverviewTransactions({
  transactions,
  members,
  onViewAll,
}: {
  transactions: Transaction[];
  members: Member[];
  onViewAll: () => void;
}) {
  return (
    <section className="finance-panel">
      <PanelHeader
        eyebrow="HOẠT ĐỘNG GẦN ĐÂY"
        title="Thu / Chi"
        action="Xem tất cả"
        onAction={onViewAll}
      />

      {transactions.length === 0 ? (
        <FinanceEmpty
          icon={<Wallet size={24} />}
          title="Chưa có giao dịch"
          description="Các khoản thu và chi mới sẽ xuất hiện tại đây."
        />
      ) : (
        <div className="finance-recent-list">
          {transactions
            .slice(0, 6)
            .map((item) => (
              <TransactionRow
                key={item.id}
                item={item}
                memberName={getMemberName(
                  members,
                  item.member_id
                )}
              />
            ))}
        </div>
      )}
    </section>
  );
}

function OverviewFees({
  summary,
  onViewAll,
}: {
  summary: Summary;
  onViewAll: () => void;
}) {
  const total =
    summary.totalFees +
    summary.waivedFees;

  const paid =
    total > 0
      ? Math.round(
          (summary.paidFees /
            total) *
            100
        )
      : 0;

  const unpaid =
    total > 0
      ? Math.round(
          (summary.unpaidFees /
            total) *
            100
        )
      : 0;

  const waived =
    total > 0
      ? Math.round(
          (summary.waivedFees /
            total) *
            100
        )
      : 0;

  return (
    <section className="finance-panel">
      <PanelHeader
        eyebrow="ĐOÀN PHÍ"
        title="Tình hình thu phí"
        action="Xem tất cả"
        onAction={onViewAll}
      />

      <div className="finance-fee-summary">
        <FeeMetric
          label="Đã thu"
          amount={
            summary.paidFees
          }
          percentage={paid}
          tone="green"
        />

        <FeeMetric
          label="Chưa thu"
          amount={
            summary.unpaidFees
          }
          percentage={unpaid}
          tone="amber"
        />

        <FeeMetric
          label="Được miễn"
          amount={
            summary.waivedFees
          }
          percentage={waived}
          tone="slate"
        />

        <div className="finance-fee-note">
          <span>
            <Users size={17} />
          </span>

          <div>
            <strong>
              Theo dõi theo từng đoàn viên
            </strong>

            <p>
              Mỗi bản ghi được gắn với
              đoàn viên và kỳ thu tương
              ứng.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PanelHeader({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="finance-panel-header">
      <div>
        <span className="finance-section-label">
          {eyebrow}
        </span>

        <h3>{title}</h3>
      </div>

      <button
        type="button"
        onClick={onAction}
      >
        {action}
      </button>
    </div>
  );
}

function TransactionTable({
  items,
  members,
  onEdit,
  onDelete,
  onCreate,
}: {
  items: Transaction[];
  members: Member[];
  onEdit: (
    item: Transaction
  ) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="finance-table-section">
      <div className="finance-table-header">
        <div>
          <span className="finance-section-label">
            SỔ QUỸ CHI ĐOÀN
          </span>

          <h3>
            Danh sách thu / chi
          </h3>

          <p>
            Theo dõi từng giao dịch
            phát sinh trong quỹ.
          </p>
        </div>

        <button
          type="button"
          className="finance-button finance-button-primary"
          onClick={onCreate}
        >
          <Plus size={17} />
          Thêm giao dịch
        </button>
      </div>

      {items.length === 0 ? (
        <FinanceEmpty
          icon={<Search size={24} />}
          title="Không tìm thấy giao dịch"
          description="Hãy thử thay đổi từ khóa tìm kiếm."
        />
      ) : (
        <div className="finance-table-wrap">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Nội dung</th>
                <th>Loại</th>
                <th>Người liên quan</th>
                <th className="finance-align-right">
                  Số tiền
                </th>
                <th className="finance-align-center">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="finance-table-date">
                      <CalendarDays
                        size={15}
                      />
                      {formatDate(
                        item.transaction_date
                      )}
                    </span>
                  </td>

                  <td>
                    <div className="finance-table-title">
                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {item.category}
                      </span>
                    </div>
                  </td>

                  <td>
                    <TransactionBadge
                      type={
                        item.transaction_type
                      }
                    />
                  </td>

                  <td>
                    <span className="finance-table-person">
                      {getMemberName(
                        members,
                        item.member_id
                      )}
                    </span>
                  </td>

                  <td className="finance-align-right">
                    <strong
                      className={
                        item.transaction_type ===
                        "income"
                          ? "finance-amount-income"
                          : "finance-amount-expense"
                      }
                    >
                      {item.transaction_type ===
                      "income"
                        ? "+"
                        : "-"}
                      {formatMoney(
                        item.amount
                      )}
                    </strong>
                  </td>

                  <td>
                    <div className="finance-table-actions">
                      <button
                        type="button"
                        onClick={() =>
                          onEdit(item)
                        }
                        aria-label="Sửa"
                      >
                        <Pencil
                          size={16}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onDelete(
                            item.id
                          )
                        }
                        aria-label="Xóa"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FeeTable({
  items,
  members,
  onEdit,
  onDelete,
  onCreate,
}: {
  items: MembershipFee[];
  members: Member[];
  onEdit: (
    item: MembershipFee
  ) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="finance-table-section">
      <div className="finance-table-header">
        <div>
          <span className="finance-section-label">
            MEMBERSHIP FEE
          </span>

          <h3>
            Theo dõi đoàn phí
          </h3>

          <p>
            Quản lý tình trạng thu theo
            từng đoàn viên.
          </p>
        </div>

        <button
          type="button"
          className="finance-button finance-button-primary"
          onClick={onCreate}
        >
          <Plus size={17} />
          Ghi đoàn phí
        </button>
      </div>

      {items.length === 0 ? (
        <FinanceEmpty
          icon={<Receipt size={24} />}
          title="Chưa có dữ liệu đoàn phí"
          description="Hãy thêm bản ghi đoàn phí đầu tiên."
        />
      ) : (
        <div className="finance-table-wrap">
          <table className="finance-table finance-fee-table">
            <thead>
              <tr>
                <th>Đoàn viên</th>
                <th>Kỳ thu</th>
                <th className="finance-align-right">
                  Số tiền
                </th>
                <th>Trạng thái</th>
                <th>Hình thức</th>
                <th className="finance-align-center">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const member =
                  getMemberInfo(
                    members,
                    item.member_id
                  );

                return (
                  <tr
                    key={item.id}
                  >
                    <td>
                      <div className="finance-member-cell">
                        <span className="finance-member-avatar">
                          {member?.full_name
                            ?.trim()
                            .slice(
                              0,
                              1
                            )
                            .toUpperCase() ||
                            "Đ"}
                        </span>

                        <div>
                          <strong>
                            {member?.full_name ||
                              `Đoàn viên #${item.member_id}`}
                          </strong>

                          <span>
                            {member
                              ? `${member.student_id} · ${member.class_name}`
                              : "Không tìm thấy hồ sơ"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="finance-fee-month">
                        {formatMonth(
                          item.fee_month
                        )}
                      </span>
                    </td>

                    <td className="finance-align-right">
                      <strong className="finance-fee-amount">
                        {formatMoney(
                          item.amount
                        )}
                      </strong>
                    </td>

                    <td>
                      <FeeStatusBadge
                        status={
                          item.status
                        }
                      />
                    </td>

                    <td>
                      <span className="finance-table-muted">
                        {item.paid_method ||
                          "Chưa cập nhật"}
                      </span>
                    </td>

                    <td>
                      <div className="finance-table-actions">
                        <button
                          type="button"
                          onClick={() =>
                            onEdit(item)
                          }
                          aria-label="Sửa"
                        >
                          <Pencil
                            size={16}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onDelete(
                              item.id
                            )
                          }
                          aria-label="Xóa"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TransactionRow({
  item,
  memberName,
}: {
  item: Transaction;
  memberName: string;
}) {
  const income =
    item.transaction_type ===
    "income";

  return (
    <div className="finance-recent-row">
      <span
        className={
          income
            ? "finance-recent-icon finance-recent-icon-income"
            : "finance-recent-icon finance-recent-icon-expense"
        }
      >
        {income ? (
          <ArrowUpRight size={17} />
        ) : (
          <ArrowDownLeft size={17} />
        )}
      </span>

      <div className="finance-recent-main">
        <strong>
          {item.title}
        </strong>

        <span>
          {item.category} ·{" "}
          {memberName}
        </span>
      </div>

      <div className="finance-recent-value">
        <strong
          className={
            income
              ? "finance-amount-income"
              : "finance-amount-expense"
          }
        >
          {income ? "+" : "-"}
          {formatMoney(item.amount)}
        </strong>

        <span>
          {formatDate(
            item.transaction_date
          )}
        </span>
      </div>
    </div>
  );
}

function FeeMetric({
  label,
  amount,
  percentage,
  tone,
}: {
  label: string;
  amount: number;
  percentage: number;
  tone:
    | "green"
    | "amber"
    | "slate";
}) {
  return (
    <div className="finance-fee-metric">
      <div className="finance-fee-metric-top">
        <span>{label}</span>

        <strong>
          {formatMoney(amount)}
        </strong>
      </div>

      <div className="finance-progress">
        <span
          className={`finance-progress-${tone}`}
          style={{
            width: `${Math.min(
              percentage,
              100
            )}%`,
          }}
        />
      </div>

      <small>
        {percentage}%
      </small>
    </div>
  );
}

function TransactionBadge({
  type,
}: {
  type: TransactionType;
}) {
  const income =
    type === "income";

  return (
    <span
      className={
        income
          ? "finance-badge finance-badge-income"
          : "finance-badge finance-badge-expense"
      }
    >
      {income ? (
        <ArrowUpFromLine
          size={13}
        />
      ) : (
        <ArrowDownToLine
          size={13}
        />
      )}

      {income ? "Thu" : "Chi"}
    </span>
  );
}

function FeeStatusBadge({
  status,
}: {
  status: FeeStatus;
}) {
  if (status === "paid") {
    return (
      <span className="finance-badge finance-badge-paid">
        <CheckCircle2 size={13} />
        Đã thu
      </span>
    );
  }

  if (status === "waived") {
    return (
      <span className="finance-badge finance-badge-waived">
        Được miễn
      </span>
    );
  }

  return (
    <span className="finance-badge finance-badge-unpaid">
      Chưa thu
    </span>
  );
}

function FinanceEmpty({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="finance-empty">
      <span>{icon}</span>

      <strong>{title}</strong>

      <p>{description}</p>
    </div>
  );
}

function FinanceField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="finance-field">
      <span className="finance-field-label">
        {label}

        {required && (
          <b>*</b>
        )}
      </span>

      {children}
    </label>
  );
}

function FinanceModal({
  eyebrow,
  title,
  description,
  children,
  onClose,
  saving,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div
      className="finance-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="finance-modal">
        <header className="finance-modal-header">
          <div>
            <span className="finance-section-label">
              {eyebrow}
            </span>

            <h2>{title}</h2>

            <p>{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="finance-modal-close"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </header>

        <div className="finance-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  saving,
  onCancel,
  submitText,
  icon,
}: {
  saving: boolean;
  onCancel: () => void;
  submitText: string;
  icon: ReactNode;
}) {
  return (
    <div className="finance-form-actions">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="finance-button finance-button-secondary"
      >
        Hủy
      </button>

      <button
        type="submit"
        disabled={saving}
        className="finance-button finance-button-primary"
      >
        {icon}

        {saving
          ? "Đang lưu..."
          : submitText}
      </button>
    </div>
  );
}