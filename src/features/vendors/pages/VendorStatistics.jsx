import { useState } from 'react';
import Sidebar from '../../../layouts/Sidebar';
import PageHeader from '../../../components/common/PageHeader';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Package,
  Percent,
  CheckCircle2,
  Clock,
  Store,
  Users,
  ShoppingBag,
  Star,
  ArrowRight
} from 'lucide-react';

const VENDOR_STATS = [
  { 
    label: 'Total Active Vendors', 
    value: '248', 
    change: '+12.5%', 
    up: true,
    accentColor: 'bg-emerald-600',
    iconBg: 'bg-emerald-50 text-emerald-700',
    tagColor: 'text-emerald-700 bg-emerald-50/80 border-emerald-200/80',
    icon: Store
  },
  { 
    label: 'Avg Vendor Rating', 
    value: '4.85', 
    change: '+0.4%', 
    up: true,
    accentColor: 'bg-teal-600',
    iconBg: 'bg-teal-50 text-teal-700',
    tagColor: 'text-teal-700 bg-teal-50/80 border-teal-200/80',
    icon: Star
  },
  { 
    label: 'Total Orders Handled', 
    value: '18,420', 
    change: '+22.1%', 
    up: true,
    accentColor: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-700',
    tagColor: 'text-emerald-700 bg-emerald-50/80 border-emerald-200/80',
    icon: ShoppingBag
  },
  { 
    label: 'Order Fulfillment Rate', 
    value: '96.8%', 
    change: '-0.5%', 
    up: false,
    accentColor: 'bg-green-700',
    iconBg: 'bg-green-50 text-green-700',
    tagColor: 'text-rose-700 bg-rose-50/80 border-rose-200/80',
    icon: Users
  }
];

const VENDOR_CATEGORIES = [
  { source: 'Organic Produce', amount: '112 Vendors', share: '45.1%', status: 'Active', trendUp: true, percentage: 45.1 },
  { source: 'Dairy & Poultry', amount: '58 Vendors', share: '23.3%', status: 'Growing', trendUp: true, percentage: 23.3 },
  { source: 'Hydroponics & Exotic', amount: '42 Vendors', share: '16.9%', status: 'Stable', trendUp: false, percentage: 16.9 },
  { source: 'Herbs & Spices', amount: '36 Vendors', share: '14.7%', status: 'Stable', trendUp: true, percentage: 14.7 }
];

const TOP_VENDORS = [
  { id: 'VND-1021', name: 'Organic Valley Farms', category: 'Organic Produce', orders: '1,420', rating: '4.9', sales: '₹1,24,800.00', status: 'Active' },
  { id: 'VND-1022', name: 'Greenhouse Co-op', category: 'Hydroponics', orders: '980', rating: '4.8', sales: '₹83,205.00', status: 'Active' },
  { id: 'VND-1023', name: 'Sunshine Orchards', category: 'Fruits', orders: '1,150', rating: '4.7', sales: '₹1,51,000.00', status: 'Active' },
  { id: 'VND-1024', name: 'Purely Plants Co.', category: 'Herbs & Spices', orders: '410', rating: '4.5', sales: '₹48,900.00', status: 'Pending Review' },
  { id: 'VND-1025', name: 'Evergreen Hydroponics', category: 'Hydroponics', orders: '870', rating: '4.9', sales: '₹91,500.00', status: 'Active' },
  { id: 'VND-1026', name: 'Valley Herbals LLC', category: 'Herbs', orders: '310', rating: '4.6', sales: '₹34,100.00', status: 'Pending Review' }
];

