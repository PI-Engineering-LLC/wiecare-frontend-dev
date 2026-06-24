import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { api } from '@/api/apiClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard, FileText, ShoppingCart, Wrench, GraduationCap, BookOpen,
  FileBox, Shield, Bell, Settings, Users, Building2, Menu, X, LogOut,
  ChevronRight, Package, Search, Plus, HelpCircle, Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { AvatarImg } from "@/components/UserAvatar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePlatformRole } from '@/hooks/usePlatfromRole';
import { useClientRoles } from './hooks/useClientRoles'; 
import { useClient } from './lib/ClientContext';
import { useSocket } from './hooks/useSocket';
import { useAuth } from './lib/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 


// ── CollapsibleGroup) ──────────────────────────────────────────────
function CollapsibleGroup({ label, icon: Icon, items, currentPageName, onNavigate }) {
  const isAnyActive = items.some(i => i.page === currentPageName);
  const [open, setOpen] = useState(isAnyActive);
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 transition-all">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4" />}
          <span>{label}</span>
        </div>
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="mt-1 ml-3 pl-3 border-l border-slate-100 space-y-0.5">
          {items.map((item) => {
            const isActive = currentPageName === item.page;
            return (
              <Link key={item.page} to={createPageUrl(item.page)} onClick={onNavigate}
                className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive ? "bg-[#005f27] text-white shadow-sm" : "text-slate-600 hover:bg-[#edf0be] hover:text-[#005f27]")}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(true);
  const queryClient = useQueryClient();
  const { activeClientId, switchClient } = useClient();
  const { user, logout } = useAuth(); // Use logout from useAuth

  // Determine user's admin status
  const isInternalAdmin = usePlatformRole('super_admin') || usePlatformRole('platform_admin');
  const isClientAdmin = useClientRoles(['client_admin']); // Check if user has 'client_admin' role in active client
  const isCoasterAdmin = isInternalAdmin || isClientAdmin; // Broader admin check for UI purposes
  const navigate = useNavigate();
  // Load unread notifications
  const loadNotifications = async () => {
    try {
      if (!user?.id) return;
      const notifs = await api.getNotifications({ limit: 10, is_read: false }); // Request unread notifications
      setNotifications(notifs);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    }
  };

  useEffect(() => {
    if (user?.id) loadNotifications();
  }, [user?.id, activeClientId]);

  useSocket( (notif) => {
    // onNotification will be called for new notifications
    setNotifications(prev => [notif, ...prev].slice(0, 10)); // Add new notification and keep list limited
    loadNotifications(); // Reload to get updated unread status
  });
  

  const handleLogout = async () => {
    await logout();
  };

  // ── Nav config ────────────────────────────────────────────────
  // These should be dynamic based on the user's specific roles and permissions
  // For simplicity here, still using broad isAdmin/isClientAdmin checks
  const clientNavDirect = [{ name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
    ...(isClientAdmin ? [{ name: 'Org Dashboard', icon: Users, page: 'ClientAdminDashboard' }] : []),
  ];
  const clientNavGroups = [
    { label: 'Orders', icon: FileText, items: [
      { name: 'Quotes', icon: FileText, page: 'Quotes' },
      { name: 'Order Summary', icon: ShoppingCart, page: 'Orders' },
      { name: 'Invoices', icon: FileText, page: 'Invoices' },
    ]},
    { label: 'Operations', icon: Wrench, items: [
      { name: 'Maintenance', icon: Wrench, page: 'Maintenance' },
      { name: 'Warranty Claims', icon: Shield, page: 'WarrantyClaims' },
      { name: 'Training', icon: GraduationCap, page: 'Training' },
    ]},
    { label: 'Learning', icon: BookOpen, items: [
      { name: 'Wie-University', icon: BookOpen, page: 'Courses' },
    ]},
  ];
  const adminNavDirect = [{ name: 'Dashboard', icon: LayoutDashboard, page: 'AdminDashboard' }];
  const adminNavGroups = [
    { label: 'Clients & Users', icon: Users, items: [
      { name: 'Clients', icon: Building2, page: 'AdminClients' },
      { name: 'Users', icon: Users, page: 'AdminUsers' },
    ]},
    { label: 'Orders', icon: FileText, items: [
      { name: 'Quotes', icon: FileText, page: 'AdminQuotes' },
      { name: 'Order Summary', icon: ShoppingCart, page: 'AdminOrders' },
      { name: 'Parts', icon: Package, page: 'AdminParts' },
      { name: 'Invoices', icon: FileText, page: 'AdminInvoices' },
    ]},
    { label: 'Operations', icon: Wrench, items: [
      { name: 'Maintenance', icon: Wrench, page: 'AdminMaintenance' },
      { name: 'Warranty Claims', icon: Shield, page: 'AdminWarranty' },
      { name: 'Training', icon: GraduationCap, page: 'AdminTraining' },
    ]},
    { label: 'Learning', icon: BookOpen, items: [
      { name: 'Courses', icon: BookOpen, page: 'AdminCourses' },
    ]},
    { label: 'System', icon: Bell, items: [
      { name: 'Notifications', icon: Bell, page: 'AdminNotifications' },
    ]},
  ];

  const directItems = isInternalAdmin ? adminNavDirect : clientNavDirect; 
  const navGroups   = isInternalAdmin ? adminNavGroups : clientNavGroups;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-4 flex-shrink-0">
        <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#005f27] to-[#436a36] rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-base">
            <img
              className="aspect-square h-full w-full object-cover"
              alt="Wiegand USA Customer Portal logo"
              src="/wiecare_logo.png"
            />
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base leading-none">Wiegand USA Customer Portal</span>
            {isInternalAdmin && <p className="text-[10px] text-[#005f27] font-semibold mt-0.5">Admin Portal</p>}
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-1">
        {directItems.map((item) => {
          const isActive = currentPageName === item.page;
          return (
            <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setSidebarOpen(false)}
              className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive ? "bg-[#005f27] text-white shadow-sm" : "text-slate-600 hover:bg-[#edf0be] hover:text-[#005f27]")}>
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}

        <div className="pt-2 pb-1 px-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Sections</p>
        </div>

        {navGroups.map((group) => (
          <CollapsibleGroup key={group.label} label={group.label} icon={group.icon}
            items={group.items} currentPageName={currentPageName} onNavigate={() => setSidebarOpen(false)} />
        ))}

        <Link to={createPageUrl(isInternalAdmin ? 'AdminDocuments' : 'Documents')} onClick={() => setSidebarOpen(false)}
          className={cn("flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
            (currentPageName === 'Documents' || currentPageName === 'AdminDocuments')
              ? "bg-[#005f27] text-white shadow-sm"
              : "text-slate-600 hover:bg-[#edf0be] hover:text-[#005f27]")}>
          <FileBox className="h-4 w-4 flex-shrink-0" />Documents
        </Link>
      </nav>

      <div className="px-3 pb-5 flex-shrink-0 space-y-3 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2.5 px-1">
          <AvatarImg avatarKey={user?.avatar_storage_key} fallback={getInitials(user?.full_name)} />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f4f5f0' }}>
      <style>{`
        body { background-color: #f4f5f0; overflow: hidden; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
      `}</style>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:relative z-40 top-0 bottom-0 left-0 flex-shrink-0 bg-white border-r border-slate-100 transition-transform duration-300 lg:translate-x-0 rounded-r-3xl shadow-sm",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )} style={{ width: 270 }}>
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Center column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex-shrink-0 bg-white border-b border-slate-100 px-6 h-[64px] flex items-center gap-4 z-20 shadow-sm">
          <button className="lg:hidden text-slate-500 hover:text-slate-700" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="relative flex-1 max-w-sm">
            {(user?.memberships && user.memberships.length > 1) && (
              <Select value={activeClientId || ''} onValueChange={(val) => switchClient(val)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  {user?.memberships?.map(m => (
                    <SelectItem key={m.clientId} value={m.clientId}>
                      {m.client.company_name}{m.client.coaster_name ? ` · ${m.client.coaster_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(user?.memberships && user.memberships.length === 1) && (
              <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
              {
               (user?.memberships?.find(m => m.clientId === activeClientId)?.client?.company_name?.replace(/_/g, ' ') || '')}
            </p>

            )

            }
            {(user?.platform_role && user?.memberships.length === 0) && (
              <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
             Internal 
            </p>

            )

            }
          </div>

          <div className="hidden md:flex items-center gap-1">
            <Link to={createPageUrl(isInternalAdmin ? 'AdminQuotes' : 'Quotes')}>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-[#005f27] rounded-xl text-xs font-medium h-8">Quotes</Button>
            </Link>
            <Link to={createPageUrl(isInternalAdmin ? 'AdminInvoices' : 'Invoices')}>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-[#005f27] rounded-xl text-xs font-medium h-8">Invoices</Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* Notification bell */}
            <div className="relative xl:hidden">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all relative">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#e2e961] text-[#005f27] rounded-full text-[9px] flex items-center justify-center font-bold leading-none">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-white z-50 shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-[#005f27]" />
                        <h3 className="font-bold text-slate-900 text-base">Notifications</h3>
                        {notifications.length > 0 && (
                          <span className="px-2 py-0.5 bg-[#e2e961] text-[#005f27] rounded-full text-xs font-bold">{notifications.length}</span>
                        )}
                      </div>
                      <button onClick={() => setNotifOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {notifications?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                          <Bell className="h-10 w-10 mb-3 opacity-40" />
                          <p className="text-sm">No new notifications</p>
                        </div>
                      ) : (
                        notifications?.map(notif => (
                          <div key={notif.id}
                            className="px-5 py-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 active:bg-slate-100"
                            onClick={async () => {
                              setNotifOpen(false);
                              queryClient.setQueryData(['notif-panel', user?.id], (old ) => 
                                (Array.isArray(old) ? old : []).filter(item => item.id !== notif.id)
                              );
                              await api.markRead(`${notif.id}`);
                              // loadNotifications();
                              setNotifications(prev => prev.filter(n => n.id !== notif.id));
                              
                              // if (notif.link) window.location.href = notif.link;
                              if (notif.link) navigate(notif.link)
                            }}>
                            <p className="font-semibold text-sm text-slate-800">{notif.title}</p>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-3">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-4 border-t border-slate-100 flex-shrink-0">
                      <Link to={createPageUrl(isInternalAdmin ? 'AdminNotifications' : 'Notifications')} onClick={() => setNotifOpen(false)}>
                        <Button className="w-full bg-[#005f27] hover:bg-[#436a36] text-white rounded-xl text-sm">
                          View all notifications
                        </Button>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link to={createPageUrl('Settings')}>
              <button className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <Settings className="h-4 w-4" />
              </button>
            </Link>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <div className="flex items-center gap-2">
              <AvatarImg avatarKey={user?.avatar_storage_key} fallback={getInitials(user?.full_name)} />

              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-none">{user?.full_name || 'User'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                  {user?.platform_role ? user.platform_role.replace(/_/g, ' ') :
                   (user?.memberships?.find(m => m.clientId === activeClientId)?.roles[0]?.name?.replace(/_/g, ' ') || 'User')}
                </p>
                {/* <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                  {user?.platform_role ? 'Internal' :
                   (user?.memberships?.find(m => m.clientId === activeClientId)?.client?.company_name?.replace(/_/g, ' ') || '')}
                </p> */}
              </div>
            </div>

            <Link to={createPageUrl(isInternalAdmin ? 'AdminQuotes' : 'Quotes')} className="hidden md:block">
              <Button size="sm" className="bg-[#005f27] hover:bg-[#436a36] text-white rounded-xl h-8 px-4 gap-1.5 font-semibold text-xs shadow-sm ml-1">
                <Sparkles className="h-3.5 w-3.5" />
                {isInternalAdmin ? 'Send Quote' : 'Request Quote'}
              </Button>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all text-xs font-medium border border-slate-200 ml-1"
              title="Log out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-full">
            <div className="mb-4 md:mb-6">
              <h1 className="text-lg md:text-xl font-bold text-slate-800 leading-tight">
                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                <span className="text-[#005f27]">{user?.full_name?.split(' ')[0] || 'there'}</span> 👋
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Right activity panel */}
      <aside className={cn(
        "hidden xl:flex flex-col flex-shrink-0 bg-white border-l border-slate-100 overflow-y-auto rounded-l-3xl shadow-sm transition-all duration-300",
        activityOpen ? "w-[340px]" : "w-[52px]"
      )}>
        {activityOpen ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 pt-5 pb-2 flex-shrink-0">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Activity</h2>
                <p className="text-xs text-slate-400">Your latest updates</p>
              </div>
              <button onClick={() => setActivityOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <RightPanel user={user} />
          </div>
        ) : (
          <div className="flex flex-col items-center pt-5">
            <button onClick={() => setActivityOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <Bell className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

// ── RightPanel ────────────────────────────────────────────────────────────────
function RightPanel({ user}) {
  const isInternalAdmin = usePlatformRole('super_admin') || usePlatformRole('platform_admin');
  const { activeClientId } = useClient(); // Corrected to destructure activeClientId
  const queryClient = useQueryClient();

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notif-panel', user?.id],
    queryFn:  () => {
        if (!user?.id) return [];
        return api.getNotifications({ is_read: false, limit: 5 });
      },
    enabled: !!user?.id,
  });

  useSocket(() => refetchNotifications());


  const { data: maintenance = [] } = useQuery({
    queryKey: ['maintenance-panel', activeClientId],
    queryFn: () => api.getMaintenance( { limit: 5, ...(activeClientId ? { client_id: activeClientId } : {}) }
    ),
    enabled: !!user,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoice-panel', activeClientId],
    queryFn: () => api.getInvoices(
        activeClientId ? { limit: 5, client_id: activeClientId } : { limit: 5} // Admin will see all, client only their own
    ),
    enabled: !!user,
  });

  const overdue = invoices.filter(i => i.status === 'overdue');
  const pending = maintenance.filter(m => m.status === 'pending');
  const navigate = useNavigate();
  const handleNotifRead = async (n) => {
    queryClient.setQueryData(['notif-panel', user?.id], (old ) => 
      (Array.isArray(old) ? old : []).filter(item => item.id !== n.id)
    );
    await api.markRead(`${n.id}`);
    if (n.link) navigate(n.link)
  };

  if (isInternalAdmin) return <AdminRightPanel notifications={notifications} maintenance={maintenance} invoices={invoices} overdue={overdue} pending={pending} user={user} onNotifRead={handleNotifRead} />;
  return <ClientRightPanel notifications={notifications} maintenance={maintenance} overdue={overdue} pending={pending} user={user} onNotifRead={handleNotifRead} />;
}

// ── AdminRightPanel & ClientRightPanel ────────────────────────
function AdminRightPanel({ notifications, maintenance, invoices, overdue, pending , user, onNotifRead}) {
  const drafts = invoices.filter(i => i.status === 'draft').length;
  const inProgress = maintenance.filter(m => m.status === 'in_progress').length;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return (
    <div className="p-5 space-y-6 flex-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-amber-50 rounded-2xl p-4">
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
          <p className="text-xs text-amber-700 font-medium mt-0.5">Pending Maintenance</p>
        </div>
        <div className="bg-[#4f7790]/10 rounded-2xl p-4">
          <p className="text-2xl font-bold text-[#4f7790]">{inProgress}</p>
          <p className="text-xs text-[#4f7790] font-medium mt-0.5">In Progress</p>
        </div>
        <div className="bg-[#edf0be] rounded-2xl p-4">
          <p className="text-2xl font-bold text-[#005f27]">{overdue.length}</p>
          <p className="text-xs text-[#436a36] font-medium mt-0.5">Overdue Invoices</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-2xl font-bold text-slate-500">{drafts}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Draft Invoices</p>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Unread Alerts</h3>
        {notifications?.length === 0 ? (
          <div className="text-center py-6 text-slate-300">
            <Bell className="h-7 w-7 mx-auto mb-2 opacity-40" />
            <p className="text-xs">All caught up!</p>
          </div>
        ) :
         notifications?.map(n => (
           <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-[#edf0be]/40 transition-colors cursor-pointer mb-2"
      //      onClick={
      //       // onNotifRead(n)
      //   //     async () => {
      //   //   await api.markRead(`${n.id}`); //is_read: true 
      //   //   // if (n.link) window.location.href = n.link;
      //   //   queryClient.invalidateQueries({ queryKey: ['notif-panel', user?.id] });
      //   //   if (n.link) navigate(n.link)
      //   // }
      // }
      >
             <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
             <div className="min-w-0">
               <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
               <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
             </div>
           </div>
         ))

        }
      </div>
      {maintenance.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Recent Maintenance</h3>
          {maintenance.slice(0, 4).map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                m.status === 'pending' ? "bg-amber-50" : m.status === 'completed' ? "bg-[#005f27]/10" : "bg-[#4f7790]/10")}>
                <Wrench className={cn("h-4 w-4",
                  m.status === 'pending' ? "text-amber-600" : m.status === 'completed' ? "text-[#005f27]" : "text-[#4f7790]")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                <p className="text-xs text-slate-400 capitalize">{m.client_name} · {m.status?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-auto pt-4 border-t border-slate-100">
        <Link to={createPageUrl('AdminNotifications')}>
          <Button variant="ghost" size="sm" className="w-full text-slate-500 rounded-xl text-xs gap-2">
            <Bell className="h-3.5 w-3.5" />All Notifications
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ClientRightPanel({ notifications, maintenance, overdue, pending, user, onNotifRead }) {
  // Use usePlatformRole or useClientRoles to decide what content is visible
  const isClientAdmin = useClientRoles(['client_admin']); // Check if the current user is a client admin
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <div className="p-5 space-y-6 flex-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#edf0be] rounded-2xl p-4">
          <p className="text-2xl font-bold text-[#005f27]">{overdue.length}</p>
          <p className="text-xs text-[#436a36] font-medium mt-0.5">Overdue Invoices</p>
        </div>
        <div className="bg-[#4f7790]/10 rounded-2xl p-4">
          <p className="text-2xl font-bold text-[#4f7790]">{pending.length}</p>
          <p className="text-xs text-[#4f7790] font-medium mt-0.5">Pending Maintenance</p>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Recent Notifications</h3>
        {( notifications && notifications?.length === 0) ? (
          <div className="text-center py-8 text-slate-300">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">All caught up!</p>
          </div>
        ) : notifications?.map(n => (
          <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-[#edf0be]/40 transition-colors cursor-pointer mb-2"
          onClick={
            onNotifRead(n)
          //   async () => {
          //   await api.markRead(`${n.id}`);
          //   queryClient.invalidateQueries({ queryKey: ['notif-panel', user?.id] });
          //   if (n.link) navigate(n.link)
          // }
        }>
            <div className="w-2 h-2 rounded-full bg-[#005f27] flex-shrink-0 mt-1.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
      {maintenance.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">My Maintenance</h3>
          {maintenance.slice(0, 4).map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                m.status === 'pending' ? "bg-amber-50" : m.status === 'completed' ? "bg-[#005f27]/10" : "bg-[#4f7790]/10")}>
                <Wrench className={cn("h-4 w-4",
                  m.status === 'pending' ? "text-amber-600" : m.status === 'completed' ? "text-[#005f27]" : "text-[#4f7790]")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                <p className="text-xs text-slate-400 capitalize">{m.status?.replace(/_/g, ' ')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

       <div className="mt-auto pt-4 border-t border-slate-100">
        <Link to={createPageUrl('Notifications')}>
          <Button variant="ghost" size="sm" className="w-full text-slate-500 rounded-xl text-xs gap-2">
            <Bell className="h-3.5 w-3.5" />All Notifications
          </Button>
        </Link>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-100">
        <Link to={createPageUrl('Settings')}>
          <Button variant="ghost" size="sm" className="w-full text-slate-500 rounded-xl text-xs gap-2">
            <Settings className="h-3.5 w-3.5" />Account Settings
          </Button>
        </Link>
      </div>
    </div>
  );
}