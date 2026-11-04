import React, { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../../../layouts/Sidebar";
import SegmentedTabs from "../../../components/common/SegmentedTabs";
import { Wallet as WalletIcon, TrendingUp } from "lucide-react";

const Wallet = lazy(() => import("./Wallet"));
const PayoutRequests = lazy(() => import("./PayoutRequests"));

export default function Payouts({ defaultTab = "wallet" }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(
    currentTabParam || defaultTab
  );

  useEffect(() => {
    if (currentTabParam && currentTabParam !== activeTab) {
      setActiveTab(currentTabParam);
    }
  }, [currentTabParam, activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs = [
    { id: "wallet", label: "Admin Wallet", icon: WalletIcon },
    { id: "payouts", label: "Payout Requests", icon: TrendingUp },
  ];

  return (
    <div className="min-h-dvh bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh w-full space-y-5 sm:space-y-6">
        {/* Horizontal Navigation Segmented Tabs Bar */}
        <div className="bg-white p-2 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <SegmentedTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Tab View Content */}
        <div className="w-full">
          {activeTab === "wallet" && (
            <Suspense fallback={<div className="py-16 text-center text-slate-400 font-semibold text-xs">Loading wallet...</div>}>
              <Wallet embedded={true} />
            </Suspense>
          )}
          {activeTab === "payouts" && (
            <Suspense fallback={<div className="py-16 text-center text-slate-400 font-semibold text-xs">Loading payout requests...</div>}>
              <PayoutRequests embedded={true} />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}