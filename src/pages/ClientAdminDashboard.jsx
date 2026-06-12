import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  Users, FileText, Wrench, ShoppingCart, Shield,
  ArrowRight, AlertTriangle, CheckCircle2, Clock,
  Plus, Mail, Edit2, Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import StatsCard from '@/components/shared/StatsCard';
import StatusBadge from '@/components/shared/StatusBadge';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useClient } from '@/lib/ClientContext';
import { usePermission } from '@/hooks/usePermission'; 
import { useClientRoles } from '@/hooks/useClientRoles'; 
import { AvatarImg } from '@/components/UserAvatar';

export default function ClientAdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeClientId } = useClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleIds, setInviteRoleIds] = useState([]); 
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMembershipToEdit, setSelectedMembershipToEdit] = useState(null); // To hold the specific membership being edited

  // Check if current user has permission to view this dashboard
  // Assuming 'client:admin.dashboard.view' or the 'client_admin' role itself
  const isAuthorized = useClientRoles(['client_admin']); // Check if user has 'client_admin' role in active client

  const { data: allRoles = [] } = useQuery({ 
    queryKey: ['all-roles'],
    queryFn: () => api.getRoles({ limit: 200 }),
  });


  const { data: orgUsersData = {}, isLoading: loadingUsers } = useQuery({
    queryKey: ['org-users', activeClientId],
    queryFn: () => api.getUsers({
      client_id: activeClientId, 
      order: '-created_at',
      limit: 200,
      search: searchTerm, 
    }),
    enabled: !!activeClientId && isAuthorized, 
  });
  const orgUsers = orgUsersData?.users ?? [];


  const { data: invoices = [] } = useQuery({
    queryKey: ['org-invoices', activeClientId],
    queryFn: () => api.getInvoices({ client_id: activeClientId, order: '-created_at', limit: 50 }),
    enabled: !!activeClientId && isAuthorized,
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ['org-maintenance', activeClientId],
    queryFn: () => api.getMaintenance({ client_id: activeClientId, order: '-created_at', limit: 50 }),
    enabled: !!activeClientId && isAuthorized,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['org-orders', activeClientId],
    queryFn: () => api.getOrders({ client_id: activeClientId, order: '-created_at', limit: 50 }),
    enabled: !!activeClientId && isAuthorized,
  });

  const { data: warrantyClaims = [] } = useQuery({
    queryKey: ['org-warranty', activeClientId],
    queryFn: () => api.getWarrantyClaims({ client_id: activeClientId, order: '-created_at', limit: 20 }),
    enabled: !!activeClientId && isAuthorized,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateUser(id, data), // This expects data with memberships array
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users', activeClientId] }); // Invalidate with activeClientId
      setShowEditDialog(false);
      setSelectedUser(null);
      setSelectedMembershipToEdit(null);
      toast.success('User updated');
    },
    onError: (error) => {
        console.error('Failed to update user:', error);
        toast.error(`Failed to update user: ${error.response?.data?.error || error.message}`);
    }
  });

  const inviteUserMutation = useMutation({
    mutationFn: (invitePayload) => api.inviteUser(invitePayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-users', activeClientId] });
      toast.success('Invitation sent');
      setShowInviteDialog(false);
      setInviteEmail('');
      setInviteRoleIds([]);
    },
    onError: (error) => {
        console.error('Failed to send invitation:', error);
        toast.error(`Failed to send invitation: ${error.response?.data?.error || error.message}`);
    }
  });

  const handleInvite = async () => {
    if (!inviteEmail || !activeClientId || inviteRoleIds.length === 0) {
        toast.error('Email, client, and role are required.');
        return;
    }
    try {
        await inviteUserMutation.mutateAsync({
            email: inviteEmail,
            inviteType: 'client',
            clientId: activeClientId,
            role_ids: inviteRoleIds, 
        });
    } catch (error) {
        // Error handling is in mutationFn's onError
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <Shield className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 max-w-sm">This area is for client administrators only.</p>
      </div>
    );
  }

  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const totalDue = invoices
    .filter(i => ['pending', 'overdue', 'partial'].includes(i.status))
    .reduce((sum, i) => sum + (i.balance_due || i.total_amount || 0), 0);
  const pendingMaintenance = maintenance.filter(m => m.status === 'pending');
  const openWarranty = warrantyClaims.filter(c => ['pending', 'under_review'].includes(c.status));

  const filteredUsers = orgUsers.filter(u =>
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditUser = (userToEdit) => {
    // When editing, find the specific membership for the activeClientId
    const membership = userToEdit.memberships.find(m => m.clientId === activeClientId);
    if (membership) {
        setSelectedUser(userToEdit);
        setSelectedMembershipToEdit(membership); // Store the membership being edited
        setShowEditDialog(true);
    } else {
        toast.error('User is not a member of the active client.');
    }
  };

  const handleUpdateUserRoles = async () => {
    if (!selectedUser || !selectedMembershipToEdit) return;

    // Construct the payload for PATCH /api/users/:id
    // This updates roles for *one* specific membership
    await updateUserMutation.mutateAsync({
      id: selectedUser.id,
      data: {
        // Can update other user fields here if needed in the dialog
        memberships: [{
          clientId: selectedMembershipToEdit.clientId,
          roleIds: selectedMembershipToEdit.roles.map(r => r.id), 
        }],
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Dashboard"
        subtitle="Manage your team and monitor account activity"
        actions={
          <Button onClick={() => setShowInviteDialog(true)} className="bg-[#005f27] hover:bg-[#436a36]">
            <Mail className="h-4 w-4 mr-2" /> Invite Team Member
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Team Members" value={orgUsers.length} icon={Users} variant="primary" />
        <StatsCard title="Overdue Invoices" value={overdueInvoices.length} icon={AlertTriangle} variant={overdueInvoices.length > 0 ? 'danger' : 'success'} />
        <StatsCard title="Pending Maintenance" value={pendingMaintenance.length} icon={Wrench} variant={pendingMaintenance.length > 0 ? 'warning' : 'default'} />
        <StatsCard title="Amount Due" value={`$${totalDue.toLocaleString()}`} icon={FileText} variant={overdueInvoices.length > 0 ? 'danger' : 'default'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-[#005f27]" /> Team Members
            </CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <p className="text-center py-8 text-slate-400 text-sm">Loading...</p>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No team members yet</p>
                <Button onClick={() => setShowInviteDialog(true)} className="mt-3 bg-[#005f27] hover:bg-[#436a36]" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Invite First Member
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredUsers.map(u => {
                    const activeClientMembership = u.memberships.find(m => m.clientId === activeClientId);
                    return (
                        <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-[#005f27]/30 hover:bg-[#edf0be]/30 transition-all">
                            <AvatarImg avatarKey={u.avatar_storage_key} fallback={getInitials(u.full_name)} />
                            
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-sm truncate">{u.full_name || 'No Name'}</p>
                                <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                {activeClientMembership && activeClientMembership.roles.length > 0 && (
                                    <span className="inline-block text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                                        {activeClientMembership.roles.map(r => r.name.replace(/_/g, ' ')).join(', ')}
                                    </span>
                                )}
                            </div>
                            {u.id !== user.id && activeClientMembership && ( // Can only edit if user is a member of the active client
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-slate-700"
                                    onClick={() => handleEditUser(u)}
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Link to={createPageUrl('Invoices')}>
              <Button variant="ghost" size="sm" className="text-[#005f27]">View all <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No invoices</p>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 5).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-slate-900 truncate">{inv.invoice_number || inv.title}</p>
                      <p className="text-xs text-slate-500">{inv.due_date ? format(new Date(inv.due_date), 'MMM d, yyyy') : 'No due date'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-800">${inv.total_amount?.toLocaleString()}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance & Warranty */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Maintenance & Warranty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Wrench className="h-3 w-3" /> Maintenance
                </p>
                <Link to={createPageUrl('Maintenance')}><Button variant="ghost" size="sm" className="h-6 text-xs text-[#005f27] px-2">View all</Button></Link>
              </div>
              {maintenance.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <p className="text-sm text-slate-700 truncate flex-1 mr-2">{m.title}</p>
                  <StatusBadge status={m.status} />
                </div>
              ))}
              {maintenance.length === 0 && <p className="text-xs text-slate-400 py-2">No maintenance requests</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> Warranty Claims
                </p>
                <Link to={createPageUrl('WarrantyClaims')}><Button variant="ghost" size="sm" className="h-6 text-xs text-[#005f27] px-2">View all</Button></Link>
              </div>
              {warrantyClaims.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <p className="text-sm text-slate-700 truncate flex-1 mr-2">{c.claim_number || 'Claim'}</p>
                  <StatusBadge status={c.status} />
                </div>
              ))}
              {warrantyClaims.length === 0 && <p className="text-xs text-slate-400 py-2">No warranty claims</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
                <Label>Role for this Client</Label>
                {/* For simplicity, assuming single role selection for invite here */}
                <Select value={inviteRoleIds[0] || ''} onValueChange={(v) => setInviteRoleIds([v])}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {allRoles.map(r => ( // Filter out system roles if not applicable for client invites
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
              They will be added as a member of this organization with the selected role.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail || inviteRoleIds.length === 0 || inviteUserMutation.isPending}
              className="bg-[#005f27] hover:bg-[#436a36]"
            >
              {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Team Member</DialogTitle></DialogHeader>
          {selectedUser && selectedMembershipToEdit && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <AvatarImg avatarKey={selectedUser.avatar_storage_key} fallback={getInitials(selectedUser.full_name)} />
                <div>
                  <p className="font-medium text-sm">{selectedUser.full_name}</p>
                  <p className="text-xs text-slate-500">{selectedUser.email}</p>
                </div>
              </div>
              <div>
                <Label>Role for {selectedMembershipToEdit.client_name}</Label>
                {/* For simplicity, assuming single role selection for edit here */}
                <Select
                  value={selectedMembershipToEdit.roles[0]?.id || ''}
                  onValueChange={v => {
                    const updatedRoles = allRoles.filter(r => r.id === v);
                    setSelectedMembershipToEdit(prev => ({ ...prev, roles: updatedRoles }));
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allRoles.map(r => ( // Filter out system roles
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button
              onClick={handleUpdateUserRoles}
              disabled={updateUserMutation.isPending}
              className="bg-[#005f27] hover:bg-[#436a36]"
            >
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
