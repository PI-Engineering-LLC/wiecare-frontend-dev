import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Edit2, Users, Mail, Building2, Shield, Lock, Unlock, Eye, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AvatarImg } from "@/components/UserAvatar";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { useClient } from '@/lib/ClientContext';
import { usePermission } from '@/hooks/usePermission';
import { usePlatformRole } from '@/hooks/usePlatfromRole';
import AddRoleDialog from '@/components/roles/AddRoleDialog';
import AddPermissionDialog from '@/components/permissions/AddPermissionDialog';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusIcon, Trash2Icon, ChevronDownIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { formatInTimeZone } from 'date-fns-tz';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- JSDoc Type Definitions for improved type checking ---
/**
 * @typedef {object} Role
 * @property {string} id
 * @property {string} name
 * @property {string | null | undefined} client_id
 */

/**
 * @typedef {object} ClientMembership
 * @property {string} membership_id 
 * @property {string} client_id
 * @property {string} client_name
 * @property {boolean} is_active
 * @property {string | null} joined_at 
 * @property {Role[]} roles
 */

/**
 * @typedef {object} UserData
 * @property {string} id
 * @property {string} email
 * @property {string} full_name
 * @property {string} platform_role
 * @property {boolean} is_active
 * @property {string} last_login_at
 * @property {string} created_at
 * @property {string} [avatar_storage_key]
 * @property {string} [phone]
 * @property {string} [job_title]
 * @property {string} status
 * @property {ClientMembership[]} memberships
 */

