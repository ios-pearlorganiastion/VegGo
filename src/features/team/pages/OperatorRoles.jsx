import { useState, useMemo } from 'react';
import Sidebar from '../../../layouts/Sidebar';
import PageHeader from '../../../components/common/PageHeader';
import { 
  Users, 
  Search, 
  Plus, 
  Shield, 
  ShieldAlert, 
  Mail, 
  MapPin, 
  SlidersHorizontal,
  ChevronRight,
  Radio,
  CheckCircle2
} from 'lucide-react';

const OPERATORS = [
  {
    id: '#OP-9012',
    name: 'John Doe',
    email: 'j.doe@veggofresh.com',
    role: 'Primary Director',
    status: 'Active',
    zone: 'All Facilities',
    lastActive: 'Just now',
    securityLevel: 'Tier 1 Admin',
    initials: 'JD',
    activity: 'Adjusted thermal bounds for Cold Room B'
  },
  {
    id: '#OP-4412',
    name: 'Sarah Jenkins',
    email: 's.jenkins@veggofresh.com',
    role: 'Cold Room Manager',
    status: 'Active',
    zone: 'Zone A & B',
    lastActive: '4 mins ago',
    securityLevel: 'Tier 2 Manager',
    initials: 'SJ',
    activity: 'Logged daily ambient temperature audits'
  },
  {
    id: '#OP-3310',
    name: 'Marcus Vance',
    email: 'm.vance@veggofresh.com',
    role: 'Logistics Supervisor',
    status: 'On Break',
    zone: 'Dispatch Terminal',
    lastActive: '32 mins ago',
    securityLevel: 'Tier 2 Manager',
    initials: 'MV',
    activity: 'Authorized dispatch for Green Grocers Inc.'
  },
  {
    id: '#OP-1108',
    name: 'Elena Rostova',
    email: 'e.rostova@veggofresh.com',
    role: 'Inbound Specialist',
    status: 'Active',
    zone: 'Loading Docks',
    lastActive: '12 mins ago',
    securityLevel: 'Tier 3 Operator',
    initials: 'ER',
    activity: 'Registered incoming batch of Sweet Potatoes'
  },
  {
    id: '#OP-8890',
    name: 'David Kim',
    email: 'd.kim@veggofresh.com',
    role: 'Compliance Inspector',
    status: 'Offline',
    zone: 'Quality Labs',
    lastActive: '2 hours ago',
    securityLevel: 'Tier 2 Auditor',
    initials: 'DK',
    activity: 'Completed weekly biological safety review'
  }
];

const ROLES_LIST = ['All', 'Primary Director', 'Cold Room Manager', 'Logistics Supervisor', 'Inbound Specialist', 'Compliance Inspector'];