export default function VendorStatistics() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 250);
  };

  return (
    <div className="min-h-dvh bg-slate-100/70 flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-500 selection:text-white">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh w-full space-y-6 sm:space-y-8">
        
        {/* Modern Executive Header */}
        <PageHeader 
          badge="Partner Analytics"
          badgeIcon={Store}
          title="Vendor Statistics"
          subtitle="Merchant onboardings, live inventory status, store order volumes, and fulfillment reliability."
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {VENDOR_STATS.map((stat, idx) => {
            const IconComponent = stat.icon;
            return (
              <div 
                key={idx}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between group cursor-pointer"
              >
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${stat.accentColor}`} />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-semibold text-black uppercase tracking-wider group-hover:text-emerald-700">
                      {stat.label}
                    </span>
                    <div 
                      className={`${stat.iconBg} p-2.5 rounded-2xl shadow-xs`}
                    >
                      <IconComponent size={18} />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl sm:text-3xl font-semibold text-black tracking-tight font-mono group-hover:text-emerald-800">
                    {stat.value}
                  </h3>
                </div>
                
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between relative z-10">
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${stat.tagColor}`}>
                    {stat.up ? (
                      <ArrowUpRight size={13} className="text-emerald-600" />
                    ) : (
                      <ArrowDownRight size={13} className="text-rose-600" />
                    )}
                    {stat.change}
                  </span>
                  <span className="text-[11px] text-black font-semibold">Monthly Period</span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Dynamic Breakdown & Vendor Tables */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Vendor Category Breakdown */}
          <div 
            className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                  <Percent size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-black tracking-tight">Category Share</h2>
                  <p className="text-xs font-semibold text-black">Vendor distribution by category</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {VENDOR_CATEGORIES.map((category, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-white hover:border-emerald-200 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-black group-hover:text-emerald-700">{category.source}</span>
                      <span className="text-[10px] font-semibold bg-white border border-slate-200 text-black px-2.5 py-0.5 rounded-full shadow-2xs">
                        {category.share}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200/70 rounded-full h-1.5 mb-3 overflow-hidden">
                      <div 
                        style={{ width: `${category.percentage}%` }}
                        className={`h-full rounded-full ${category.trendUp ? 'bg-emerald-600' : 'bg-slate-400'}`}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-semibold text-black">{category.amount}</span>
                      <span className={`flex items-center gap-1 text-[11px] font-semibold ${category.trendUp ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {category.trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {category.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div 
            className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                    <Package size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-black tracking-tight">Top Performing Vendors</h2>
                    <p className="text-xs font-semibold text-black">Active seller performance matrix</p>
                  </div>
                </div>
                
                <button 
                  type="button"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 px-3.5 py-2 rounded-xl transition-colors self-start sm:self-auto cursor-pointer group"
                >
                  <span>Export Vendors</span>
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {/* Desktop Dynamic Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[760px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase font-semibold tracking-wider text-black bg-slate-50/80">
                      <th className="py-3.5 px-3 rounded-l-xl">Vendor ID</th>
                      <th className="py-3.5 px-3">Vendor Name</th>
                      <th className="py-3.5 px-3">Category</th>
                      <th className="py-3.5 px-3 text-center">Orders</th>
                      <th className="py-3.5 px-3">Gross Sales</th>
                      <th className="py-3.5 px-3 text-right rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {TOP_VENDORS.map((vendor, idx) => (
                      <tr 
                        key={idx}
                        className="text-xs font-semibold text-black hover:bg-emerald-50/40 group cursor-pointer"
                      >
                        <td className="py-3.5 px-3 font-mono text-black font-semibold group-hover:text-emerald-700 transition-colors">{vendor.id}</td>
                        <td className="py-3.5 px-3 font-semibold text-black group-hover:translate-x-1 group-hover:text-emerald-700 transition-all duration-200">{vendor.name}</td>
                        <td className="py-3.5 px-3 font-semibold text-slate-600">{vendor.category}</td>
                        <td className="py-3.5 px-3 font-mono text-center text-black">{vendor.orders}</td>
                        <td className="py-3.5 px-3 font-mono text-emerald-700 font-semibold">{vendor.sales}</td>
                        <td className="py-3.5 px-3 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${
                            vendor.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs'
                              : 'bg-amber-50 text-amber-700 border-amber-200/80 shadow-2xs'
                          }`}>
                            {vendor.status === 'Active' ? (
                              <CheckCircle2 size={12} className="text-emerald-600" />
                            ) : (
                              <Clock size={12} className="text-amber-600" />
                            )}
                            {vendor.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden space-y-3">
                {TOP_VENDORS.map((vendor, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-black font-semibold">{vendor.id}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        vendor.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {vendor.status === 'Active' ? (
                          <CheckCircle2 size={11} className="text-emerald-600" />
                        ) : (
                          <Clock size={11} className="text-amber-600" />
                        )}
                        {vendor.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-black group-hover:text-emerald-700 transition-colors duration-200">{vendor.name}</h4>
                      <p className="text-xs text-slate-500">{vendor.category}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-black block">Orders</span>
                        <span className="font-mono font-semibold text-black">{vendor.orders}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-black block">Rating</span>
                        <span className="font-mono font-semibold text-black">{vendor.rating} ★</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-black block">Gross Sales</span>
                        <span className="font-mono font-semibold text-emerald-700">{vendor.sales}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}