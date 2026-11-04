import { useEffect, useState } from 'react';
import Sidebar from '../../../layouts/Sidebar';
import PageHeader from '../../../components/common/PageHeader';
import {
  Truck,
  IndianRupee,
  Clock,
  RotateCcw,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Timer,
  Info,
  Check,
  Sliders,
  Database,
  X
} from 'lucide-react';

import {
  getPlatformSettings,
  updatePlatformSettings
} from '../services/settingsService';

/* =========================================================
   SAFE OPERATIONAL DEFAULTS & CEILINGS (MATCHING BACKEND)
========================================================= */
const DEFAULT_SETTINGS = {
  deliveryRadiusKm: 10,
  platformFeeAmount: 100,
  deliveryFeeAmount: 100,
  vendorAcceptTimeoutSeconds: 60,
  deliveryAcceptTimeoutSeconds: 30,
  rebroadcastMaxRounds: 3,
  rebroadcastMaxElapsedMinutes: 15,
  otpExpiryMinutes: 120,
};

const DEFAULT_CEILINGS = {
  maxDeliveryRadiusKm: 50,
  maxPlatformFeeAmount: 500,
  maxDeliveryFeeAmount: 500,
  maxAcceptTimeoutSeconds: 1800,
  maxRebroadcastRounds: 20,
  maxRebroadcastElapsedMinutes: 120,
};

const LOCAL_STORAGE_KEY = 'veggo_platform_settings_v1';

/* =========================================================
   SETTING CONFIGURATION METADATA BY CATEGORY
========================================================= */
const SETTING_GROUPS = [
  {
    id: 'logistics',
    title: 'Logistics & Delivery Coverage',
    subtitle: 'Service radius for partners, shops and checkout, plus the flat delivery fee per order',
    icon: Truck,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    fields: [
      {
        key: 'deliveryRadiusKm',
        label: 'Delivery Service Radius',
        suffix: 'KM',
        icon: Truck,
        step: 0.5,
        min: 1,
        ceilingKey: 'maxDeliveryRadiusKm',
        description: 'Maximum distance between a customer and a shop, and between a shop and a delivery partner.',
        presets: [5, 10, 15, 25],
      },
      {
        key: 'deliveryFeeAmount',
        label: 'Delivery Fee (per order)',
        suffix: '₹',
        icon: IndianRupee,
        step: 1,
        min: 0,
        ceilingKey: 'maxDeliveryFeeAmount',
        description: 'Flat fee charged to the customer on every order and paid in full to the delivery partner.',
        presets: [0, 15, 25, 35, 50],
      },
    ],
  },
  {
    id: 'dispatch',
    title: 'Order Dispatch & SLA Timeouts',
    subtitle: 'Define response deadlines for vendor confirmation and rider assignment',
    icon: Clock,
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200/80',
    fields: [
      {
        key: 'vendorAcceptTimeoutSeconds',
        label: 'Vendor Acceptance Timeout',
        suffix: 'Sec',
        icon: Clock,
        step: 15,
        min: 30,
        ceilingKey: 'maxAcceptTimeoutSeconds',
        description: 'Time window allowed for vendor store to accept or prepare the incoming basket.',
        presets: [60, 120, 180, 240],
      },
      {
        key: 'deliveryAcceptTimeoutSeconds',
        label: 'Rider Claim Timeout',
        suffix: 'Sec',
        icon: Clock,
        step: 15,
        min: 30,
        ceilingKey: 'maxAcceptTimeoutSeconds',
        description: 'Time allotted for nearby delivery partners to claim the dispatch task.',
        presets: [60, 90, 120, 180],
      },
    ],
  },
  {
    id: 'rebroadcast',
    title: 'Rebroadcast & Escalation Cycles',
    subtitle: 'Parameters governing unattended order redispatch retries',
    icon: RotateCcw,
    badgeColor: 'bg-emerald-50/80 text-emerald-800 border-emerald-200/80',
    fields: [
      {
        key: 'rebroadcastMaxRounds',
        label: 'Max Rebroadcast Cycles',
        suffix: 'Rounds',
        icon: RotateCcw,
        step: 1,
        min: 1,
        ceilingKey: 'maxRebroadcastRounds',
        description: 'Number of times system redispatches an unclaimed order to new partners.',
        presets: [2, 3, 4, 5],
      },
      {
        key: 'rebroadcastMaxElapsedMinutes',
        label: 'Max Rebroadcast Window',
        suffix: 'Min',
        icon: Timer,
        step: 1,
        min: 5,
        ceilingKey: 'maxRebroadcastElapsedMinutes',
        description: 'Maximum elapsed duration allowed for automatic redispatch before alerting admin.',
        presets: [10, 15, 20, 30],
      },
    ],
  },
  {
    id: 'finance_security',
    title: 'Platform Fee & OTP Security',
    subtitle: 'Flat platform fee charged per order and OTP authentication expiry',
    icon: ShieldCheck,
    badgeColor: 'bg-teal-50/80 text-teal-800 border-teal-200/80',
    fields: [
      {
        key: 'platformFeeAmount',
        label: 'Platform Convenience Fee',
        suffix: '₹',
        icon: IndianRupee,
        step: 0.5,
        min: 0,
        ceilingKey: 'maxPlatformFeeAmount',
        description: 'Flat fee charged to the customer on every order and credited to the platform wallet.',
        presets: [0, 2, 5, 10, 15],
      },
      {
        key: 'otpExpiryMinutes',
        label: 'OTP Expiry Duration',
        suffix: 'Min',
        icon: Timer,
        step: 1,
        min: 1,
        ceilingKey: null,
        description: 'Duration before login and delivery handover verification OTPs expire.',
        presets: [3, 5, 10, 15],
      },
    ],
  },
];

