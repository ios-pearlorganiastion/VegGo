import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../../layouts/Sidebar";
import PageHeader from "../../../components/common/PageHeader";

import {
  Calendar,
  Search,
  Filter,
  Wallet as WalletIcon,
  ReceiptText,
  CheckCircle2,
  AlertCircle,
  Clock3,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  getWalletBalance,
  getWalletTransactions,
  getCreditTransactions,
  getDebitTransactions,
} from "../services/wallet";

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.message ||
    fallback
  );
};

const formatAmount = (amount) => {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function Wallet({ embedded = false }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchWalletBalance = async () => {
    try {
      const data = await getWalletBalance();
      const walletBalance =
        data?.balance ??
        data?.walletBalance ??
        data?.amount ??
        data?.data?.balance ??
        data?.data?.walletBalance ??
        0;

      setBalance(Number(walletBalance) || 0);
    } catch (error) {
      console.error("Wallet balance error:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      let data;
      if (activeFilter === "Credit") {
        data = await getCreditTransactions(page, 20);
      } else if (activeFilter === "Debit") {
        data = await getDebitTransactions(page, 20);
      } else {
        data = await getWalletTransactions(page, 20);
      }

      let transactionList = [];
      if (Array.isArray(data)) {
        transactionList = data;
      } else if (Array.isArray(data?.content)) {
        transactionList = data.content;
      } else if (Array.isArray(data?.data)) {
        transactionList = data.data;
      } else if (Array.isArray(data?.transactions)) {
        transactionList = data.transactions;
      } else if (Array.isArray(data?.data?.content)) {
        transactionList = data.data.content;
      } else if (Array.isArray(data?.data?.transactions)) {
        transactionList = data.data.transactions;
      }

      setTransactions(transactionList);

      const pages =
        data?.totalPages ??
        data?.data?.totalPages ??
        data?.page?.totalPages ??
        1;

      setTotalPages(Number(pages) || 1);
    } catch (error) {
      console.error("Wallet transactions error:", error);
      setTransactions([]);
      setErrorMessage(
        getErrorMessage(error, "Failed to load wallet transactions.")
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [activeFilter, page]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWalletBalance();
    fetchTransactions();
  };

  const handleFilterChange = (filter) => {
    setPage(0);
    setActiveFilter(filter);
  };

  const getTransactionType = (transaction) => {
    return String(
      transaction?.type ||
        transaction?.transactionType ||
        transaction?.transaction_type ||
        ""
    ).toUpperCase();
  };

  const getTransactionAmount = (transaction) => {
    return (
      transaction?.amount ??
      transaction?.transactionAmount ??
      transaction?.walletAmount ??
      0
    );
  };

  const getDescription = (transaction) => {
    return (
      transaction?.description ||
      transaction?.remarks ||
      transaction?.reason ||
      transaction?.reference ||
      transaction?.transactionId ||
      "Wallet Transaction"
    );
  };

  const getTransactionId = (transaction) => {
    return transaction?.transactionId || transaction?.id || "-";
  };

  const getDate = (transaction) => {
    const date =
      transaction?.createdAt ||
      transaction?.createdDate ||
      transaction?.date ||
      transaction?.transactionDate;

    if (!date) return "-";
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return "-";

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return transactions.filter((transaction) => {
      const description = String(getDescription(transaction)).toLowerCase();
      const transactionId = String(getTransactionId(transaction)).toLowerCase();
      const type = getTransactionType(transaction).toLowerCase();

      const matchesSearch =
        !query ||
        description.includes(query) ||
        transactionId.includes(query) ||
        type.includes(query);

      return matchesSearch;
    });
  }, [transactions, searchQuery]);

  const content = (
    <div className="w-full space-y-5 sm:space-y-6">
      {/* Top Header */}
      <PageHeader
        badge="Finance Control"
        badgeIcon={WalletIcon}
        title="Admin Platform Wallet"
        subtitle="Track platform escrow wallet balance, ledger transactions, and settlements."
        stats={[
          { label: "Available Balance", value: formatAmount(balance) },
          { label: "Transactions", value: transactions.length },
        ]}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div
          className="px-5 py-3.5 rounded-2xl border text-xs font-semibold bg-rose-50 border-rose-200 text-rose-700 flex items-center gap-2 shadow-2xs"
        >
          <AlertCircle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Table Container */}
      <section className="w-full">
        <div
          className="bg-white rounded-3xl border border-emerald-100/90 shadow-2xs p-5 sm:p-6"
        >
          {/* Controls Bar: Title, Search, Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                <WalletIcon size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Transaction Ledger
                </h2>
                <p className="text-xs font-semibold text-slate-400">
                  Platform credits, debits, and balance ledger history
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                <Filter size={13} className="text-slate-400 ml-1.5" />
                {["All", "Credit", "Debit"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleFilterChange(filter)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeFilter === filter
                        ? "bg-white text-emerald-700 shadow-2xs border border-slate-200/60 font-black"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Transaction / Description</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Loader2 size={26} className="animate-spin text-emerald-600" />
                        <span className="text-xs font-semibold">
                          Loading transactions...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction, idx) => {
                    const type = getTransactionType(transaction);
                    const amount = Number(getTransactionAmount(transaction)) || 0;
                    const isCredit = type === "CREDIT";
                    const status = String(transaction?.status || "COMPLETED").toUpperCase();
                    const isCompleted = status === "COMPLETED" || status === "SUCCESS";
                    const isPending = status === "PENDING";

                    return (
                      <tr
                        key={transaction?.id || transaction?.transactionId || idx}
                        className="hover:bg-slate-50/70 group"
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isCredit
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {isCredit ? (
                                <ArrowDownLeft size={16} />
                              ) : (
                                <ArrowUpRight size={16} />
                              )}
                            </div>
                            <span
                              className="max-w-xs font-bold line-clamp-2 wrap-break-word"
                              title={String(getDescription(transaction))}
                            >
                              {getDescription(transaction)}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {type || "TRANSACTION"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold">
                          <span
                            className={
                              isCredit ? "text-emerald-700 font-black" : "text-rose-600 font-black"
                            }
                          >
                            {isCredit ? "+" : "-"}₹
                            {Math.abs(amount).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar size={13} className="text-slate-400" />
                            <span>{getDate(transaction)}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            {getTransactionId(transaction)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isPending
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 size={12} />
                            ) : isPending ? (
                              <Clock3 size={12} />
                            ) : (
                              <AlertCircle size={12} />
                            )}
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <ReceiptText size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-xs">No transactions found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View Cards */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="py-10 text-center text-xs font-semibold text-slate-400">
                <Loader2 size={24} className="animate-spin text-emerald-600 mx-auto mb-2" />
                Loading wallet transactions...
              </div>
            ) : filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction, idx) => {
                const type = getTransactionType(transaction);
                const amount = Number(getTransactionAmount(transaction)) || 0;
                const isCredit = type === "CREDIT";

                return (
                  <div
                    key={transaction?.id || transaction?.transactionId || idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isCredit
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft size={16} />
                          ) : (
                            <ArrowUpRight size={16} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4
                            className="font-bold text-sm text-slate-900 line-clamp-2 wrap-break-word"
                            title={String(getDescription(transaction))}
                          >
                            {getDescription(transaction)}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {getDate(transaction)}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`font-black text-sm font-mono ${
                          isCredit ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {isCredit ? "+" : "-"}₹
                        {Math.abs(amount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60">
                      <span className="font-mono text-[10px] text-slate-500">
                        ID: {getTransactionId(transaction)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCredit
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {type || "TRANSACTION"}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-xs font-semibold text-slate-400">
                No transactions found.
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600">
              <span>
                Showing Page {page + 1} of {totalPages} ({transactions.length} items loaded)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 font-mono">
                  {page + 1}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1 || loading}
                  onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-dvh bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 w-full space-y-5 sm:space-y-6 lg:max-h-dvh lg:overflow-y-auto">
        {content}
      </main>
    </div>
  );
}