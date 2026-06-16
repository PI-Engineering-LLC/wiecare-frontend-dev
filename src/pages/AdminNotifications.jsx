import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Bell, Send, Trash2, CheckCircle2, AlertTriangle, Info, XCircle, Megaphone, FileText, Wrench, GraduationCap, ShoppingCart, Shield, Settings, MailCheck } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import { formatDistanceToNow } from 'date-fns';

import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext'; 
import { Switch } from '@/components/ui/switch';

const categoryConfig = {
  quote:       { icon: FileText,       color: 'text-violet-600', bg: 'bg-violet-50',  label: 'Quote'       },
  invoice:     { icon: FileText,       color: 'text-rose-600',   bg: 'bg-rose-50',    label: 'Invoice'     },
  maintenance: { icon: Wrench,         color: 'text-amber-600',  bg: 'bg-amber-50',   label: 'Maintenance' },
  training:    { icon: GraduationCap,  color: 'text-emerald-600',bg: 'bg-emerald-50', label: 'Training'    },
  order:       { icon: ShoppingCart,   color: 'text-blue-600',   bg: 'bg-blue-50',    label: 'Order'       },
  warranty:    { icon: Shield,         color: 'text-cyan-600',   bg: 'bg-cyan-50',    label: 'Warranty'    },
  system:      { icon: Settings,       color: 'text-slate-600',  bg: 'bg-slate-50',   label: 'System'      },
  general:     { icon: Bell,           color: 'text-slate-500',  bg: 'bg-slate-50',   label: 'General'     },
};

const typeIcon = {
  success:      <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  warning:      <AlertTriangle className="h-4 w-4 text-amber-500" />,
  error:        <XCircle className="h-4 w-4 text-rose-500" />,
  announcement: <Megaphone className="h-4 w-4 text-violet-500" />,
  info:         <Info className="h-4 w-4 text-blue-400" />,
  reminder:     <Bell className="h-4 w-4 text-blue-400" />,
};

