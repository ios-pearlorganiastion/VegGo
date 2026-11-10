import React, { useEffect, useState, startTransition } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Leaf,
  LayoutDashboard,
  Package,
  Settings,
  Wallet,
  ChevronDown,
  ChevronUp,
  LogOut,
  Menu,
  X,
  Users,
  ShieldCheck,
  Dot,
  Store,
  Bike,
  User,
  Tag,
  Layers,
  MessageSquareWarning,
  Megaphone,
  Ticket,
  Image as ImageIcon
} from "lucide-react";
import LogoutModal from "../components/common/LogoutModal";
import { clearAuthSession } from "../utils/auth";
import { ROUTES } from "../constants/routes.constants";

const menuGroups = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    color: "text-emerald-700",
    bgHover: "group-hover/item:text-emerald-800",
    path: ROUTES.DASHBOARD,
    subItems: [],
  },
  {
    id: "management",
    label: "Management",
    icon: Users,
    color: "text-emerald-700",
    bgHover: "group-hover/item:text-emerald-800",
    path: ROUTES.VENDORS,
    subItems: [
      {
        id: "management-vendors",
        label: "Vendors",
        path: ROUTES.VENDORS,
        icon: Store,
        color: "text-emerald-600",
      },
      {
        id: "management-delivery",
        label: "Delivery",
        path: ROUTES.DELIVERY,
        icon: Bike,
        color: "text-emerald-600",
      },
      {
        id: "management-customers",
        label: "Customers",
        path: ROUTES.CUSTOMERS,
        icon: User,
        color: "text-emerald-600",
      },
    ],
  },
  {
    id: "products",
    label: "Inventory & Catalog",
    icon: Package,
    color: "text-emerald-700",
    bgHover: "group-hover/item:text-emerald-800",
    path: ROUTES.CATEGORIES,
    subItems: [
      {
        id: "products-categories",
        label: "Categories",
        path: ROUTES.CATEGORIES,
        icon: Layers,
        color: "text-emerald-600",
      },
      {
        id: "products-subcategories",
        label: "Subcategories",
        path: ROUTES.SUBCATEGORIES,
        icon: Tag,
        color: "text-emerald-600",
      },
      {
        id: "products-all",
        label: "All Products",
        path: ROUTES.PRODUCTS,
        icon: Package,
        color: "text-emerald-600",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    color: "text-emerald-700",
    bgHover: "group-hover/item:text-emerald-800",
    path: ROUTES.COUPONS,
    subItems: [
      {
        id: "marketing-coupons",
        label: "Coupons",
        path: ROUTES.COUPONS,
        icon: Ticket,
        color: "text-emerald-600",
      },
      {
        id: "marketing-banners",
        label: "Banners",
        path: ROUTES.BANNERS,
        icon: ImageIcon,
        color: "text-emerald-600",
      },
    ],
  },
  {
    id: "payouts",
    label: "Payouts & Wallet",
    icon: Wallet,
    color: "text-emerald-700",
    bgHover: "group-hover/item:text-emerald-800",
    path: ROUTES.WALLET,
    subItems: [],
  },
  {
    id: "complaints",
    label: "Complaints",
    icon: MessageSquareWarning,
    color: "text-emerald-700",
    bgHover: "group-hover/item:text-emerald-800",
    path: ROUTES.COMPLAINTS,
    subItems: [],
  },
  {
    id: "settings",
    label: "System Settings",
    icon: Settings,
    color: "text-emerald-700",
    bgHover: "group-hover/item:text-emerald-800",
    path: ROUTES.SETTINGS,
    subItems: [],
  },
];


function getActiveGroupForPath(pathname) {
  const active = menuGroups.find((group) =>
    group.subItems.some((subItem) => pathname === subItem.path || pathname.startsWith(subItem.path)) ||
    (group.id === "management" && pathname.startsWith("/management")) ||
    (group.id === "products" && pathname.startsWith("/products")) ||
    (group.id === "marketing" && pathname.startsWith("/marketing"))
  );
  return active ? active.id : null;
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false); // Mobile drawer open state
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("veggo_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isEffectiveCollapsed = !isMobile && isCollapsed;

  const [expandedGroup, setExpandedGroup] = useState(() => {
    return getActiveGroupForPath(location.pathname);
  });
  const [prevPath, setPrevPath] = useState(location.pathname);

  // Auto-expand active group when route changes without cascading effect renders
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    const active = getActiveGroupForPath(location.pathname);
    if (active && active !== expandedGroup) {
      setExpandedGroup(active);
    }
  }

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const updateExpandedGroup = (groupId) => {
    setExpandedGroup(groupId);
  };

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("veggo_sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleGroupToggle = (group) => {
    if (!group.subItems.length) {
      setIsOpen(false);
      startTransition(() => {
        navigate(group.path);
      });
      return;
    }

    if (isEffectiveCollapsed) {
      setIsCollapsed(false);
      localStorage.setItem("veggo_sidebar_collapsed", "false");
      updateExpandedGroup(group.id);
      return;
    }

    updateExpandedGroup(expandedGroup === group.id ? null : group.id);
  };

  const handleSubItemClick = (path) => {
    setIsOpen(false);
    startTransition(() => {
      navigate(path);
    });
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = () => {
    clearAuthSession();
    setIsLogoutModalOpen(false);
    startTransition(() => {
      navigate("/login");
    });
  };

  return (
    <>
      {/* 1. Full-Width Top Navigation Bar (Sign-In page luminous aesthetic) */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-white/95 backdrop-blur-xl border-b border-emerald-100/90 text-slate-800 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Top multi-color gradient line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400" />

        {/* Left: VegGo Brand Logo & Hamburger */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div
            onClick={() => {
              startTransition(() => {
                navigate("/dashboard");
              });
            }}
            className="flex items-center gap-3 cursor-pointer select-none group"
            title="VegGoFresh Admin Platform"
          >
            {/* Gradient Rounded Box with Leaf Logo */}
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/25 group-hover:scale-105 transition-transform shrink-0">
              <Leaf size={18} className="drop-shadow-xs" />
            </div>

            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">
                VegGo<span className="text-emerald-600 font-extrabold">Fresh</span>
              </span>
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-widest block -mt-0.5">
                Admin Console
              </span>
            </div>
          </div>

          {/* Hamburger Menu Icon */}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsOpen((prev) => !prev);
              } else {
                toggleCollapse();
              }
            }}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all cursor-pointer ml-1"
            title="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Right: Circular User Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/70 border border-emerald-200/80 transition-all cursor-pointer shadow-2xs group"
              title="Admin Profile"
            >
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                SA
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-800 block leading-tight">Super Admin</span>
                <span className="text-[10px] font-semibold text-emerald-700 block">Console Online</span>
              </div>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-transform" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <>
                <div
                  onClick={() => setIsProfileOpen(false)}
                  className="fixed inset-0 z-40"
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">Administrator</p>
                    <p className="text-[11px] text-slate-500 truncate">admin@veggofresh.com</p>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        startTransition(() => {
                          navigate("/settings");
                        });
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <ShieldCheck size={15} className="text-emerald-600" />
                      Settings & Security
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleLogoutClick();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-2"
                    >
                      <LogOut size={15} />
                      Logout Session
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Backdrop for Mobile Drawer */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* 2. Fixed Left Sidebar with Sign-In Light Aesthetic */}
      <aside
        className={`fixed top-16 left-0 bottom-0 z-40 bg-white/95 backdrop-blur-2xl border-r border-emerald-100/90 text-slate-800 flex flex-col transition-all duration-150 ease-out shadow-sm lg:translate-x-0 overflow-x-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${isEffectiveCollapsed ? "w-20" : "w-72 max-w-[85vw] lg:w-64"}`}
      >
        {/* Mobile Drawer Top Bar */}
        <div className="flex lg:hidden items-center justify-between px-4 py-3 border-b border-emerald-100 bg-emerald-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs">
              <Leaf size={16} />
            </div>
            <span className="text-sm font-black text-slate-900">
              VegGo<span className="text-emerald-600 font-extrabold">Fresh</span>
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav
          className={`flex-1 py-5 space-y-1.5 overflow-x-hidden ${
            isEffectiveCollapsed
              ? "px-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "px-3.5 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-100 scrollbar-track-transparent"
          }`}
        >
          {menuGroups.map((group) => {
            const isExpanded = expandedGroup === group.id;

            const isDirectSelected =
              location.pathname === group.path ||
              (group.id === "products" && location.pathname.startsWith("/products")) ||
              (group.id === "payouts" && location.pathname.startsWith("/payouts")) ||
              (group.id === "complaints" && location.pathname.startsWith("/complaints")) ||
              (group.id === "settings" && location.pathname.startsWith("/settings")) ||
              (group.id === "dashboard" && location.pathname === "/dashboard");
            const hasActiveSub = group.subItems.some(
              (subItem) => location.pathname === subItem.path || location.pathname.startsWith(subItem.path)
            );
            const isSelected = isDirectSelected || hasActiveSub;
            const isGroupExpanded = isExpanded && group.subItems.length > 0 && !isEffectiveCollapsed;

            const GroupIcon = group.icon;

            return (
              <div key={group.id} className="relative group/item space-y-1">
                <button
                  onClick={() => handleGroupToggle(group)}
                  title={isEffectiveCollapsed ? group.label : undefined}
                  className={`w-full flex items-center rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isEffectiveCollapsed
                      ? "justify-center p-3"
                      : "justify-between px-3.5 py-2.5"
                  } ${
                    isSelected && group.subItems.length === 0
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-600/20"
                      : isGroupExpanded || (isSelected && group.subItems.length > 0)
                      ? "bg-emerald-50/90 text-emerald-800 font-bold border border-emerald-200/80"
                      : "text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/60"
                  }`}
                >
                  <div className={`flex items-center ${isEffectiveCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className={`shrink-0 transition-transform group-hover/item:scale-110 ${
                      isSelected && group.subItems.length === 0
                        ? "text-white"
                        : isGroupExpanded || isSelected
                        ? "text-emerald-700"
                        : (group.color || "text-slate-500")
                    }`}>
                      <GroupIcon size={19} />
                    </div>

                    {!isEffectiveCollapsed && <span>{group.label}</span>}
                  </div>

                  {!isEffectiveCollapsed && group.subItems.length > 0 &&
                    (isExpanded ? (
                      <ChevronUp size={16} className="text-emerald-700 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className={isSelected ? "text-emerald-700 shrink-0" : "text-slate-400 shrink-0"} />
                    ))}
                </button>

                {/* Submenu Accordion when Expanded */}
                {!isEffectiveCollapsed && group.subItems.length > 0 && (
                  <div
                    className={`ml-5 pl-3 border-l-2 border-emerald-200/80 space-y-1 my-1 transition-all duration-150 ease-in-out overflow-hidden ${
                      isExpanded
                        ? "max-h-96 opacity-100 py-1"
                        : "max-h-0 opacity-0 pointer-events-none"
                    }`}
                  >
                    {group.subItems.map((subItem) => {
                      const isSubSelected = location.pathname === subItem.path;
                      const SubIcon = subItem.icon;

                      return (
                        <button
                          key={subItem.id}
                          onClick={() => handleSubItemClick(subItem.path)}
                          className={`w-full text-left px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-between ${
                            isSubSelected
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-sm shadow-emerald-600/20"
                              : "text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/70"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <SubIcon size={15} className={isSubSelected ? "text-white" : (subItem.color || "text-emerald-600")} />
                            <span>{subItem.label}</span>
                          </div>
                          {isSubSelected && <Dot size={18} className="text-emerald-200 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer Logout Button */}
        <div className={`border-t border-slate-100 shrink-0 ${isEffectiveCollapsed ? 'p-2' : 'p-3.5'}`}>
          <button
            onClick={handleLogoutClick}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-600 hover:text-white border border-rose-200/60 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-rose-600/20 ${
              isEffectiveCollapsed ? 'p-3' : 'px-3.5 py-2.5'
            }`}
            title="Logout Session"
          >
            <LogOut size={16} />
            {!isEffectiveCollapsed && <span>Logout Session</span>}
          </button>
        </div>
      </aside>

      {/* 3. Desktop Column Spacer */}
      <div
        className="hidden lg:block shrink-0 transition-[width] duration-150"
        style={{ width: isEffectiveCollapsed ? "5rem" : "16rem" }}
      />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}

export default React.memo(Sidebar);