export default function Settings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ceilings, setCeilings] = useState(DEFAULT_CEILINGS);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-dismiss toast timer
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Read saved local values if existing
  const getInitialValues = () => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  };

  const applyResponseData = (data) => {
    if (!data || typeof data !== 'object') return;

    if (data.ceilings && typeof data.ceilings === 'object') {
      setCeilings((prev) => ({
        ...prev,
        ...data.ceilings,
      }));
    }

    if (data.updatedAt) {
      setUpdatedAt(data.updatedAt);
    }

    const nextSettings = {};
    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      if (data[key] !== undefined && data[key] !== null) {
        nextSettings[key] = Number(data[key]);
      }
    });

    if (Object.keys(nextSettings).length > 0) {
      setSettings((prev) => ({
        ...prev,
        ...nextSettings,
      }));
      setIsLiveApi(true);
    }
  };

  const loadSettings = async () => {
    try {
      // Fetch live configuration from backend GET /api/admin/settings
      const response = await getPlatformSettings();

      if (response?.success && response?.data && typeof response.data === 'object') {
        applyResponseData(response.data);
        setIsLiveApi(true);
      } else {
        // Fallback to local defaults if response data is missing
        setSettings(getInitialValues());
        setIsLiveApi(false);
      }
    } catch (err) {
      console.warn('Live settings fetch fallback:', err);
      // Graceful fallback to default values
      setSettings(getInitialValues());
      setIsLiveApi(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadSettings(false);
      setToast({
        type: 'success',
        title: 'Settings Refreshed',
        desc: 'Loaded the latest platform configuration from the server.',
      });
    } catch {
      setToast({
        type: 'error',
        title: 'Refresh Notice',
        desc: 'Could not refresh from server. Using local operational defaults.',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleChange = (field, value) => {
    const num = value === '' ? '' : Number(value);
    setSettings((prev) => ({
      ...prev,
      [field]: num,
    }));
  };

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setToast({
      type: 'info',
      title: 'Defaults Restored',
      desc: 'All operational parameters reset to platform factory defaults.'
    });
  };

  const validateSettings = () => {
    for (const [key, val] of Object.entries(settings)) {
      if (val === '' || val === null || val === undefined) {
        return `Please specify a valid value for ${key}.`;
      }
      if (Number(val) < 0) {
        return 'Values cannot be negative.';
      }
    }

    // Ceilings validation
    if (settings.deliveryRadiusKm > ceilings.maxDeliveryRadiusKm) {
      return `Delivery radius cannot exceed ${ceilings.maxDeliveryRadiusKm} KM.`;
    }
    if (settings.platformFeeAmount > ceilings.maxPlatformFeeAmount) {
      return `Platform fee cannot exceed ₹${ceilings.maxPlatformFeeAmount}.`;
    }
    if (settings.deliveryFeeAmount > ceilings.maxDeliveryFeeAmount) {
      return `Delivery fee cannot exceed ₹${ceilings.maxDeliveryFeeAmount}.`;
    }
    if (settings.vendorAcceptTimeoutSeconds > ceilings.maxAcceptTimeoutSeconds) {
      return `Vendor accept timeout cannot exceed ${ceilings.maxAcceptTimeoutSeconds}s.`;
    }
    if (settings.deliveryAcceptTimeoutSeconds > ceilings.maxAcceptTimeoutSeconds) {
      return `Delivery partner accept timeout cannot exceed ${ceilings.maxAcceptTimeoutSeconds}s.`;
    }
    if (settings.rebroadcastMaxRounds > ceilings.maxRebroadcastRounds) {
      return `Rebroadcast rounds cannot exceed ${ceilings.maxRebroadcastRounds}.`;
    }
    if (settings.rebroadcastMaxElapsedMinutes > ceilings.maxRebroadcastElapsedMinutes) {
      return `Rebroadcast window cannot exceed ${ceilings.maxRebroadcastElapsedMinutes} mins.`;
    }

    return null;
  };

  const handleSave = async () => {
    if (saving) return;

    const validationError = validateSettings();
    if (validationError) {
      setToast({
        type: 'error',
        title: 'Validation Notice',
        desc: validationError,
      });
      return;
    }

    try {
      setSaving(true);
      setSaveSuccess(false);

      // Clean payload strictly matching backend PUT /api/admin/settings schema
      const payload = {
        deliveryRadiusKm: Number(settings.deliveryRadiusKm),
        vendorAcceptTimeoutSeconds: Number(settings.vendorAcceptTimeoutSeconds),
        deliveryAcceptTimeoutSeconds: Number(settings.deliveryAcceptTimeoutSeconds),
        rebroadcastMaxRounds: Number(settings.rebroadcastMaxRounds),
        rebroadcastMaxElapsedMinutes: Number(settings.rebroadcastMaxElapsedMinutes),
        otpExpiryMinutes: Number(settings.otpExpiryMinutes),
        deliveryFeeAmount: Number(settings.deliveryFeeAmount),
        platformFeeAmount: Number(settings.platformFeeAmount),
      };

      // Always persist to local cache for instant reliability
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore
      }

      // Synchronize with server PUT /api/admin/settings
      const response = await updatePlatformSettings(payload);

      if (response?.success) {
        if (response?.data) {
          applyResponseData(response.data);
        }
        setIsLiveApi(true);
        setSaveSuccess(true);
        setToast({
          type: 'success',
          title: 'Platform Settings Synchronized',
          desc: response?.message || 'Platform settings updated successfully.',
        });
      } else {
        throw new Error(response?.message || 'Failed to update platform settings');
      }
    } catch (err) {
      console.error('Settings save error:', err);
      setToast({
        type: 'error',
        title: 'Update Failed',
        desc:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to update platform settings on server.',
      });
    } finally {
      setSaving(false);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    }
  };

  return (
    <div className="w-full min-h-dvh bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar />

      <main className="flex-1 min-w-0 min-h-dvh p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto space-y-6 sm:space-y-8">
        {/* Page Header */}
        <PageHeader
          badge="Platform Operations"
          badgeIcon={Sliders}
          title="System Settings"
          subtitle="Configure delivery radius, SLA acceptance thresholds, dispatch escalation, and the delivery and platform fees used across every app."
          onRefresh={handleRefresh}
          isRefreshing={refreshing || saving}
        />

        {/* Status Notification Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-emerald-100/80 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${isLiveApi ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-50/70 text-emerald-800 border-emerald-200/60'}`}>
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {isLiveApi ? 'Live Backend Connected' : 'Operational Safe Mode Active'}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${isLiveApi ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLiveApi ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                  {isLiveApi ? 'Live Sync' : 'Local Fallback'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isLiveApi
                  ? `All parameters are synchronized directly with the production backend.${updatedAt
                    ? ` (Last synced: ${new Date(updatedAt).toLocaleTimeString()})`
                    : ''
                  }`
                  : 'Operating with certified safe defaults. Edits are saved locally until backend endpoint /api/admin/settings is deployed.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer shadow-2xs"
              title="Reset all fields to factory defaults"
            >
              <RotateCcw size={13} />
              Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm ${saveSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={14} />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Floating Sidebar/Popup Toast Notification */}
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full pointer-events-none">
          {toast && (
            <div
              key={toast.title + toast.desc}
              className={`pointer-events-auto w-full bg-white/95 backdrop-blur-md rounded-2xl border shadow-2xl p-4 overflow-hidden relative ${toast.type === 'error'
                  ? 'border-rose-200/90 shadow-rose-950/10'
                  : toast.type === 'info'
                    ? 'border-sky-200/90 shadow-sky-950/10'
                    : 'border-emerald-200/90 shadow-emerald-950/10'
                }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl border shrink-0 ${toast.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-600'
                      : toast.type === 'info'
                        ? 'bg-sky-50 border-sky-200 text-sky-600'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    }`}
                >
                  {toast.type === 'error' ? (
                    <AlertCircle size={18} />
                  ) : toast.type === 'info' ? (
                    <Info size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                    {toast.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {toast.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Progress Line */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 ${toast.type === 'error'
                    ? 'bg-rose-500'
                    : toast.type === 'info'
                      ? 'bg-sky-500'
                      : 'bg-emerald-500'
                  }`}
              />
            </div>
          )}
        </div>

        {/* Categorized Settings Grid */}
        <div className="space-y-6 sm:space-y-8">
          {SETTING_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            return (
              <section
                key={group.id}
                className="bg-white rounded-3xl border border-emerald-100/80 shadow-xs overflow-hidden transition-all hover:shadow-md"
              >
                {/* Group Header */}
                <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${group.badgeColor}`}>
                      <GroupIcon size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                        {group.title}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {group.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fields Grid */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.fields.map((field) => {
                    const FieldIcon = field.icon;
                    const currentValue = settings[field.key] ?? '';
                    const maxCeiling = field.ceilingKey ? ceilings[field.ceilingKey] : null;

                    return (
                      <div
                        key={field.key}
                        className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70 hover:border-emerald-300 hover:bg-white transition-all space-y-4 shadow-2xs group"
                      >
                        {/* Header & Description */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors block">
                              {field.label}
                            </span>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {field.description}
                            </p>
                          </div>
                          <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-all shrink-0">
                            <FieldIcon size={16} />
                          </div>
                        </div>

                        {/* Input & Unit Stepper */}
                        <div className="space-y-2">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={field.min ?? 0}
                              max={maxCeiling ?? undefined}
                              step={field.step ?? 1}
                              value={currentValue}
                              onChange={(e) => handleChange(field.key, e.target.value)}
                              className="w-full h-11 pl-4 pr-16 text-base font-bold text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15 transition-all"
                            />
                            <span className="absolute right-3 px-2 py-0.5 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600 tracking-wider">
                              {field.suffix}
                            </span>
                          </div>

                          {/* Quick Presets & Ceiling Info */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                            {field.presets && field.presets.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-400 font-semibold">Presets:</span>
                                {field.presets.map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => handleChange(field.key, preset)}
                                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer border ${Number(currentValue) === preset ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'}`}
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            )}

                            {maxCeiling && (
                              <span className="text-slate-400 font-semibold ml-auto">
                                Max Limit: <strong className="text-slate-600">{maxCeiling} {field.suffix}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Bottom Save Bar */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900">
              Apply Platform Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Fees apply to new orders only. Delivery radius applies immediately to customers, vendors and delivery partners.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
            >
              Reset to Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${saveSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check size={15} />
                  <span>Changes Saved!</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}