export default function AdminNotifications() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [sendType, setSendType] = useState('client'); // Default to sending to a client
  const [formData, setFormData] = useState({ title: '', message: '', type: 'info', category: 'general', recipient_id: '', client_id: '' });

  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => api.getNotifications( { order: '-created_at', limit: 300}),
  });

  const { data: usersData = { users: [] } } = useQuery({ 
    queryKey: ['all-users-for-admin-notifs'],
    queryFn: () => api.getUsers({ order:'full_name', limit: 500}), 
  });
  const users = usersData?.users ?? []; 

  const { data: clients = [] } = useQuery({
    queryKey: ['all-clients-for-admin-notifs'],
    queryFn: () => api.getClients({ order: 'company_name', limit: 200}),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteNotif(id),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications']});
        toast.success('Notification deleted');
    },
    onError: (error) => {
        console.error('Failed to delete notification:', error);
        toast.error(`Failed to delete notification: ${error.response?.data?.error || error.message}`);
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Common notification fields
      const commonData = {
        title: data.title,
        message: data.message,
        type: data.type,
        category: data.category,
        link: data.link, 
        is_email_sent: data.is_email_sent || false, 
      };

      if (sendType === 'client') {
        if (!data.client_id) { throw new Error('Client must be selected'); }
        return api.createClientNotifications({ ...commonData, client_id: data.client_id });
      } else { // sendType === 'user'
        if (!data.recipient_id) { throw new Error('User must be selected'); }
        const recipientUser = users.find(u => u.id === data.recipient_id);
        return api.createNotifications({ ...commonData, recipient_id: data.recipient_id, recipient_email: recipientUser?.email, client_id: recipientUser?.memberships?.[0]?.client_id }); // Pass client_id from user's membership if available
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications']});
      setShowDialog(false);
      resetForm();
      toast.success('Notification sent');
    },
    onError: (error) => {
        console.error('Failed to send notification:', error);
        toast.error(`Failed to send notification: ${error.response?.data?.error || error.message}`);
    }
  });

  const resetForm = () => {
    setFormData({ title: '', message: '', type: 'info', category: 'general', recipient_id: '', client_id: '' });
    setSendType('client');
  };

  const filtered = notifications.filter(n => {
    const matchSearch = n.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        n.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        n.recipient_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'all' || n.category === categoryFilter;
    return matchSearch && matchCat;
  });

  // Stats
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const todayCount = notifications.filter(n => {
    const d = new Date(n.created_at); 
    const today = new Date();
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  }).length;

  return (
    <AdminOnly>
      <div className="space-y-6">
        <PageHeader
          title="Notification Center"
          subtitle="Monitor all system notifications and send announcements"
          actions={
            <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-[#1e3a5f] hover:bg-[#2d5a8a]">
              <Plus className="h-4 w-4 mr-2" /> Send Notification
            </Button>
          }
        />

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: notifications.length, color: 'text-slate-700', bg: 'bg-white' },
            { label: 'Unread', value: unreadCount, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Today', value: todayCount, color: 'text-[#005f27]', bg: 'bg-[#edf0be]' },
            { label: 'Read Rate', value: notifications.length ? `${Math.round(((notifications.length - unreadCount) / notifications.length) * 100)}%` : '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <Card key={s.label} className={`border-0 shadow-sm ${s.bg}`}>
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search notifications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        {filtered.length === 0 && !isLoading ? (
          <EmptyState icon={Bell} title="No notifications" description="System notifications will appear here automatically" action={() => { resetForm(); setShowDialog(true); }} actionLabel="Send Notification" />
        ) : (
          <div className="space-y-2">
            {filtered.map(n => {
              const cat = categoryConfig[n.category] || categoryConfig.general;
              const CatIcon = cat.icon;
              const recipient = users.find(u => u.id === n.recipient_id); // Find recipient user for display
              const client = clients.find(c => c.id === n.client_id); // Find client for display

              return (
                <Card key={n.id} className={`border-0 shadow-sm transition-all ${!n.is_read ? 'border-l-4 border-l-blue-400' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                        <CatIcon className={`h-4 w-4 ${cat.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-slate-900 text-sm">{n.title}</p>
                              {typeIcon[n.type]}
                              {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>
                                {cat.label}
                              </span>
                              {(recipient || n.recipient_email) && (
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <MailCheck className="h-3 w-3" />
                                  {recipient?.full_name || n.recipient_email}
                                </span>
                              )}
                              {client && (
                                <span className="text-[11px] text-slate-400">
                                  for {client.company_name}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">
                                {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                              </span>
                              <span className={`text-[11px] font-semibold ${n.is_read ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {n.is_read ? '✓ Read' : 'Unread'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {n.link && (
                              <a href={n.link} className="text-[11px] text-[#1e3a5f] hover:underline whitespace-nowrap">
                                View →
                              </a>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-rose-500" onClick={() => deleteMutation.mutate(n.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Send Dialog */}
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Notification</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Send To</Label>
                <RadioGroup value={sendType} onValueChange={setSendType} className="flex gap-4 mt-2">
                  {[['client', 'All Users in a Client'], ['user', 'Specific User']].map(([v, l]) => (
                    <div key={v} className="flex items-center space-x-2">
                      <RadioGroupItem value={v} id={v} />
                      <Label htmlFor={v} className="font-normal">{l}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {sendType === 'client' && (
                <div>
                  <Label>Select Client *</Label>
                  <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {sendType === 'user' && (
                <div>
                  <Label>Select User *</Label>
                  <Select value={formData.recipient_id} onValueChange={(v) => setFormData({ ...formData, recipient_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['info','success','warning','error','reminder','announcement'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryConfig).map(([k, { label }]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Title *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1" placeholder="Notification title" />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="mt-1" rows={3} placeholder="Notification message..." />
              </div>
              <div>
                <Label>Link (Optional)</Label>
                <Input value={formData.link || ''} onChange={(e) => setFormData({ ...formData, link: e.target.value })} className="mt-1" placeholder="e.g., /invoices/123" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="send-email">Send as Email?</Label>
                <Switch id="send-email" checked={formData.is_email_sent} onCheckedChange={(v) => setFormData({ ...formData, is_email_sent: v })} />
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutateAsync(formData)}
                disabled={!formData.title || !formData.message || createMutation.isPending || (sendType === 'client' && !formData.client_id) || (sendType === 'user' && !formData.recipient_id)}
                className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
              >
                <Send className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminOnly>
  );
}