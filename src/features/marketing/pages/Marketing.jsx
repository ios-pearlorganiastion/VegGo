import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../../layouts/Sidebar';
import SegmentedTabs from '../../../components/common/SegmentedTabs';
import { ROUTES } from '../../../constants/routes.constants';
import { Ticket, Image as ImageIcon } from 'lucide-react';

const Coupons = lazy(() => import('./Coupons'));
const Banners = lazy(() => import('./Banners'));

const TAB_ROUTES = {
  coupons: ROUTES.COUPONS,
  banners: ROUTES.BANNERS,
};

const marketingTabs = [
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'banners', label: 'Banners', icon: ImageIcon },
];

export default function Marketing({ defaultTab = 'coupons' }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-[#f6f9f7] flex flex-col lg:flex-row font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar />

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-22 lg:pt-22 overflow-y-auto max-h-dvh w-full space-y-5 sm:space-y-6">
        <div className="bg-white p-2 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <SegmentedTabs
            tabs={marketingTabs}
            activeTab={defaultTab}
            onTabChange={(tabId) => navigate(TAB_ROUTES[tabId] || ROUTES.COUPONS)}
          />
        </div>

        {defaultTab === 'coupons' && (
          <Suspense fallback={<div className="py-16 text-center text-slate-400 font-semibold text-xs">Loading coupons...</div>}>
            <Coupons />
          </Suspense>
        )}
        {defaultTab === 'banners' && (
          <Suspense fallback={<div className="py-16 text-center text-slate-400 font-semibold text-xs">Loading banners...</div>}>
            <Banners />
          </Suspense>
        )}
      </main>
    </div>
  );
}
