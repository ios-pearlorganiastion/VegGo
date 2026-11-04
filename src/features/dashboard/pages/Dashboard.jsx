import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Sidebar from '../../../layouts/Sidebar';
import PageHeader from '../../../components/common/PageHeader';
import { getAdminDashboard } from '../services/dashboardService';
import { LIGHT_ACCENTS, DASHBOARD_METRIC_THEMES } from '../../../constants/theme.constants';
import {
  Users,
  UserRound,
  ShieldCheck,
  Server,
  Activity,
  AlertCircle,
  RefreshCw,
  Clock,
  Database,
  Sparkles
} from 'lucide-react';

const AnimatedValue = React.memo(function AnimatedValue({ value, prefix = '', suffix = '' }) {
  if (value === null || value === undefined || value === '') {
    return <span>{prefix}0{suffix}</span>;
  }
  const targetNum = Number(value);
  if (Number.isNaN(targetNum)) {
    return <span>{prefix}{String(value)}{suffix}</span>;
  }
  return <span>{prefix}{targetNum.toLocaleString('en-IN')}{suffix}</span>;
});

const formatDisplayText = (value) => {
  if (!value) return 'N/A';
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'Unable to connect to admin dashboard service.'
  );
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);

  const [dashboardData, setDashboardData] = useState({
    totalCustomers: 0,
    totalUsers: 0,
    systemStatus: 'Operational',
    environment: 'Production'
  });

  const fetchDashboard = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await getAdminDashboard();
      const payload = response?.data !== undefined ? response.data : response;

      setDashboardData({
        totalCustomers: payload?.totalCustomers ?? 0,
        totalUsers: payload?.totalUsers ?? 0,
        systemStatus: payload?.systemStatus || 'Operational',
        environment: payload?.environment || 'Production'
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  const { totalCustomers, totalUsers, systemStatus, environment } = dashboardData;
  const isHealthy =
    systemStatus.toLowerCase() === 'healthy' ||
    systemStatus.toLowerCase() === 'operational' ||
    systemStatus.toLowerCase() === 'up';

  // Metrics list powered by soft light pastel theme tokens
  const metrics = useMemo(() => [
    {
      id: 'customers',
      label: 'Registered Customers',
      description: 'Active consumer shopper accounts across VegGoFresh',
      value: loading ? '...' : <AnimatedValue value={totalCustomers} />,
      icon: Users,
      theme: DASHBOARD_METRIC_THEMES.CUSTOMERS,
      status: 'Active Accounts',
    },
    {
      id: 'users',
      label: 'Platform Users',
      description: 'System credentials, staff, and administrative operators',
      value: loading ? '...' : <AnimatedValue value={totalUsers} />,
      icon: UserRound,
      theme: DASHBOARD_METRIC_THEMES.USERS,
      status: 'Verified',
    },
    {
      id: 'status',
      label: 'System Status',
      description: 'Core platform service cluster operational health',
      value: formatDisplayText(systemStatus),
      icon: ShieldCheck,
      theme: isHealthy
        ? DASHBOARD_METRIC_THEMES.STATUS_HEALTHY
        : DASHBOARD_METRIC_THEMES.STATUS_DEGRADED,
      status: isHealthy ? 'Operational' : 'Attention Needed',
    },
    {
      id: 'environment',
      label: 'Platform Environment',
      description: 'Current cloud production environment tier',
      value: formatDisplayText(environment),
      icon: Server,
      theme: DASHBOARD_METRIC_THEMES.ENVIRONMENT,
      status: 'Live Cluster',
    }
  ], [loading, totalCustomers, totalUsers, systemStatus, environment, isHealthy]);

  return (
    <div className="min-h-dvh bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh w-full space-y-5 sm:space-y-6">
        {/* Top Executive Header (Products format) */}
        <PageHeader
          icon={Activity}
          title="Platform Overview"
          subtitle="Overview of registered accounts, system operational health, and active environment."
          stats={[
            { label: 'Total Customers', value: totalCustomers },
            { label: 'Total Users', value: totalUsers }
          ]}
          onRefresh={() => fetchDashboard(true)}
          isRefreshing={isRefreshing || loading}
          actions={
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-100/80 text-[11px] font-bold text-slate-500 shadow-2xs">
              <Clock
                size={13}
                className={isRefreshing ? 'text-emerald-500 animate-spin' : 'text-slate-400'}
              />
              {isRefreshing ? (
                <span className="text-emerald-600 font-semibold">Syncing live data...</span>
              ) : (
                <span>
                  Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </span>
          }
        />

        {/* Global Error Banner */}
        {error && (
          <div
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-rose-800 shadow-2xs"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>
                <strong>Failed to sync dashboard:</strong> {error}
              </span>
            </div>
            <button
              type="button"
              onClick={() => fetchDashboard(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300/80 font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* Minimal Single Main Container with Soft Green Styling */}
        <div className="relative bg-white/95 rounded-3xl border border-emerald-100/80 shadow-2xs hover:shadow-xs transition-shadow overflow-hidden backdrop-blur-xs">
          {/* Delicate Green Top Stripe */}
          <div className={`h-1.5 w-full ${LIGHT_ACCENTS.TOP_STRIPE}`} />

          {/* Container Header Bar with Soft Green Background */}
          <div className={`p-5 sm:p-6 border-b border-emerald-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${LIGHT_ACCENTS.HEADER_BG}`}>
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shadow-2xs">
                <Database size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    Platform Standing
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                    <Sparkles size={10} className="text-emerald-500" />
                    Live Sync
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Real-time system overview and live account standing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isHealthy
                    ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200/60'
                    : 'bg-rose-50/80 text-rose-800 border-rose-200/60'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isHealthy ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                {formatDisplayText(systemStatus)}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-50/80 text-teal-800 border border-teal-200/60">
                {formatDisplayText(environment)}
              </span>
            </div>
          </div>

          {/* Quick Green Metric Highlights Strip */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3.5 p-3.5 sm:p-5 bg-gradient-to-b from-emerald-50/25 via-teal-50/15 to-transparent border-b border-emerald-100/70">
            {metrics.map((item) => {
              const Icon = item.icon;
              const theme = item.theme;

              return (
                <div
                  key={`card-${item.id}`}
                  className={`rounded-2xl p-3.5 border transition-all ${theme.cardBg}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                      {item.label}
                    </span>
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                      <Icon size={15} />
                    </div>
                  </div>
                  <span className={`text-lg sm:text-xl font-bold block mt-1.5 ${theme.textColor || 'text-slate-900'}`}>
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Desktop Metrics Table View (lg screens and above) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase font-semibold tracking-wider text-slate-500 bg-slate-50/50">
                  <th className="py-3.5 px-5 sm:px-6">Metric Details</th>
                  <th className="py-3.5 px-5">Description</th>
                  <th className="py-3.5 px-5 text-right sm:text-center">Value</th>
                  <th className="py-3.5 px-5 text-right">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100/80">
                {metrics.map((item) => {
                  const Icon = item.icon;
                  const theme = item.theme;

                  return (
                    <tr
                      key={item.id}
                      className={`${theme.rowBg} group`}
                    >
                      {/* Metric Name + Soft Pastel Icon Box */}
                      <td className="py-4 px-5 sm:px-6">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                            <Icon size={17} />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block text-xs sm:text-sm">
                              {item.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-4 px-5 text-slate-500 text-xs font-normal">
                        {item.description}
                      </td>

                      {/* Value with Clean Typography */}
                      <td className="py-4 px-5 text-right sm:text-center">
                        <span className={`text-sm sm:text-base font-bold tracking-tight ${theme.textColor || 'text-slate-900'}`}>
                          {item.value}
                        </span>
                      </td>

                      {/* Soft Pastel Status Badge */}
                      <td className="py-4 px-5 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${theme.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tablet & Phone Card View (shows on tab & mobile) */}
          <div className="lg:hidden p-3.5 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {metrics.map((item) => {
              const Icon = item.icon;
              const theme = item.theme;

              return (
                <div
                  key={`tab-card-${item.id}`}
                  className={`p-4 rounded-2xl border ${theme.cardBg} flex flex-col justify-between gap-3`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${theme.iconBg}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 block text-xs sm:text-sm truncate">
                          {item.label}
                        </span>
                        <p className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60 mt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Value
                      </span>
                      <span className={`text-lg sm:text-xl font-bold tracking-tight block ${theme.textColor || 'text-slate-900'}`}>
                        {item.value}
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${theme.badge} shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                      {item.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}