export default function OperatorRoles() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const filteredOperators = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return OPERATORS.filter((op) => {
      const matchesSearch = !q ||
        op.name.toLowerCase().includes(q) || 
        op.email.toLowerCase().includes(q) ||
        op.id.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'All' || op.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [searchQuery, roleFilter]);

  return (
    <div className="min-h-dvh bg-slate-100/70 flex flex-col lg:flex-row font-sans antialiased text-slate-800">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh space-y-6 sm:space-y-8">
        <PageHeader 
          badge="Access Management"
          badgeIcon={Shield}
          title="Operator Roles & Security"
          subtitle="Provision admin accounts, manage credential tiers, and govern permission boundaries."
          onRefresh={() => window.location.reload()}
          actions={
            <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all">
              <Plus size={16} />
              <span>Provision New Role</span>
            </button>
          }
        />

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate">Total Crew Members</span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">5 Operators</h3>
            </div>
            <div className="p-3 sm:p-3.5 bg-slate-50 rounded-xl text-slate-600 border border-slate-100 shrink-0">
              <Users size={20} />
            </div>
          </div>
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate">System Sessions</span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">3 Online Now</h3>
            </div>
            <div className="p-3 sm:p-3.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 shrink-0">
              <Radio size={20} />
            </div>
          </div>
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate">Policy Enforcement</span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Tiered Auth</h3>
            </div>
            <div className="p-3 sm:p-3.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/50 shrink-0">
              <Shield size={20} />
            </div>
          </div>
        </section>

        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search operators by name, email or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <SlidersHorizontal size={16} className="text-slate-400 shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-white border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all max-w-[200px] truncate"
              >
                {ROLES_LIST.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50/30">
                  <th className="py-4 px-6">Operator Profiles</th>
                  <th className="py-4 px-6">Assigned Domain</th>
                  <th className="py-4 px-6">Security Permissions</th>
                  <th className="py-4 px-6">Recent Interaction Log</th>
                  <th className="py-4 px-6 text-right">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOperators.map((operator) => (
                  <tr key={operator.id} className="group hover:bg-slate-50/30 transition-all">
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-sm tracking-wide shrink-0">
                          {operator.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{operator.name}</span>
                            <span className="text-[10px] bg-slate-100 font-bold text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                              {operator.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 truncate">
                            <Mail size={12} className="shrink-0" />
                            <span className="truncate">{operator.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-1.5 text-slate-700 text-sm font-medium">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span>{operator.zone}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-1">{operator.role}</span>
                    </td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${
                        operator.securityLevel.includes('Admin') 
                          ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100' 
                          : 'bg-slate-100/60 text-slate-700 border-slate-200'
                      }`}>
                        {operator.securityLevel.includes('Admin') ? <ShieldAlert size={12} /> : <Shield size={12} />}
                        {operator.securityLevel}
                      </span>
                    </td>
                    <td className="py-5 px-6 max-w-xs">
                      <p className="text-xs font-medium text-slate-600 truncate">{operator.activity}</p>
                      <span className="text-[10px] text-slate-400 block mt-1">{operator.lastActive}</span>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                        operator.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        operator.status === 'On Break' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          operator.status === 'Active' ? 'bg-emerald-500' :
                          operator.status === 'On Break' ? 'bg-amber-500' : 'bg-slate-300'
                        }`} />
                        {operator.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden p-4 space-y-3">
            {filteredOperators.map((operator) => (
              <div 
                key={operator.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-sm shrink-0">
                      {operator.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{operator.name}</span>
                        <span className="text-[9px] bg-slate-100 font-bold text-slate-500 px-1.5 py-0.5 rounded">
                          {operator.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{operator.role}</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    operator.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    operator.status === 'On Break' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      operator.status === 'Active' ? 'bg-emerald-500' :
                      operator.status === 'On Break' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    {operator.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Domain</span>
                    <span className="font-semibold text-slate-700 text-xs mt-0.5 block truncate">{operator.zone}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Security Tier</span>
                    <span className="font-semibold text-emerald-700 text-xs mt-0.5 block truncate">{operator.securityLevel}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span className="truncate max-w-[65%]">{operator.activity}</span>
                  <span className="text-slate-400 text-[10px]">{operator.lastActive}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-8">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 md:p-8">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Global Access Policy</h2>
            <p className="text-xs text-slate-400 mb-6">Security protocols and validation states currently in effect</p>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800">Multi-Factor Hardware Key</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">All operations directors require verified physical passkeys for parameter changes.</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md shrink-0">Active</span>
              </div>
              <div className="flex items-start justify-between gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-100">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800">Geo-Fenced Operations</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">Limit supervisor credentials to specific zones and internal facility subnet ranges.</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md shrink-0">Active</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-5 sm:p-6 md:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">Session Audit Log</h2>
              <p className="text-xs text-slate-400 mb-6">Recent platform events related to operational credentials</p>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-emerald-50 rounded-full text-emerald-600 mt-0.5 shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">John Doe completed key validation</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">10 mins ago • 192.168.1.42</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-emerald-50 rounded-full text-emerald-600 mt-0.5 shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">Sarah Jenkins re-synchronized sensors</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">22 mins ago • 192.168.1.18</span>
                  </div>
                </div>
              </div>
            </div>
            <button className="w-full flex items-center justify-between mt-8 p-3 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100/85 rounded-xl border border-slate-200/50 transition-colors">
              <span>View Full System Audit Trail</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}