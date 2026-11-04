import { useState } from 'react';
import Sidebar from '../../../layouts/Sidebar';
import PageHeader from '../../../components/common/PageHeader';
import { 
  ShieldAlert, 
  Thermometer, 
  Droplet, 
  Wind, 
  CheckCircle2, 
  Cpu, 
  Radio 
} from 'lucide-react';

const facilities = [
  { 
    id: 'CR-1', 
    name: 'Primary Cold Room 1', 
    temp: '3.8 °C', 
    humidity: '88%', 
    status: 'Optimized', 
    type: 'Storage Room',
    gradient: 'from-emerald-500 to-teal-400',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  { 
    id: 'CR-2', 
    name: 'Secondary Cold Room 2', 
    temp: '4.1 °C', 
    humidity: '85%', 
    status: 'Optimized', 
    type: 'Storage Room',
    gradient: 'from-emerald-500 to-teal-400',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  { 
    id: 'FZ-1', 
    name: 'Deep Freezer Alpha', 
    temp: '-18.5 °C', 
    humidity: '92%', 
    status: 'Optimized', 
    type: 'Deep Freeze',
    gradient: 'from-cyan-500 to-blue-500',
    tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  { 
    id: 'TR-12', 
    name: 'Transit Unit Cargo 12', 
    temp: '5.2 °C', 
    humidity: '80%', 
    status: 'Warning', 
    type: 'Reefer Truck',
    gradient: 'from-amber-500 to-orange-400',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  { 
    id: 'TR-08', 
    name: 'Transit Unit Cargo 08', 
    temp: '4.0 °C', 
    humidity: '82%', 
    status: 'Optimized', 
    type: 'Reefer Truck',
    gradient: 'from-emerald-500 to-teal-400',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  { 
    id: 'CR-3', 
    name: 'Holding Facility Room 3', 
    temp: '9.5 °C', 
    humidity: '64%', 
    status: 'Critical', 
    type: 'Holding Bay',
    gradient: 'from-rose-500 to-red-500',
    tagColor: 'bg-rose-50 text-rose-700 border-rose-200'
  }
];

const coreMetrics = [
  { 
    label: 'Active Cooling Nodes', 
    value: '14 / 15 Online', 
    alert: false,
    icon: Cpu,
    iconBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
    gradient: 'from-sky-500 via-blue-400 to-cyan-400',
    note: '93.3% Network Uptime'
  },
  { 
    label: 'Facility Avg Humidity', 
    value: '81.5%', 
    alert: false,
    icon: Droplet,
    iconBg: 'bg-teal-50 text-teal-700 border-teal-200/80',
    gradient: 'from-teal-500 via-emerald-400 to-cyan-400',
    note: 'Optimal Produce Range'
  },
  { 
    label: 'Thermal Safety Index', 
    value: '98.2%', 
    alert: false,
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    gradient: 'from-emerald-500 via-teal-400 to-emerald-400',
    note: 'ISO Compliant'
  },
  { 
    label: 'Anomalies Flagged', 
    value: '1 Node Out of Range', 
    alert: true,
    icon: ShieldAlert,
    iconBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
    gradient: 'from-rose-500 via-amber-400 to-rose-400',
    note: 'CR-3 Holding Bay'
  }
];

export default function ColdChain() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 300);
  };

  return (
    <div className="min-h-dvh bg-slate-100/70 flex flex-col lg:flex-row font-sans antialiased text-slate-800">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh space-y-6 sm:space-y-8">
        <PageHeader 
          badge="Environmental Auditing"
          badgeIcon={Thermometer}
          title="Cold Chain Telemetry"
          subtitle="Real-time thermal tracking, refrigeration chambers, and transit cargo environmental status."
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* 4 Multi-Color Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mb-8">
          {coreMetrics.map((metric, idx) => {
            const Icon = metric.icon;
            return (
              <div 
                key={idx} 
                className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                {/* Multi-color top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${metric.gradient}`} />

                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {metric.label}
                    </span>
                    <div className={`p-2.5 rounded-2xl border ${metric.iconBg} shadow-2xs group-hover:scale-105 transition-transform duration-200`}>
                      <Icon size={19} />
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                    {metric.value}
                  </h3>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  {metric.alert ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                      <ShieldAlert size={14} /> Attention Required
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                      <CheckCircle2 size={14} /> Standard Range
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-semibold">{metric.note}</span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Active Sensor Node Registry */}
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-50 to-teal-50 text-teal-700 border border-teal-200/60 shadow-2xs">
                <Radio size={22} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Active Sensor Node Registry</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time IoT telemetry from cold chambers and distribution reefers</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200/70 px-3.5 py-1.5 rounded-xl shadow-2xs self-start sm:self-center">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              6 Monitored Terminals
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {facilities.map((fac) => (
              <div 
                key={fac.id} 
                className="relative overflow-hidden bg-white p-5.5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                {/* Top gradient status strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${fac.gradient}`} />

                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs font-mono font-black tracking-wider text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl shadow-2xs">
                      {fac.id}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${fac.tagColor}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        fac.status === 'Optimized' ? 'bg-emerald-500' :
                        fac.status === 'Warning' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      {fac.status}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                    {fac.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mb-5">{fac.type}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center">
                  <div className="flex flex-col items-center p-2 rounded-xl bg-sky-50/50 border border-sky-100/50">
                    <Thermometer size={16} className="text-sky-600 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Temp</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5 font-mono">{fac.temp}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-xl bg-teal-50/50 border border-teal-100/50">
                    <Droplet size={16} className="text-teal-600 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Humidity</span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5 font-mono">{fac.humidity}</span>
                  </div>
                  <div className="flex flex-col items-center p-2 rounded-xl bg-violet-50/50 border border-violet-100/50">
                    <Wind size={16} className="text-violet-600 mb-1" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vent</span>
                    <span className="text-xs sm:text-sm font-extrabold text-emerald-700 mt-0.5">Auto</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}