export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const { activeClientId } = useClient();
  const [inviteData, setInviteData] = useState({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' });
  /** @type {UserData | null} */
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [showAddPermissionsDialog, setShowAddPermissionsDialog] = useState(false);
  const currentUserIdInEdit = selectedUser?.id;
  const [addingClientId, setAddingClientId] = useState('');
  const [selectedNewRoles, setSelectedNewRoles] = useState([]);
  const [openRoleSelect, setOpenRoleSelect] = useState(false);
  const [activeTab, setActiveTab] = useState('users');

  const queryClient = useQueryClient();

  const isSuperAdmin = usePlatformRole('super_admin');
  const isPlatformAdmin = usePlatformRole('platform_admin');
  const isInternalAdmin = isSuperAdmin || isPlatformAdmin;
  const SYSTEM_ROLES = ['platform_admin', 'super_admin'];

  const canInviteClientUser = usePermission('client:users.invite');
  const canInvitePlatformUser = isInternalAdmin;

  const [page, setPage] = useState(1);

  const { data: usersData = {}, isLoading } = useQuery({
    queryKey: ['admin-users', page, searchTerm, roleFilter],
    queryFn: () => api.getUsers({
      page,
      limit: 100,
      order: '-created_at',
      search: searchTerm,
      platform_role: roleFilter === 'super_admin' || roleFilter === 'platform_admin' || roleFilter === 'platform_user' ? roleFilter : undefined,
    }),
  });
  const users = usersData?.users ?? [];

  // Fetch detailed user data for the selected user when the dialog opens
  const { data: detailedSelectedUserResponse, isLoading: isLoadingDetailedUser } = useQuery({ 
    queryKey: ['user', selectedUser?.id],
    queryFn: async () => { 
      const response = await api.getUser(selectedUser.id);
      return response.user;
    },
    enabled: !!selectedUser?.id && showEditDialog,
  });
  const { data: invitesData = {} , isLoading: isLoadingInvites } = useQuery({
    queryKey: ['admin-invites'],
    queryFn: () => api.getInvites({limit: 50, order: '-created_at'}),
  });
  const invites = invitesData?.invites ?? [];

  // Update selectedUser state with detailed data once fetched
  useEffect(() => {
    if (detailedSelectedUserResponse) { 
      setSelectedUser(detailedSelectedUserResponse);
    }
  }, [detailedSelectedUserResponse]); 


  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients({ order: 'company_name', limit: 200 }),
    enabled: isInternalAdmin || canInviteClientUser,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.getRoles({ limit: 200 }),
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.getPermissions({ limit: 200 }),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user', selectedUser.id] });
      setShowEditDialog(false);
      setSelectedUser(null);
      toast.success('User updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update user:', error);
      toast.error(`Failed to update user: ${ error.message}`);
    }
  });
   const deleteUserMutation = useMutation({
      mutationFn: (id) => api.deleteUser(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        setUserToDelete(null);
        toast.success('User deleted successfully');
      },
    });

  const updateRolesMutation = useMutation({
    mutationFn: ({ clientId, data }) => api.updateUserClientRoles(currentUserIdInEdit, clientId, data),
    // mutationFn: ({ clientId, roleIds }) => api.updateUserClientRoles(
    //   currentUserIdInEdit,
    //   clientId,
    //   {roleIds: roleIds}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', currentUserIdInEdit] });
      toast.success("Roles updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update roles: ${error.message}`);
    }
  });

   const addClientMembershipMutation = useMutation({
    mutationFn: ({ clientId, roleIds }) => api.addUserToClient(
      currentUserIdInEdit,
      clientId,
      {roleIds: roleIds}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', currentUserIdInEdit] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setAddingClientId('');
      setSelectedNewRoles([]);
      toast.success("Added to new client successfully!");
    },
    onError: (err) => {
      toast.error(`Failed to add to client: ${err.message}`);
    },
  });

  const removeClientMembershipMutation = useMutation({
    mutationFn: (clientId) => api.removeUserFromClient(
      currentUserIdInEdit,
      clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', currentUserIdInEdit] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success("Removed from client successfully!");
    },
    onError: (err) => {
      toast.error(`Failed to remove from client: ${err.message}`);
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: (invitePayload) => api.inviteUser(invitePayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success('Invitation sent successfully');
      setShowInviteDialog(false);
      setInviteData({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' });
    },
    onError: (error) => {
      console.error('Failed to send invitation:', error);
      toast.error(`Failed to send invitation: ${error.response?.data?.error || error.message}`);
    }
  });
  const resendMutation = useMutation({
    mutationFn: (id) => api.resendInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success('Invitation resent successfully');
    },
    onError: () => toast.error('Failed to resend invitation')
  });
  
  // Mutation to Cancel (e.g., delete the invite record)
  const revokeMutation = useMutation({
    mutationFn: (id) => api.revokeInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
      toast.success('Invitation revoked');
    },
    onError: () => toast.error('Failed to revoke invitation')
  });
  const handleResend = (invite) => {
    if (confirm(`Are you sure you want to resend the invitation to ${invite.email}?`)) {
      resendMutation.mutate(invite.id);
    }
  };
  
  const handleRevoke = (invite) => {
    if (confirm(`Are you sure you want to revoke the invitation for ${invite.email}?`)) {
      revokeMutation.mutate(invite.id);
    }
  };

  const handleInvite = async () => {
    const payload = {
      email: inviteData.email,
      inviteType: inviteData.inviteType,
      platformRole: inviteData.platformRole,
      invited_by_message: '',
    };

    if (inviteData.inviteType === 'client') {
      payload.clientId = isInternalAdmin ? inviteData.clientId : activeClientId;

      if (!payload.clientId) {
        toast.error('Client is required for client invite.');
        return;
      }
      if (inviteData.roleIds.length === 0) {
        toast.error('At least one role is required for client invite.');
        return;
      }
      payload.role_ids = inviteData.roleIds;
    } else if (inviteData.inviteType === 'platform') {
      if (!inviteData.platformRole) {
        toast.error('Internal role is required for internal member invite.');
        return;
      }
    }

    inviteUserMutation.mutate(payload);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    const updatePayload = {
      full_name: selectedUser.full_name,
      phone: selectedUser.phone,
      job_title: selectedUser.job_title,
      avatar_storage_key: selectedUser.avatar_storage_key,
      status: selectedUser.status,
    };

    if (isInternalAdmin && selectedUser.platform_role) {
      updatePayload.platform_role = selectedUser.platform_role;
    }

    if (selectedUser.memberships && Array.isArray(selectedUser.memberships)) {
      updatePayload.memberships = selectedUser.memberships.map(m => ({
        clientId: m.client_id,
        roleIds: Array.from(new Set(m.roles.map(r => r.id))), // Deduplication using Set
      }));
    }

    updateUserMutation.mutate(
      {
        id: selectedUser.id,
        data: updatePayload
      });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesRole = true;
    if (roleFilter !== 'all') {
      const hasPlatformRole = user.platform_role === roleFilter;
      const hasMembershipRole = user.memberships.some(m => m.roles.some(role => role.id === roleFilter));
      matchesRole = hasPlatformRole || hasMembershipRole;
    }

    return matchesSearch && matchesRole;
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const columns = [
    {
      header: 'User',
      render: (row) => (
        <div className="flex items-center gap-3">
          <AvatarImg avatarKey={row.avatar_storage_key} fallback={getInitials(row.full_name)} />
          <div>
            <p className="font-medium text-slate-900">{row.full_name || 'No Name'}</p>
            <p className="text-sm text-slate-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Role(s)',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.platform_role && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {row.platform_role.replace(/\bplatform\b/gi, 'internal').replace(/_/g, ' ')}
            </span>
          )}
          {row.memberships.map(m => (
            <span key={m.membership_id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium"> {/* CHANGED: key to membership_id */}
              {`${m.client_name}: ${m.roles.map(r => r.name).join(', ')}`}
            </span>
          ))}
        </div>
      )
    },
    isInternalAdmin && {
      header: 'Client',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.memberships.length > 0 ? (
            row.memberships.map(m => (
              <span key={m.membership_id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium"> {/* CHANGED: key to membership_id */}
                {m.client_name}
              </span>
            ))
          ) : (
            <span className="px-2 py-0.5 text-slate-500">- N/A -</span>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status || 'active'} />
    },
    {
      header: 'Actions',
      // render: (row) => (
      //   <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditUser(row); }}>
      //     <Edit2 className="h-4 w-4" />
      //   </Button>
      // )
      render: (row) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditUser(row); }}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setUserToDelete(row); }}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            )
    },
  ].filter(Boolean);
  
  const inviteColumns = [
    {
      header: 'Email',
      render: (row) => <span className="font-medium text-slate-900">{row.email}</span>
    },
    {
      header: 'Client',
      render: (row) => <span className="font-medium text-slate-900">{row.client_name || '-'}</span>
    },
    {
      header: 'Role(s)',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.platform_role && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {row.platform_role.replace(/\bplatform\b/gi, 'internal').replace(/_/g, ' ')}
            </span>
          )}
          {/* Safety check added here */}
          {(row.role_ids || []).map(rid => (
            <span key={rid} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium"> 
              {/* Removed .join(', ') which caused error on string */}
              {roles.find(r => r.id === rid)?.name || 'Unknown Role'}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'Invited by',
      render: (row) => <span className="font-medium text-slate-900">{row.invited_by_name || '-'}</span>
    },
    {
      header: 'Sent Date',
      render: (row) => row.updated_at ? formatInTimeZone(new Date(row.updated_at), 'UTC', 'MMM d, yyyy') : '-'
    },
    {
      header: 'Expires',
      render: (row) => row.invite_expires_at ? formatInTimeZone(new Date(row.invite_expires_at), 'UTC', 'MMM d, yyyy') : '-'
    },
    {
      header: 'Accepted Date',
      render: (row) => row.accepted_at ? formatInTimeZone(new Date(row.accepted_at), 'UTC', 'MMM d, yyyy') : '-'
    },
    {
      header: 'Actions',
      render: (row) => (
        // Conditional rendering: Only show if accepted_at is empty/falsy
        !row.accepted_at && (
          <div className="flex gap-2">
            <Button 
            variant="ghost" 
            size="sm" 
            disabled={resendMutation.isPending}
            onClick={() => handleResend(row)}>
              {resendMutation.isPending ? 'Sending...' : 'Resend'}
            </Button>
            <Button variant="ghost" size="sm" disabled={revokeMutation.isPending} className="text-rose-500" onClick={() => handleRevoke(row)}>
            {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
            </Button>
          </div>
        )
      )
    }
  ];
  const availableClientsToAdd = clients?.filter(
    (client) => !selectedUser?.memberships.some((m) => m.client_id === client.id)
  );

  return (
    <AdminOnly>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          subtitle="Manage user accounts, roles, and permissions across clients and platform."
          actions={
            <>
              {canInviteClientUser || canInvitePlatformUser ? (
                <Button
                  onClick={() => setShowInviteDialog(true)}
                  className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              ) : null}
              {false && isInternalAdmin && (
                <Button
                  onClick={() => setShowAddRoleDialog(true)}
                  className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role Type
                </Button>
              )}
              {false && isInternalAdmin && (
                <Button
                  onClick={() => setShowAddPermissionsDialog(true)}
                  className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Permission Type
                </Button>
              )}
            </>
          }
        />

        

<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="mb-4">
    <TabsTrigger value="users">Users</TabsTrigger>
    <TabsTrigger value="invites">Invites</TabsTrigger>
  </TabsList>
  
  <TabsContent value="users">
  <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="platform_admin">Internal Admin</SelectItem>
                  <SelectItem value="platform_user">Internal User</SelectItem>
                  {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
  {users.length === 0 && !isLoading ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Invite users to get started"
            action={() => setShowInviteDialog(true)}
            actionLabel="Invite User"
          />
        ) : (
          <DataTable
            columns={columns}
            data={filteredUsers}
            isLoading={isLoading}
            emptyMessage="No users match your search"
          />
        )}
  </TabsContent>
  
  <TabsContent value="invites">
  {invites.length === 0 && !isLoadingInvites ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Invite users to get started"
            action={() => setShowInviteDialog(true)}
            actionLabel="Invite User"
          />
        ) : ( <DataTable
    columns={inviteColumns}
      data={invites} // Assuming you fetch this data via useQuery
      isLoading={isLoadingInvites}
      emptyMessage="No pending invites found" />)}
  </TabsContent>
</Tabs>

        

        {/* Invite Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-y-auto" >
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              {isInternalAdmin && <div>
                <Label> Invite Type</Label>
                <Select value={inviteData.inviteType} onValueChange={(v) => {
                  setInviteData({ ...inviteData, inviteType: v, platformRole: '', roleIds: [], clientId: '' });
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Internal User </SelectItem>
                    <SelectItem value="client">Client User</SelectItem>
                  </SelectContent>
                </Select>
              </div>}
              {isInternalAdmin && inviteData.inviteType === 'platform' && (
                <div>
                  <Label> Internal Role</Label>
                  <Select value={inviteData.platformRole} onValueChange={(v) => { 
                    setInviteData({ ...inviteData, platformRole: v })}}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="platform_admin">Internal Admin</SelectItem>
                      <SelectItem value="platform_user">Internal User</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {inviteData.platformRole === 'super_admin' ? 'Highest internal access.' :
                     inviteData.platformRole === 'platform_admin' ? 'Full internal access.' :
                    'Standard internal user access.'}
                  </p>
                </div>
              )}
              {inviteData.inviteType === 'client' && (
                <>
                  <div>
                    <Label>Role(s)</Label>
                    <Select
                      value={inviteData.roleIds[0] || ''}
                      onValueChange={(v) => setInviteData({ ...inviteData, roleIds: [v] })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles
                        .filter(r => !SYSTEM_ROLES.includes(r.name))
                        .map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">
                      Assign one or more roles for the user within the selected client.
                    </p>
                  </div>
                  {(isInternalAdmin || activeClientId) && (
                    <div>
                      <Label>Assign to Client</Label>
                      <Select
                        value={inviteData.clientId || ''}
                        onValueChange={(v) => setInviteData({ ...inviteData, clientId: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {isInternalAdmin ? (
                            clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
                              </SelectItem>
                            ))
                          ) : (
                            activeClientId && clients.filter(c => c.id === activeClientId).map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteData.email || inviteUserMutation.isPending || (inviteData.inviteType === 'platform' && !inviteData.platformRole) || (inviteData.inviteType === 'client' && ((!inviteData.clientId && !activeClientId) || inviteData.roleIds.length === 0))}
                className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
              >
                {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User: {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
            </DialogHeader>
            {isLoadingDetailedUser ? (
              <div className="text-center p-4">Loading user details...</div>
            ) : selectedUser && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <AvatarImg avatarKey={selectedUser.avatar_storage_key} fallback={getInitials(selectedUser.full_name)} />
                  <div>
                    <p className="font-medium">{selectedUser.full_name || 'No Name'}</p>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  </div>
                </div>

                {/* Editable User Details */}
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={selectedUser.full_name || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={selectedUser.job_title || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, job_title: e.target.value })}
                    className="mt-1"
                  />
                </div>

                {isInternalAdmin && (
                  <div>
                    <Label>Platform Role</Label>
                    <Select
                      value={selectedUser.platform_role || ''}
                      onValueChange={(v) => setSelectedUser({ ...selectedUser, platform_role: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select internal role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="platform_admin">Internal Admin</SelectItem>
                        <SelectItem value="platform_user">Internal User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isInternalAdmin && (
                  <div>
                    <Label>Account Status</Label>
                    <Select
                      value={selectedUser.status || 'active'}
                      onValueChange={(v) => setSelectedUser({ ...selectedUser, status: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-6">
                  <h3 className="font-semibold text-lg mb-3">Client Memberships & Roles</h3>
                  {selectedUser.memberships?.length > 0 ? (
                    selectedUser.memberships.map((membership, index) => (
                      <div key={membership.membership_id} className="border p-4 rounded-md shadow-sm space-y-3"> {/* CHANGED: key to membership_id */}
                        <div className="flex justify-between items-center">
                          <h4 className="text-base font-semibold">{membership.client_name}</h4>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeClientMembershipMutation.mutate(membership.client_id)}
                            disabled={removeClientMembershipMutation.isLoading}
                          >
                            <Trash2Icon className="h-4 w-4 mr-2" /> Remove from Client
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Roles in {membership.client_name}:</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {membership.roles?.map((role) => (
                              <Badge key={role.id} variant="secondary">{role.name}</Badge>
                            ))}
                          </div>

                          {/* Multi-select Role Editor for existing membership */}
                          <Popover open={openRoleSelect === membership.client_id} onOpenChange={(isOpen) => setOpenRoleSelect(isOpen ? membership.client_id : null)}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-[200px] justify-between">
                                Manage Roles
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <Command>
                                <CommandGroup>
                                  {roles?.filter(r => ( !SYSTEM_ROLES.includes(r.name)&&(r.client_id == null || r.client_id === membership.client_id))).map(role => {
                                    const isSelected = membership.roles.some(mr => mr.id === role.id);
                                    return (
                                      <CommandItem
                                        key={role.id}
                                        onSelect={() => {
                                          document.getElementById(`role-${membership.client_id}-${role.id}`)?.click();
                                        }}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`role-${membership.client_id}-${role.id}`}
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                              const currentRoleIdsSet = new Set(membership.roles.map(r => r.id));
                                              if (checked) {
                                                currentRoleIdsSet.add(role.id);
                                              } else {
                                                currentRoleIdsSet.delete(role.id);
                                              }
                                              const updatedRoleIdsArray = Array.from(currentRoleIdsSet);

                                              const updatedMemberships = [...selectedUser.memberships];
                                              updatedMemberships[index] = {
                                                ...updatedMemberships[index],
                                                roles: roles.filter(r => updatedRoleIdsArray.includes(r.id))
                                              };
                                              setSelectedUser({ ...selectedUser, memberships: updatedMemberships });

                                              // updateRolesMutation.mutate({ clientId: membership.client_id, 
                                              //   data: {
                                              //     // Can update other user fields here if needed in the dialog
                                              //     memberships: [{
                                              //       clientId: membership.client_id,
                                              //       roleIds: updatedRoleIdsArray,
                                              //       status: selectedUser.status
                                              //     }],
                                              //   }

                                              // });
                                            }}
                                          />
                                          <Label>{role.name}</Label>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">This user is not a member of any clients yet.</p>
                  )}

                  {/* Add to new Client Section */}
                  <div className="border-t pt-4 mt-6">
                    <h3 className="text-lg font-semibold mb-3">Add User to a New Client</h3>
                    <div className="flex flex-col gap-4">
                      <Select
                        value={addingClientId}
                        onValueChange={(value) => {
                          setAddingClientId(value);
                          setSelectedNewRoles([]);
                        }}
                        disabled={availableClientsToAdd?.length === 0}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder={availableClientsToAdd?.length === 0 ? "No more clients to add" : "Select Client"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableClientsToAdd?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {addingClientId && (
                        <div className="space-y-2">
                          <Label>Assign Roles for {clients?.find(t => t.id === addingClientId)?.company_name}:</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-[200px] justify-between">
                                {selectedNewRoles.length === 0
                                  ? "Select Roles"
                                  : `${selectedNewRoles.length} role(s) selected`}
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <Command>
                                <CommandGroup>
                                  {roles?.filter(r => (!SYSTEM_ROLES.includes(r.name) &&(r.client_id == null || r.client_id === addingClientId))).map(role => (
                                    <CommandItem
                                      key={role.id}
                                      onSelect={() => {
                                        document.getElementById(`new-client-role-${role.id}`)?.click();
                                      }}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`new-client-role-${role.id}`}
                                          checked={selectedNewRoles.includes(role.id)}
                                          onCheckedChange={(checked) => {
                                            setSelectedNewRoles((prev) => {
                                              const prevSet = new Set(prev);
                                              if (checked) {
                                                prevSet.add(role.id);
                                              } else {
                                                prevSet.delete(role.id);
                                              }
                                              return Array.from(prevSet);
                                            });
                                          }}
                                        />
                                        <Label htmlFor={`new-client-role-${role.id}`}>{role.name}</Label>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>

                          <Button
                            onClick={() => addClientMembershipMutation.mutate({ clientId: addingClientId, roleIds: selectedNewRoles })}
                            disabled={!addingClientId || selectedNewRoles.length === 0 || addClientMembershipMutation.isLoading}
                          >
                            <PlusIcon className="h-4 w-4 mr-2" /> Add User to Client
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button
                onClick={handleUpdateUser}
                disabled={updateUserMutation.isPending}
                className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete User</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to delete {userToDelete?.full_name || userToDelete?.email}? This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => deleteUserMutation.mutate(userToDelete.id)}
        className="bg-rose-600 hover:bg-rose-700"
      >
        {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>


        {/* Roles and Permission Dialogs */}
        <AddRoleDialog permissions={permissions} open={showAddRoleDialog} onClose={setShowAddRoleDialog} onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['roles'] });
        }} />
        <AddPermissionDialog open={showAddPermissionsDialog} onClose={setShowAddPermissionsDialog} onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['permissions'] });
        }} />
      </div>
    </AdminOnly>
  );
}
