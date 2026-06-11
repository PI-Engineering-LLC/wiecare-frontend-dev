import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Edit2, Users, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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


// --- JSDoc Type Definitions for improved type checking ---
/**
 * @typedef {object} Role
 * @property {string} id
 * @property {string} name
 * @property {string | null | undefined} client_id
 */

/**
 * @typedef {object} ClientMembership
 * @property {string} membership_id // CHANGED: Renamed from 'id' to 'membership_id' for consistency with backend
 * @property {string} client_id
 * @property {string} client_name
 * @property {boolean} is_active
 * @property {string | null} joined_at // CHANGED: Consistent naming
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [showAddPermissionsDialog, setShowAddPermissionsDialog] = useState(false);
  const currentUserIdInEdit = selectedUser?.id;
  const [addingClientId, setAddingClientId] = useState('');
  const [selectedNewRoles, setSelectedNewRoles] = useState([]);
  const [openRoleSelect, setOpenRoleSelect] = useState(false);

  const queryClient = useQueryClient();

  const isSuperAdmin = usePlatformRole('super_admin');
  const isPlatformAdmin = usePlatformRole('platform_admin');
  const isInternalAdmin = isSuperAdmin || isPlatformAdmin;

  const canInviteClientUser = usePermission('client:users.invite');
  const canInvitePlatformUser = isInternalAdmin;

  const [page, setPage] = useState(1);

  const { data: usersData = {}, isLoading } = useQuery({
    queryKey: ['admin-users', page, searchTerm, roleFilter],
    queryFn: () => api.getUsers({
      page,
      limit: 50,
      order: '-created_at',
      search: searchTerm,
      platform_role: roleFilter === 'super_admin' || roleFilter === 'platform_admin' || roleFilter === 'platform_user' ? roleFilter : undefined,
    }),
  });
  const users = usersData?.users ?? [];

  // Fetch detailed user data for the selected user when the dialog opens
  const { data: detailedSelectedUserResponse, isLoading: isLoadingDetailedUser } = useQuery({ // CHANGED: Renamed to detailedSelectedUserResponse
    queryKey: ['user', selectedUser?.id],
    queryFn: async () => { // CHANGED: Make it async to await the response
      const response = await api.getUser(selectedUser.id);
      return response.user; // CHANGED: Extract the 'user' property from the response
    },
    enabled: !!selectedUser?.id && showEditDialog,
  });

  // Update selectedUser state with detailed data once fetched
  useEffect(() => {
    if (detailedSelectedUserResponse) { // CHANGED: Use detailedSelectedUserResponse
      setSelectedUser(detailedSelectedUserResponse); // CHANGED: Set to the extracted user object
    }
  }, [detailedSelectedUserResponse]); // CHANGED: Depend on detailedSelectedUserResponse


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

  const updateRolesMutation = useMutation({
    mutationFn: ({ clientId, roleIds }) => api.updateUserClientRoles(
      currentUserIdInEdit,
      clientId,
      {roleIds: roleIds}),
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
      toast.success('Invitation sent successfully');
      setShowInviteDialog(false);
      setInviteData({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' });
    },
    onError: (error) => {
      console.error('Failed to send invitation:', error);
      toast.error(`Failed to send invitation: ${error.response?.data?.error || error.message}`);
    }
  });

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
        toast.error('Platform role is required for platform invite.');
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

    // CHANGED: Deduplicate roleIds in updatePayload.memberships before sending to backend
    if (selectedUser.memberships && Array.isArray(selectedUser.memberships)) {
      updatePayload.memberships = selectedUser.memberships.map(m => ({
        clientId: m.client_id,
        roleIds: Array.from(new Set(m.roles.map(r => r.id))), // ADDED: Deduplication using Set
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
              {row.platform_role.replace(/_/g, ' ')}
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
      render: (row) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditUser(row); }}>
          <Edit2 className="h-4 w-4" />
        </Button>
      )
    },
  ].filter(Boolean);

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
              {isInternalAdmin && (
                <Button
                  onClick={() => setShowAddRoleDialog(true)}
                  className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role Type
                </Button>
              )}
              {isInternalAdmin && (
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
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                  <SelectItem value="platform_user">Platform User</SelectItem>
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
                    <SelectItem value="platform">Platform User </SelectItem>
                    <SelectItem value="client">Client User</SelectItem>
                  </SelectContent>
                </Select>
              </div>}
              {isInternalAdmin && inviteData.inviteType === 'platform' && (
                <div>
                  <Label> Platform Role</Label>
                  <Select value={inviteData.platformRole} onValueChange={(v) => { console.log(inviteData, v);
                    setInviteData({ ...inviteData, platformRole: v })}}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="platform_admin">Platform Admin</SelectItem>
                      <SelectItem value="platform_user">Platform User</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {inviteData.platformRole === 'super_admin' ? 'Highest platform access.' :
                     inviteData.platformRole === 'platform_admin' ? 'Full platform access.' :
                    'Standard platform user access.'}
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
                        {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
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
                        <SelectValue placeholder="Select platform role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="platform_admin">Platform Admin</SelectItem>
                        <SelectItem value="platform_user">Platform User</SelectItem>
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
                                  {roles?.filter(r => r.client_id == null || r.client_id === membership.client_id).map(role => {
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

                                              updateRolesMutation.mutate({ clientId: membership.client_id, roleIds: updatedRoleIdsArray });
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
                                  {roles?.filter(r => r.client_id == null || r.client_id === addingClientId).map(role => (
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

// import React, { useState, useEffect } from 'react';
// import { api } from '@/api/apiClient';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import AdminOnly from '@/components/AdminOnly';
// import { Plus, Search, Edit2, Users, Mail } from 'lucide-react';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Label } from "@/components/ui/label";
// import { AvatarImg } from "@/components/UserAvatar";
// import PageHeader from '@/components/shared/PageHeader';
// import DataTable from '@/components/shared/DataTable';
// import StatusBadge from '@/components/shared/StatusBadge';
// import EmptyState from '@/components/shared/EmptyState';
// import { toast } from 'sonner';
// import { useClient } from '@/lib/ClientContext';
// import { usePermission } from '@/hooks/usePermission';
// import { usePlatformRole } from '@/hooks/usePlatfromRole';
// import AddRoleDialog from '@/components/roles/AddRoleDialog';
// import AddPermissionDialog from '@/components/permissions/AddPermissionDialog';
// import { Badge } from "@/components/ui/badge";
// import { Checkbox } from "@/components/ui/checkbox";
// import { PlusIcon, Trash2Icon, ChevronDownIcon } from "lucide-react";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import { Command, CommandGroup, CommandItem } from "@/components/ui/command";


// // --- JSDoc Type Definitions for improved type checking ---
// /**
//  * @typedef {object} Role
//  * @property {string} id
//  * @property {string} name
//  * @property {string | null | undefined} client_id // CHANGED: Explicitly include undefined as a possibility
//  */

// /**
//  * @typedef {object} ClientMembership
//  * @property {string} id
//  * @property {string} client_id
//  * @property {string} client_name // Provided by backend GET /api/users
//  * @property {boolean} is_active
//  * @property {string} created_at
//  * @property {string | null} joined_at // CHANGED: Added joined_at for consistency with backend
//  * @property {Role[]} roles
//  */

// /**
//  * @typedef {object} UserData
//  * @property {string} id
//  * @property {string} email
//  * @property {string} full_name
//  * @property {string} platform_role
//  * @property {boolean} is_active
//  * @property {string} last_login_at
//  * @property {string} created_at
//  * @property {string} [avatar_storage_key]
//  * @property {string} [phone]
//  * @property {string} [job_title]
//  * @property {string} status
//  * @property {ClientMembership[]} memberships
//  */

// export default function AdminUsers() {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [roleFilter, setRoleFilter] = useState('all');
//   const [showInviteDialog, setShowInviteDialog] = useState(false);
//   const { activeClientId } = useClient();
//   const [inviteData, setInviteData] = useState({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' });
//   /** @type {UserData | null} */
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [showEditDialog, setShowEditDialog] = useState(false);
//   const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
//   const [showAddPermissionsDialog, setShowAddPermissionsDialog] = useState(false);
//   const currentUserIdInEdit = selectedUser?.id;
//   const [addingClientId, setAddingClientId] = useState('');
//   const [selectedNewRoles, setSelectedNewRoles] = useState([]);
//   const [openRoleSelect, setOpenRoleSelect] = useState(false);

//   const queryClient = useQueryClient();

//   const isSuperAdmin = usePlatformRole('super_admin');
//   const isPlatformAdmin = usePlatformRole('platform_admin');
//   const isInternalAdmin = isSuperAdmin || isPlatformAdmin;

//   const canInviteClientUser = usePermission('client:users.invite');
//   const canInvitePlatformUser = isInternalAdmin;

//   const [page, setPage] = useState(1);

//   const { data: usersData = {}, isLoading } = useQuery({
//     queryKey: ['admin-users', page, searchTerm, roleFilter],
//     queryFn: () => api.getUsers({
//       page,
//       limit: 50,
//       order: '-created_at',
//       search: searchTerm,
//       platform_role: roleFilter === 'super_admin' || roleFilter === 'platform_admin' || roleFilter === 'platform_user' ? roleFilter : undefined,
//     }),
//   });
//   const users = usersData?.users ?? [];

//   const { data: detailedSelectedUser, isLoading: isLoadingDetailedUser } = useQuery({
//     queryKey: ['user', selectedUser?.id],
//     queryFn: () => api.getUser(selectedUser.id),
//     enabled: !!selectedUser?.id && showEditDialog,
//   });

//   useEffect(() => {
//     if (detailedSelectedUser) {
//       setSelectedUser(detailedSelectedUser);
//     }
//   }, [detailedSelectedUser]);


//   const { data: clients = [] } = useQuery({
//     queryKey: ['clients'],
//     queryFn: () => api.getClients({ order: 'company_name', limit: 200 }),
//     enabled: isInternalAdmin || canInviteClientUser,
//   });

//   const { data: roles = [] } = useQuery({
//     queryKey: ['roles'],
//     queryFn: () => api.getRoles({ limit: 200 }),
//   });

//   const { data: permissions = [] } = useQuery({
//     queryKey: ['permissions'],
//     queryFn: () => api.getPermissions({ limit: 200 }),
//   });

//   const updateUserMutation = useMutation({
//     mutationFn: ({ id, data }) => api.updateUser(id, data),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['admin-users'] });
//       queryClient.invalidateQueries({ queryKey: ['user', selectedUser.id] });
//       setShowEditDialog(false);
//       setSelectedUser(null);
//       toast.success('User updated successfully');
//     },
//     onError: (error) => {
//       console.error('Failed to update user:', error);
//       toast.error(`Failed to update user: ${ error.message}`);
//     }
//   });

//   const updateRolesMutation = useMutation({
//     mutationFn: ({ clientId, roleIds }) => api.updateUserClientRoles(
//       currentUserIdInEdit,
//       clientId,
//       {roleIds: roleIds}),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['user', currentUserIdInEdit] });
//       toast.success("Roles updated successfully!");
//     },
//     onError: (error) => {
//       toast.error(`Failed to update roles: ${error.message}`);
//     }
//   });

//    const addClientMembershipMutation = useMutation({
//     mutationFn: ({ clientId, roleIds }) => api.addUserToClient(
//       currentUserIdInEdit,
//       clientId,
//       {roleIds: roleIds}),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['user', currentUserIdInEdit] });
//       queryClient.invalidateQueries({ queryKey: ['clients'] });
//       setAddingClientId('');
//       setSelectedNewRoles([]);
//       toast.success("Added to new client successfully!");
//     },
//     onError: (err) => {
//       toast.error(`Failed to add to client: ${err.message}`);
//     },
//   });

//   const removeClientMembershipMutation = useMutation({
//     mutationFn: (clientId) => api.removeUserFromClient(
//       currentUserIdInEdit,
//       clientId),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['user', currentUserIdInEdit] });
//       queryClient.invalidateQueries({ queryKey: ['clients'] });
//       toast.success("Removed from client successfully!");
//     },
//     onError: (err) => {
//       toast.error(`Failed to remove from client: ${err.message}`);
//     },
//   });

//   const inviteUserMutation = useMutation({
//     mutationFn: (invitePayload) => api.inviteUser(invitePayload),
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['admin-users'] });
//       toast.success('Invitation sent successfully');
//       setShowInviteDialog(false);
//       setInviteData({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' });
//     },
//     onError: (error) => {
//       console.error('Failed to send invitation:', error);
//       toast.error(`Failed to send invitation: ${error.response?.data?.error || error.message}`);
//     }
//   });

//   const handleInvite = async () => {
//     const payload = {
//       email: inviteData.email,
//       inviteType: inviteData.inviteType,
//       platformRole: inviteData.platformRole,
//       invited_by_message: '',
//     };

//     if (inviteData.inviteType === 'client') {
//       payload.clientId = isInternalAdmin ? inviteData.clientId : activeClientId;

//       if (!payload.clientId) {
//         toast.error('Client is required for client invite.');
//         return;
//       }
//       if (inviteData.roleIds.length === 0) {
//         toast.error('At least one role is required for client invite.');
//         return;
//       }
//       payload.role_ids = inviteData.roleIds;
//     } else if (inviteData.inviteType === 'platform') {
//       if (!inviteData.platformRole) {
//         toast.error('Platform role is required for platform invite.');
//         return;
//       }
//     }

//     inviteUserMutation.mutate(payload);
//   };

//   const handleEditUser = (user) => {
//     setSelectedUser(user);
//     setShowEditDialog(true);
//   };

//   const handleUpdateUser = async () => {
//     if (!selectedUser) return;

//     const updatePayload = {
//       full_name: selectedUser.full_name,
//       phone: selectedUser.phone,
//       job_title: selectedUser.job_title,
//       avatar_storage_key: selectedUser.avatar_storage_key,
//       status: selectedUser.status,
//     };

//     if (isInternalAdmin && selectedUser.platform_role) {
//       updatePayload.platform_role = selectedUser.platform_role;
//     }

//     // CHANGED: Deduplicate roleIds in updatePayload.memberships
//     if (selectedUser.memberships && Array.isArray(selectedUser.memberships)) {
//       updatePayload.memberships = selectedUser.memberships.map(m => ({
//         clientId: m.client_id,
//         roleIds: Array.from(new Set(m.roles.map(r => r.id))), // ADDED: Deduplication
//       }));
//     }

//     updateUserMutation.mutate(
//       {
//         id: selectedUser.id,
//         data: updatePayload
//       });
//   };

//   const filteredUsers = users.filter(user => {
//     const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       user.email?.toLowerCase().includes(searchTerm.toLowerCase());

//     let matchesRole = true;
//     if (roleFilter !== 'all') {
//       const hasPlatformRole = user.platform_role === roleFilter;
//       const hasMembershipRole = user.memberships.some(m => m.roles.some(role => role.id === roleFilter));
//       matchesRole = hasPlatformRole || hasMembershipRole;
//     }

//     return matchesSearch && matchesRole;
//   });

//   const getInitials = (name) => {
//     if (!name) return 'U';
//     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
//   };

//   const columns = [
//     {
//       header: 'User',
//       render: (row) => (
//         <div className="flex items-center gap-3">
//           <AvatarImg avatarKey={row.avatar_storage_key} fallback={getInitials(row.full_name)} />
//           <div>
//             <p className="font-medium text-slate-900">{row.full_name || 'No Name'}</p>
//             <p className="text-sm text-slate-500">{row.email}</p>
//           </div>
//         </div>
//       )
//     },
//     {
//       header: 'Role(s)',
//       render: (row) => (
//         <div className="flex flex-col gap-0.5">
//           {row.platform_role && (
//             <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
//               {row.platform_role.replace(/_/g, ' ')}
//             </span>
//           )}
//           {row.memberships.map(m => (
//             <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
//               {`${m.client_name}: ${m.roles.map(r => r.name).join(', ')}`}
//             </span>
//           ))}
//         </div>
//       )
//     },
//     isInternalAdmin && {
//       header: 'Client',
//       render: (row) => (
//         <div className="flex flex-col gap-0.5">
//           {row.memberships.length > 0 ? (
//             row.memberships.map(m => (
//               <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
//                 {m.client_name}
//               </span>
//             ))
//           ) : (
//             <span className="px-2 py-0.5 text-slate-500">- N/A -</span>
//           )}
//         </div>
//       )
//     },
//     {
//       header: 'Status',
//       render: (row) => <StatusBadge status={row.status || 'active'} />
//     },
//     {
//       header: 'Actions',
//       render: (row) => (
//         <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditUser(row); }}>
//           <Edit2 className="h-4 w-4" />
//         </Button>
//       )
//     },
//   ].filter(Boolean);

//   const availableClientsToAdd = clients?.filter(
//     (client) => !selectedUser?.memberships?.some((m) => m.client_id === client.id)
//   );

//   return (
//     <AdminOnly>
//       <div className="space-y-6">
//         <PageHeader
//           title="Users"
//           subtitle="Manage user accounts, roles, and permissions across clients and platform."
//           actions={
//             <>
//               {canInviteClientUser || canInvitePlatformUser ? (
//                 <Button
//                   onClick={() => setShowInviteDialog(true)}
//                   className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
//                 >
//                   <Mail className="h-4 w-4 mr-2" />
//                   Invite User
//                 </Button>
//               ) : null}
//               {isInternalAdmin && (
//                 <Button
//                   onClick={() => setShowAddRoleDialog(true)}
//                   className="bg-gray-200 text-gray-800 hover:bg-gray-300"
//                 >
//                   <Plus className="h-4 w-4 mr-2" />
//                   Add Role Type
//                 </Button>
//               )}
//               {isInternalAdmin && (
//                 <Button
//                   onClick={() => setShowAddPermissionsDialog(true)}
//                   className="bg-gray-200 text-gray-800 hover:bg-gray-300"
//                 >
//                   <Plus className="h-4 w-4 mr-2" />
//                   Add Permission Type
//                 </Button>
//               )}
//             </>
//           }
//         />

//         <Card className="border-0 shadow-sm">
//           <CardContent className="p-4">
//             <div className="flex flex-col sm:flex-row gap-4">
//               <div className="relative flex-1">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//                 <Input
//                   placeholder="Search users by name or email..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pl-9"
//                 />
//               </div>
//               <Select value={roleFilter} onValueChange={setRoleFilter}>
//                 <SelectTrigger className="w-full sm:w-48">
//                   <SelectValue placeholder="Filter by Role" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="all">All Roles</SelectItem>
//                   <SelectItem value="super_admin">Super Admin</SelectItem>
//                   <SelectItem value="platform_admin">Platform Admin</SelectItem>
//                   <SelectItem value="platform_user">Platform User</SelectItem>
//                   {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
//                 </SelectContent>
//               </Select>
//             </div>
//           </CardContent>
//         </Card>

//         {users.length === 0 && !isLoading ? (
//           <EmptyState
//             icon={Users}
//             title="No users yet"
//             description="Invite users to get started"
//             action={() => setShowInviteDialog(true)}
//             actionLabel="Invite User"
//           />
//         ) : (
//           <DataTable
//             columns={columns}
//             data={filteredUsers}
//             isLoading={isLoading}
//             emptyMessage="No users match your search"
//           />
//         )}

//         {/* Invite Dialog */}
//         <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
//           <DialogContent className="sm:max-w-md">
//             <DialogHeader>
//               <DialogTitle>Invite User</DialogTitle>
//             </DialogHeader>
//             <div className="space-y-4 py-4 overflow-y-auto" >
//               <div>
//                 <Label>Email Address</Label>
//                 <Input
//                   type="email"
//                   placeholder="user@example.com"
//                   value={inviteData.email}
//                   onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
//                   className="mt-1"
//                 />
//               </div>
//               {isInternalAdmin && <div>
//                 <Label> Invite Type</Label>
//                 <Select value={inviteData.inviteType} onValueChange={(v) => {
//                   setInviteData({ ...inviteData, inviteType: v, platformRole: '', roleIds: [], clientId: '' });
//                 }}>
//                   <SelectTrigger className="mt-1">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="platform">Platform User </SelectItem>
//                     <SelectItem value="client">Client User</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>}
//               {isInternalAdmin && inviteData.inviteType === 'platform' && (
//                 <div>
//                   <Label> Platform Role</Label>
//                   <Select value={inviteData.platformRole} onValueChange={(v) => { console.log(inviteData, v);
//                     setInviteData({ ...inviteData, platformRole: v })}}>
//                     <SelectTrigger className="mt-1">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="super_admin">Super Admin</SelectItem>
//                       <SelectItem value="platform_admin">Platform Admin</SelectItem>
//                       <SelectItem value="platform_user">Platform User</SelectItem>
//                     </SelectContent>
//                   </Select>
//                   <p className="text-xs text-slate-500 mt-1">
//                     {inviteData.platformRole === 'super_admin' ? 'Highest platform access.' :
//                      inviteData.platformRole === 'platform_admin' ? 'Full platform access.' :
//                     'Standard platform user access.'}
//                   </p>
//                 </div>
//               )}
//               {inviteData.inviteType === 'client' && (
//                 <>
//                   <div>
//                     <Label>Role(s)</Label>
//                     <Select
//                       value={inviteData.roleIds[0] || ''}
//                       onValueChange={(v) => setInviteData({ ...inviteData, roleIds: [v] })}
//                     >
//                       <SelectTrigger className="mt-1">
//                         <SelectValue placeholder="Select role" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
//                       </SelectContent>
//                     </Select>
//                     <p className="text-xs text-slate-500 mt-1">
//                       Assign one or more roles for the user within the selected client.
//                     </p>
//                   </div>
//                   {(isInternalAdmin || activeClientId) && (
//                     <div>
//                       <Label>Assign to Client</Label>
//                       <Select
//                         value={inviteData.clientId || ''}
//                         onValueChange={(v) => setInviteData({ ...inviteData, clientId: v })}
//                       >
//                         <SelectTrigger className="mt-1">
//                           <SelectValue placeholder="Select client" />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {isInternalAdmin ? (
//                             clients.map(client => (
//                               <SelectItem key={client.id} value={client.id}>
//                                 {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
//                               </SelectItem>
//                             ))
//                           ) : (
//                             activeClientId && clients.filter(c => c.id === activeClientId).map(client => (
//                               <SelectItem key={client.id} value={client.id}>
//                                 {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
//                               </SelectItem>
//                             ))
//                           )}
//                         </SelectContent>
//                       </Select>
//                     </div>
//                   )}
//                 </>
//               )}
//             </div>
//             <DialogFooter>
//               <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
//               <Button
//                 onClick={handleInvite}
//                 disabled={!inviteData.email || inviteUserMutation.isPending || (inviteData.inviteType === 'platform' && !inviteData.platformRole) || (inviteData.inviteType === 'client' && ((!inviteData.clientId && !activeClientId) || inviteData.roleIds.length === 0))}
//                 className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
//               >
//                 {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Edit User Dialog */}
//         <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
//           <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
//             <DialogHeader>
//               <DialogTitle>Edit User: {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
//             </DialogHeader>
//             {isLoadingDetailedUser ? (
//               <div className="text-center p-4">Loading user details...</div>
//             ) : selectedUser && (
//               <div className="space-y-4 py-4">
//                 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
//                   <AvatarImg avatarKey={selectedUser.avatar_storage_key} fallback={getInitials(selectedUser.full_name)} />
//                   <div>
//                     <p className="font-medium">{selectedUser.full_name || 'No Name'}</p>
//                     <p className="text-sm text-slate-500">{selectedUser.email}</p>
//                   </div>
//                 </div>

//                 {/* Editable User Details */}
//                 <div>
//                   <Label htmlFor="fullName">Full Name</Label>
//                   <Input
//                     id="fullName"
//                     value={selectedUser.full_name || ''}
//                     onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
//                     className="mt-1"
//                   />
//                 </div>
//                 <div>
//                   <Label htmlFor="phone">Phone</Label>
//                   <Input
//                     id="phone"
//                     value={selectedUser.phone || ''}
//                     onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
//                     className="mt-1"
//                   />
//                 </div>
//                 <div>
//                   <Label htmlFor="jobTitle">Job Title</Label>
//                   <Input
//                     id="jobTitle"
//                     value={selectedUser.job_title || ''}
//                     onChange={(e) => setSelectedUser({ ...selectedUser, job_title: e.target.value })}
//                     className="mt-1"
//                   />
//                 </div>

//                 {isInternalAdmin && (
//                   <div>
//                     <Label>Platform Role</Label>
//                     <Select
//                       value={selectedUser.platform_role || ''}
//                       onValueChange={(v) => setSelectedUser({ ...selectedUser, platform_role: v })}
//                     >
//                       <SelectTrigger className="mt-1">
//                         <SelectValue placeholder="Select platform role" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="super_admin">Super Admin</SelectItem>
//                         <SelectItem value="platform_admin">Platform Admin</SelectItem>
//                         <SelectItem value="platform_user">Platform User</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 )}

//                 {isInternalAdmin && (
//                   <div>
//                     <Label>Account Status</Label>
//                     <Select
//                       value={selectedUser.status || 'active'}
//                       onValueChange={(v) => setSelectedUser({ ...selectedUser, status: v })}
//                     >
//                       <SelectTrigger className="mt-1">
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="active">Active</SelectItem>
//                         <SelectItem value="inactive">Inactive</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 )}

//                 <div className="space-y-6">
//                   <h3 className="font-semibold text-lg mb-3">Client Memberships & Roles</h3>
//                   {selectedUser.memberships?.length > 0 ? (
//                     selectedUser.memberships.map((membership, index) => (
//                       <div key={membership.client_id} className="border p-4 rounded-md shadow-sm space-y-3">
//                         <div className="flex justify-between items-center">
//                           <h4 className="text-base font-semibold">{membership.client_name}</h4>
//                           <Button
//                             variant="destructive"
//                             size="sm"
//                             onClick={() => removeClientMembershipMutation.mutate(membership.client_id)}
//                             disabled={removeClientMembershipMutation.isLoading}
//                           >
//                             <Trash2Icon className="h-4 w-4 mr-2" /> Remove from Client
//                           </Button>
//                         </div>
//                         <div className="space-y-2">
//                           <p className="text-sm font-medium">Roles in {membership.client_name}:</p>
//                           <div className="flex flex-wrap gap-2 mb-2">
//                             {membership.roles?.map((role) => (
//                               <Badge key={role.id} variant="secondary">{role.name}</Badge>
//                             ))}
//                           </div>

//                           {/* Multi-select Role Editor for existing membership */}
//                           <Popover open={openRoleSelect === membership.client_id} onOpenChange={(isOpen) => setOpenRoleSelect(isOpen ? membership.client_id : null)}>
//                             <PopoverTrigger asChild>
//                               <Button variant="outline" className="w-[200px] justify-between">
//                                 Manage Roles
//                                 <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                               </Button>
//                             </PopoverTrigger>
//                             <PopoverContent className="w-[200px] p-0">
//                               <Command>
//                                 <CommandGroup>
//                                   {roles?.filter(r => r.client_id == null || r.client_id === membership.client_id).map(role => { // CHANGED: == null
//                                     const isSelected = membership.roles.some(mr => mr.id === role.id);
//                                     return (
//                                       <CommandItem
//                                         key={role.id}
//                                         onSelect={() => {
//                                           document.getElementById(`role-${membership.client_id}-${role.id}`)?.click();
//                                         }}
//                                       >
//                                         <div className="flex items-center space-x-2">
//                                           <Checkbox
//                                             id={`role-${membership.client_id}-${role.id}`}
//                                             checked={isSelected}
//                                             onCheckedChange={(checked) => {
//                                               const currentRoleIdsSet = new Set(membership.roles.map(r => r.id));
//                                               if (checked) {
//                                                 currentRoleIdsSet.add(role.id);
//                                               } else {
//                                                 currentRoleIdsSet.delete(role.id);
//                                               }
//                                               const updatedRoleIdsArray = Array.from(currentRoleIdsSet);

//                                               const updatedMemberships = [...selectedUser.memberships];
//                                               updatedMemberships[index] = {
//                                                 ...updatedMemberships[index],
//                                                 roles: roles.filter(r => updatedRoleIdsArray.includes(r.id))
//                                               };
//                                               setSelectedUser({ ...selectedUser, memberships: updatedMemberships });

//                                               updateRolesMutation.mutate({ clientId: membership.client_id, roleIds: updatedRoleIdsArray });
//                                             }}
//                                           />
//                                           <Label>{role.name}</Label>
//                                         </div>
//                                       </CommandItem>
//                                     );
//                                   })}
//                                 </CommandGroup>
//                               </Command>
//                             </PopoverContent>
//                           </Popover>
//                         </div>
//                       </div>
//                     ))
//                   ) : (
//                     <p className="text-muted-foreground">This user is not a member of any clients yet.</p>
//                   )}

//                   {/* Add to new Client Section */}
//                   <div className="border-t pt-4 mt-6">
//                     <h3 className="text-lg font-semibold mb-3">Add User to a New Client</h3>
//                     <div className="flex flex-col gap-4">
//                       <Select
//                         value={addingClientId}
//                         onValueChange={(value) => {
//                           setAddingClientId(value);
//                           setSelectedNewRoles([]);
//                         }}
//                         disabled={availableClientsToAdd?.length === 0}
//                       >
//                         <SelectTrigger className="w-[200px]">
//                           <SelectValue placeholder={availableClientsToAdd?.length === 0 ? "No more clients to add" : "Select Client"} />
//                         </SelectTrigger>
//                         <SelectContent>
//                           {availableClientsToAdd?.map((client) => (
//                             <SelectItem key={client.id} value={client.id}>
//                               {client.company_name}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>

//                       {addingClientId && (
//                         <div className="space-y-2">
//                           <Label>Assign Roles for {clients?.find(t => t.id === addingClientId)?.company_name}:</Label>
//                           <Popover>
//                             <PopoverTrigger asChild>
//                               <Button variant="outline" className="w-[200px] justify-between">
//                                 {selectedNewRoles.length === 0
//                                   ? "Select Roles"
//                                   : `${selectedNewRoles.length} role(s) selected`}
//                                 <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//                               </Button>
//                             </PopoverTrigger>
//                             <PopoverContent className="w-[200px] p-0">
//                               <Command>
//                                 <CommandGroup>
//                                   {roles?.filter(r => r.client_id == null || r.client_id === addingClientId).map(role => ( // CHANGED: == null
//                                     <CommandItem
//                                       key={role.id}
//                                       onSelect={() => {
//                                         document.getElementById(`new-client-role-${role.id}`)?.click();
//                                       }}
//                                     >
//                                       <div className="flex items-center space-x-2">
//                                         <Checkbox
//                                           id={`new-client-role-${role.id}`}
//                                           checked={selectedNewRoles.includes(role.id)}
//                                           onCheckedChange={(checked) => {
//                                             setSelectedNewRoles((prev) => {
//                                               const prevSet = new Set(prev);
//                                               if (checked) {
//                                                 prevSet.add(role.id);
//                                               } else {
//                                                 prevSet.delete(role.id);
//                                               }
//                                               return Array.from(prevSet);
//                                             });
//                                           }}
//                                         />
//                                         <Label htmlFor={`new-client-role-${role.id}`}>{role.name}</Label>
//                                       </div>
//                                     </CommandItem>
//                                   ))}
//                                 </CommandGroup>
//                               </Command>
//                             </PopoverContent>
//                           </Popover>

//                           <Button
//                             onClick={() => addClientMembershipMutation.mutate({ clientId: addingClientId, roleIds: selectedNewRoles })}
//                             disabled={!addingClientId || selectedNewRoles.length === 0 || addClientMembershipMutation.isLoading}
//                           >
//                             <PlusIcon className="h-4 w-4 mr-2" /> Add User to Client
//                           </Button>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}

//             <DialogFooter>
//               <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
//               <Button
//                 onClick={handleUpdateUser}
//                 disabled={updateUserMutation.isPending}
//                 className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
//               >
//                 {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         {/* Roles and Permission Dialogs */}
//         <AddRoleDialog permissions={permissions} open={showAddRoleDialog} onClose={setShowAddRoleDialog} onSuccess={() => {
//           queryClient.invalidateQueries({ queryKey: ['roles'] });
//         }} />
//         <AddPermissionDialog open={showAddPermissionsDialog} onClose={setShowAddPermissionsDialog} onSuccess={() => {
//           queryClient.invalidateQueries({ queryKey: ['permissions'] });
//         }} />
//       </div>
//     </AdminOnly>
//   );
// }
// // import React, { useState, useEffect } from 'react';
// // import { api } from '@/api/apiClient';
// // import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// // import AdminOnly from '@/components/AdminOnly';
// // import { Plus, Search, Edit2, Users, Mail } from 'lucide-react';
// // import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// // import { Label } from "@/components/ui/label";
// // import { AvatarImg } from "@/components/UserAvatar";
// // import PageHeader from '@/components/shared/PageHeader';
// // import DataTable from '@/components/shared/DataTable';
// // import StatusBadge from '@/components/shared/StatusBadge';
// // import EmptyState from '@/components/shared/EmptyState';
// // import { toast } from 'sonner';
// // import { useClient } from '@/lib/ClientContext';
// // import { usePermission } from '@/hooks/usePermission';
// // import { usePlatformRole } from '@/hooks/usePlatfromRole';
// // import AddRoleDialog from '@/components/roles/AddRoleDialog';
// // import AddPermissionDialog from '@/components/permissions/AddPermissionDialog';
// // import { Badge } from "@/components/ui/badge";
// // import { Checkbox } from "@/components/ui/checkbox";
// // import { PlusIcon, Trash2Icon, ChevronDownIcon } from "lucide-react";
// // import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// // import { Command, CommandGroup, CommandItem } from "@/components/ui/command";


// // // --- JSDoc Type Definitions for improved type checking ---
// // /**
// //  * @typedef {object} Role
// //  * @property {string} id
// //  * @property {string} name
// //  * @property {string | null} client_id // Added client_id to Role type, assuming roles can be client-specific or global (null)
// //  */

// // /**
// //  * @typedef {object} ClientMembership
// //  * @property {string} id
// //  * @property {string} client_id
// //  * @property {string} client_name // Provided by backend GET /api/users
// //  * @property {boolean} is_active
// //  * @property {string} created_at
// //  * @property {Role[]} roles
// //  */

// // /**
// //  * @typedef {object} UserData
// //  * @property {string} id
// //  * @property {string} email
// //  * @property {string} full_name
// //  * @property {string} platform_role
// //  * @property {boolean} is_active
// //  * @property {string} last_login_at
// //  * @property {string} created_at
// //  * @property {string} [avatar_storage_key]
// //  * @property {string} [phone]
// //  * @property {string} [job_title]
// //  * @property {string} status
// //  * @property {ClientMembership[]} memberships
// //  */

// // export default function AdminUsers() {
// //   const [searchTerm, setSearchTerm] = useState('');
// //   const [roleFilter, setRoleFilter] = useState('all');
// //   const [showInviteDialog, setShowInviteDialog] = useState(false);
// //   const { activeClientId } = useClient();
// //   const [inviteData, setInviteData] = useState({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' });
// //   /** @type {UserData | null} */
// //   const [selectedUser, setSelectedUser] = useState(null);
// //   const [showEditDialog, setShowEditDialog] = useState(false);
// //   const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
// //   const [showAddPermissionsDialog, setShowAddPermissionsDialog] = useState(false);
// //   const currentUserIdInEdit = selectedUser?.id; // Use this for mutations related to the user in the edit dialog
// //   const [addingClientId, setAddingClientId] = useState('');
// //   const [selectedNewRoles, setSelectedNewRoles] = useState([]);
// //   const [openRoleSelect, setOpenRoleSelect] = useState(false); // State to manage popover for multi-select

// //   const queryClient = useQueryClient();

// //   const isSuperAdmin = usePlatformRole('super_admin');
// //   const isPlatformAdmin = usePlatformRole('platform_admin');
// //   const isInternalAdmin = isSuperAdmin || isPlatformAdmin;

// //   const canInviteClientUser = usePermission('client:users.invite');
// //   const canInvitePlatformUser = isInternalAdmin;

// //   const [page, setPage] = useState(1);

// //   const { data: usersData = {}, isLoading } = useQuery({
// //     queryKey: ['admin-users', page, searchTerm, roleFilter],
// //     queryFn: () => api.getUsers({
// //       page,
// //       limit: 50,
// //       order: '-created_at',
// //       search: searchTerm,
// //       platform_role: roleFilter === 'super_admin' || roleFilter === 'platform_admin' || roleFilter === 'platform_user' ? roleFilter : undefined,
// //     }),
// //   });
// //   const users = usersData?.users ?? [];

// //   // Fetch detailed user data for the selected user when the dialog opens
// //   const { data: detailedSelectedUser, isLoading: isLoadingDetailedUser } = useQuery({
// //     queryKey: ['user', selectedUser?.id],
// //     queryFn: () => api.getUser(selectedUser.id),
// //     enabled: !!selectedUser?.id && showEditDialog, // Only fetch when a user is selected and dialog is open
// //   });

// //   // Update selectedUser state with detailed data once fetched
// //   useEffect(() => {
// //     if (detailedSelectedUser) {
// //       setSelectedUser(detailedSelectedUser);
// //     }
// //   }, [detailedSelectedUser]);


// //   const { data: clients = [] } = useQuery({
// //     queryKey: ['clients'],
// //     queryFn: () => api.getClients({ order: 'company_name', limit: 200 }),
// //     enabled: isInternalAdmin || canInviteClientUser, // Enable clients fetch for internal admins and client admins
// //   });

// //   const { data: roles = [] } = useQuery({
// //     queryKey: ['roles'],
// //     queryFn: () => api.getRoles({ limit: 200 }),
// //   });

// //   const { data: permissions = [] } = useQuery({
// //     queryKey: ['permissions'],
// //     queryFn: () => api.getPermissions({ limit: 200 }),
// //   });

// //   const updateUserMutation = useMutation({
// //     mutationFn: ({ id, data }) => api.updateUser(id, data),
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ['admin-users'] });
// //       queryClient.invalidateQueries({ queryKey: ['user', selectedUser.id] }); // Invalidate specific user query
// //       setShowEditDialog(false);
// //       setSelectedUser(null);
// //       toast.success('User updated successfully');
// //     },
// //     onError: (error) => {
// //       console.error('Failed to update user:', error);
// //       toast.error(`Failed to update user: ${ error.message}`);
// //     }
// //   });

// //   // Mutation to update user's roles within a specific client
// //   const updateRolesMutation = useMutation({
// //     mutationFn: ({ clientId, roleIds }) => api.updateUserClientRoles(
// //       currentUserIdInEdit,
// //       clientId,
// //       {roleIds: roleIds}),
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ['user', currentUserIdInEdit] });
// //       toast.success("Roles updated successfully!");
// //     },
// //     onError: (error) => {
// //       toast.error(`Failed to update roles: ${error.message}`);
// //     }
// //   });

// //   // Mutation to add user to a new client with roles
// //    const addClientMembershipMutation = useMutation({
// //     mutationFn: ({ clientId, roleIds }) => api.addUserToClient(
// //       currentUserIdInEdit,
// //       clientId,
// //       {roleIds: roleIds}),
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ['user', currentUserIdInEdit] });
// //       queryClient.invalidateQueries({ queryKey: ['clients'] });
// //       setAddingClientId('');
// //       setSelectedNewRoles([]);
// //       toast.success("Added to new client successfully!");
// //     },
// //     onError: (err) => {
// //       toast.error(`Failed to add to client: ${err.message}`);
// //     },
// //   });

// //   // Mutation to remove user from a client
// //   const removeClientMembershipMutation = useMutation({
// //     mutationFn: (clientId) => api.removeUserFromClient(
// //       currentUserIdInEdit,
// //       clientId),
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ['user', currentUserIdInEdit] });
// //       queryClient.invalidateQueries({ queryKey: ['clients'] });
// //       toast.success("Removed from client successfully!");
// //     },
// //     onError: (err) => {
// //       toast.error(`Failed to remove from client: ${err.message}`);
// //     },
// //   });

// //   const inviteUserMutation = useMutation({
// //     mutationFn: (invitePayload) => api.inviteUser(invitePayload),
// //     onSuccess: () => {
// //       queryClient.invalidateQueries({ queryKey: ['admin-users'] });
// //       toast.success('Invitation sent successfully');
// //       setShowInviteDialog(false);
// //       setInviteData({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' });
// //     },
// //     onError: (error) => {
// //       console.error('Failed to send invitation:', error);
// //       toast.error(`Failed to send invitation: ${error.response?.data?.error || error.message}`);
// //     }
// //   });

// //   const handleInvite = async () => {
// //     const payload = {
// //       email: inviteData.email,
// //       inviteType: inviteData.inviteType,
// //       platformRole: inviteData.platformRole,
// //       invited_by_message: '',
// //     };

// //     if (inviteData.inviteType === 'client') {
// //       payload.clientId = isInternalAdmin ? inviteData.clientId : activeClientId;

// //       if (!payload.clientId) {
// //         toast.error('Client is required for client invite.');
// //         return;
// //       }
// //       if (inviteData.roleIds.length === 0) {
// //         toast.error('At least one role is required for client invite.');
// //         return;
// //       }
// //       payload.role_ids = inviteData.roleIds;
// //     } else if (inviteData.inviteType === 'platform') {
// //       if (!inviteData.platformRole) {
// //         toast.error('Platform role is required for platform invite.');
// //         return;
// //       }
// //     }

// //     inviteUserMutation.mutate(payload);
// //   };

// //   const handleEditUser = (user) => {
// //     setSelectedUser(user); // Pass the user directly. useEffect will fetch detailed data.
// //     setShowEditDialog(true);
// //   };

// //   const handleUpdateUser = async () => {
// //     if (!selectedUser) return;

// //     const updatePayload = {
// //       full_name: selectedUser.full_name,
// //       phone: selectedUser.phone,
// //       job_title: selectedUser.job_title,
// //       avatar_storage_key: selectedUser.avatar_storage_key,
// //       status: selectedUser.status,
// //     };

// //     if (isInternalAdmin && selectedUser.platform_role) {
// //       updatePayload.platform_role = selectedUser.platform_role;
// //     }

// //     updateUserMutation.mutate(
// //       {
// //         id: selectedUser.id,
// //         data: updatePayload
// //       });
// //   };

// //   const filteredUsers = users.filter(user => {
// //     const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
// //       user.email?.toLowerCase().includes(searchTerm.toLowerCase());

// //     let matchesRole = true;
// //     if (roleFilter !== 'all') {
// //       const hasPlatformRole = user.platform_role === roleFilter;
// //       const hasMembershipRole = user.memberships.some(m => m.roles.some(role => role.id === roleFilter));
// //       matchesRole = hasPlatformRole || hasMembershipRole;
// //     }

// //     return matchesSearch && matchesRole;
// //   });

// //   const getInitials = (name) => {
// //     if (!name) return 'U';
// //     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
// //   };

// //   const columns = [
// //     {
// //       header: 'User',
// //       render: (row) => (
// //         <div className="flex items-center gap-3">
// //           <AvatarImg avatarKey={row.avatar_storage_key} fallback={getInitials(row.full_name)} />
// //           <div>
// //             <p className="font-medium text-slate-900">{row.full_name || 'No Name'}</p>
// //             <p className="text-sm text-slate-500">{row.email}</p>
// //           </div>
// //         </div>
// //       )
// //     },
// //     {
// //       header: 'Role(s)',
// //       render: (row) => (
// //         <div className="flex flex-col gap-0.5">
// //           {row.platform_role && (
// //             <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
// //               {row.platform_role.replace(/_/g, ' ')}
// //             </span>
// //           )}
// //           {row.memberships.map(m => (
// //             <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
// //               {`${m.client_name}: ${m.roles.map(r => r.name).join(', ')}`}
// //             </span>
// //           ))}
// //         </div>
// //       )
// //     },
// //     isInternalAdmin && {
// //       header: 'Client',
// //       render: (row) => (
// //         <div className="flex flex-col gap-0.5">
// //           {row.memberships.length > 0 ? (
// //             row.memberships.map(m => (
// //               <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
// //                 {m.client_name}
// //               </span>
// //             ))
// //           ) : (
// //             <span className="px-2 py-0.5 text-slate-500">- N/A -</span>
// //           )}
// //         </div>
// //       )
// //     },
// //     {
// //       header: 'Status',
// //       render: (row) => <StatusBadge status={row.status || 'active'} />
// //     },
// //     {
// //       header: 'Actions',
// //       render: (row) => (
// //         <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditUser(row); }}>
// //           <Edit2 className="h-4 w-4" />
// //         </Button>
// //       )
// //     },
// //   ].filter(Boolean);

// //   const availableClientsToAdd = clients?.filter(
// //     (client) => !selectedUser?.memberships?.some((m) => m.client_id === client.id)
// //   );

// //   return (
// //     <AdminOnly>
// //       <div className="space-y-6">
// //         <PageHeader
// //           title="Users"
// //           subtitle="Manage user accounts, roles, and permissions across clients and platform."
// //           actions={
// //             <>
// //               {canInviteClientUser || canInvitePlatformUser ? (
// //                 <Button
// //                   onClick={() => setShowInviteDialog(true)}
// //                   className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
// //                 >
// //                   <Mail className="h-4 w-4 mr-2" />
// //                   Invite User
// //                 </Button>
// //               ) : null}
// //               {isInternalAdmin && (
// //                 <Button
// //                   onClick={() => setShowAddRoleDialog(true)}
// //                   className="bg-gray-200 text-gray-800 hover:bg-gray-300"
// //                 >
// //                   <Plus className="h-4 w-4 mr-2" />
// //                   Add Role Type
// //                 </Button>
// //               )}
// //               {isInternalAdmin && (
// //                 <Button
// //                   onClick={() => setShowAddPermissionsDialog(true)}
// //                   className="bg-gray-200 text-gray-800 hover:bg-gray-300"
// //                 >
// //                   <Plus className="h-4 w-4 mr-2" />
// //                   Add Permission Type
// //                 </Button>
// //               )}
// //             </>
// //           }
// //         />

// //         <Card className="border-0 shadow-sm">
// //           <CardContent className="p-4">
// //             <div className="flex flex-col sm:flex-row gap-4">
// //               <div className="relative flex-1">
// //                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
// //                 <Input
// //                   placeholder="Search users by name or email..."
// //                   value={searchTerm}
// //                   onChange={(e) => setSearchTerm(e.target.value)}
// //                   className="pl-9"
// //                 />
// //               </div>
// //               <Select value={roleFilter} onValueChange={setRoleFilter}>
// //                 <SelectTrigger className="w-full sm:w-48">
// //                   <SelectValue placeholder="Filter by Role" />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   <SelectItem value="all">All Roles</SelectItem>
// //                   <SelectItem value="super_admin">Super Admin</SelectItem>
// //                   <SelectItem value="platform_admin">Platform Admin</SelectItem>
// //                   <SelectItem value="platform_user">Platform User</SelectItem>
// //                   {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
// //                 </SelectContent>
// //               </Select>
// //             </div>
// //           </CardContent>
// //         </Card>

// //         {users.length === 0 && !isLoading ? (
// //           <EmptyState
// //             icon={Users}
// //             title="No users yet"
// //             description="Invite users to get started"
// //             action={() => setShowInviteDialog(true)}
// //             actionLabel="Invite User"
// //           />
// //         ) : (
// //           <DataTable
// //             columns={columns}
// //             data={filteredUsers}
// //             isLoading={isLoading}
// //             emptyMessage="No users match your search"
// //           />
// //         )}

// //         {/* Invite Dialog */}
// //         <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
// //           <DialogContent className="sm:max-w-md">
// //             <DialogHeader>
// //               <DialogTitle>Invite User</DialogTitle>
// //             </DialogHeader>
// //             <div className="space-y-4 py-4 overflow-y-auto" >
// //               <div>
// //                 <Label>Email Address</Label>
// //                 <Input
// //                   type="email"
// //                   placeholder="user@example.com"
// //                   value={inviteData.email}
// //                   onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
// //                   className="mt-1"
// //                 />
// //               </div>
// //               {isInternalAdmin && <div>
// //                 <Label> Invite Type</Label>
// //                 <Select value={inviteData.inviteType} onValueChange={(v) => {
// //                   setInviteData({ ...inviteData, inviteType: v, platformRole: '', roleIds: [], clientId: '' });
// //                 }}>
// //                   <SelectTrigger className="mt-1">
// //                     <SelectValue />
// //                   </SelectTrigger>
// //                   <SelectContent>
// //                     <SelectItem value="platform">Platform User </SelectItem>
// //                     <SelectItem value="client">Client User</SelectItem>
// //                   </SelectContent>
// //                 </Select>
// //               </div>}
// //               {isInternalAdmin && inviteData.inviteType === 'platform' && (
// //                 <div>
// //                   <Label> Platform Role</Label>
// //                   <Select value={inviteData.platformRole} onValueChange={(v) => { console.log(inviteData, v);
// //                     setInviteData({ ...inviteData, platformRole: v })}}>
// //                     <SelectTrigger className="mt-1">
// //                       <SelectValue />
// //                     </SelectTrigger>
// //                     <SelectContent>
// //                       <SelectItem value="super_admin">Super Admin</SelectItem>
// //                       <SelectItem value="platform_admin">Platform Admin</SelectItem>
// //                       <SelectItem value="platform_user">Platform User</SelectItem>
// //                     </SelectContent>
// //                   </Select>
// //                   <p className="text-xs text-slate-500 mt-1">
// //                     {inviteData.platformRole === 'super_admin' ? 'Highest platform access.' :
// //                      inviteData.platformRole === 'platform_admin' ? 'Full platform access.' :
// //                     'Standard platform user access.'}
// //                   </p>
// //                 </div>
// //               )}
// //               {inviteData.inviteType === 'client' && (
// //                 <>
// //                   <div>
// //                     <Label>Role(s)</Label>
// //                     {/* For multiple roles, this would need to be a multi-select component */}
// //                     <Select
// //                       value={inviteData.roleIds[0] || ''}
// //                       onValueChange={(v) => setInviteData({ ...inviteData, roleIds: [v] })} // Store as array
// //                     >
// //                       <SelectTrigger className="mt-1">
// //                         <SelectValue placeholder="Select role" />
// //                       </SelectTrigger>
// //                       <SelectContent>
// //                         {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
// //                       </SelectContent>
// //                     </Select>
// //                     <p className="text-xs text-slate-500 mt-1">
// //                       Assign one or more roles for the user within the selected client.
// //                     </p>
// //                   </div>
// //                   {(isInternalAdmin || activeClientId) && (
// //                     <div>
// //                       <Label>Assign to Client</Label>
// //                       <Select
// //                         value={inviteData.clientId || ''}
// //                         onValueChange={(v) => setInviteData({ ...inviteData, clientId: v })}
// //                       >
// //                         <SelectTrigger className="mt-1">
// //                           <SelectValue placeholder="Select client" />
// //                         </SelectTrigger>
// //                         <SelectContent>
// //                           {isInternalAdmin ? (
// //                             clients.map(client => (
// //                               <SelectItem key={client.id} value={client.id}>
// //                                 {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
// //                               </SelectItem>
// //                             ))
// //                           ) : (
// //                             activeClientId && clients.filter(c => c.id === activeClientId).map(client => (
// //                               <SelectItem key={client.id} value={client.id}>
// //                                 {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
// //                               </SelectItem>
// //                             ))
// //                           )}
// //                         </SelectContent>
// //                       </Select>
// //                     </div>
// //                   )}
// //                 </>
// //               )}
// //             </div>
// //             <DialogFooter>
// //               <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
// //               <Button
// //                 onClick={handleInvite}
// //                 disabled={!inviteData.email || inviteUserMutation.isPending || (inviteData.inviteType === 'platform' && !inviteData.platformRole) || (inviteData.inviteType === 'client' && ((!inviteData.clientId && !activeClientId) || inviteData.roleIds.length === 0))}
// //                 className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
// //               >
// //                 {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
// //               </Button>
// //             </DialogFooter>
// //           </DialogContent>
// //         </Dialog>

// //         {/* Edit User Dialog */}
// //         <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
// //           <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto"> {/* Fix 2: Added max-h and overflow-y-auto for dialog scroll */}
// //             <DialogHeader>
// //               <DialogTitle>Edit User: {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
// //             </DialogHeader>
// //             {isLoadingDetailedUser ? (
// //               <div className="text-center p-4">Loading user details...</div>
// //             ) : selectedUser && (
// //               <div className="space-y-4 py-4">
// //                 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
// //                   <AvatarImg avatarKey={selectedUser.avatar_storage_key} fallback={getInitials(selectedUser.full_name)} />
// //                   <div>
// //                     <p className="font-medium">{selectedUser.full_name || 'No Name'}</p>
// //                     <p className="text-sm text-slate-500">{selectedUser.email}</p>
// //                   </div>
// //                 </div>

// //                 {/* Editable User Details */}
// //                 <div>
// //                   <Label htmlFor="fullName">Full Name</Label>
// //                   <Input
// //                     id="fullName"
// //                     value={selectedUser.full_name || ''}
// //                     onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
// //                     className="mt-1"
// //                   />
// //                 </div>
// //                 <div>
// //                   <Label htmlFor="phone">Phone</Label>
// //                   <Input
// //                     id="phone"
// //                     value={selectedUser.phone || ''}
// //                     onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
// //                     className="mt-1"
// //                   />
// //                 </div>
// //                 <div>
// //                   <Label htmlFor="jobTitle">Job Title</Label>
// //                   <Input
// //                     id="jobTitle"
// //                     value={selectedUser.job_title || ''}
// //                     onChange={(e) => setSelectedUser({ ...selectedUser, job_title: e.target.value })}
// //                     className="mt-1"
// //                   />
// //                 </div>

// //                 {isInternalAdmin && (
// //                   <div>
// //                     <Label>Platform Role</Label>
// //                     <Select
// //                       value={selectedUser.platform_role || ''}
// //                       onValueChange={(v) => setSelectedUser({ ...selectedUser, platform_role: v })}
// //                     >
// //                       <SelectTrigger className="mt-1">
// //                         <SelectValue placeholder="Select platform role" />
// //                       </SelectTrigger>
// //                       <SelectContent>
// //                         <SelectItem value="super_admin">Super Admin</SelectItem>
// //                         <SelectItem value="platform_admin">Platform Admin</SelectItem>
// //                         <SelectItem value="platform_user">Platform User</SelectItem>
// //                       </SelectContent>
// //                     </Select>
// //                   </div>
// //                 )}

// //                 {isInternalAdmin && (
// //                   <div>
// //                     <Label>Account Status</Label>
// //                     <Select
// //                       value={selectedUser.status || 'active'}
// //                       onValueChange={(v) => setSelectedUser({ ...selectedUser, status: v })}
// //                     >
// //                       <SelectTrigger className="mt-1">
// //                         <SelectValue />
// //                       </SelectTrigger>
// //                       <SelectContent>
// //                         <SelectItem value="active">Active</SelectItem>
// //                         <SelectItem value="inactive">Inactive</SelectItem>
// //                       </SelectContent>
// //                     </Select>
// //                   </div>
// //                 )}

// //                 {/* Fix 4: Removed duplicate Card and its content, integrated directly into dialog */}
// //                 <div className="space-y-6">
// //                   <h3 className="font-semibold text-lg mb-3">Client Memberships & Roles</h3>
// //                   {selectedUser.memberships?.length > 0 ? (
// //                     selectedUser.memberships.map((membership, index) => (
// //                       <div key={membership.client_id} className="border p-4 rounded-md shadow-sm space-y-3">
// //                         <div className="flex justify-between items-center">
// //                           <h4 className="text-base font-semibold">{membership.client_name}</h4>
// //                           <Button
// //                             variant="destructive"
// //                             size="sm"
// //                             onClick={() => removeClientMembershipMutation.mutate(membership.client_id)}
// //                             disabled={removeClientMembershipMutation.isLoading}
// //                           >
// //                             <Trash2Icon className="h-4 w-4 mr-2" /> Remove from Client
// //                           </Button>
// //                         </div>
// //                         <div className="space-y-2">
// //                           <p className="text-sm font-medium">Roles in {membership.client_name}:</p>
// //                           <div className="flex flex-wrap gap-2 mb-2">
// //                             {membership.roles?.map((role) => (
// //                               <Badge key={role.id} variant="secondary">{role.name}</Badge>
// //                             ))}
// //                           </div>

// //                           {/* Multi-select Role Editor for existing membership */}
// //                           <Popover open={openRoleSelect === membership.client_id} onOpenChange={(isOpen) => setOpenRoleSelect(isOpen ? membership.client_id : null)}>
// //                             <PopoverTrigger asChild>
// //                               <Button variant="outline" className="w-[200px] justify-between">
// //                                 Manage Roles
// //                                 <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
// //                               </Button>
// //                             </PopoverTrigger>
// //                             <PopoverContent className="w-[200px] p-0">
// //                               <Command>
// //                                 <CommandGroup>
// //                                   {/* Filter roles to show only global ones or those belonging to the current client */}
// //                                   {roles?.filter(r => r.client_id == null || r.client_id === membership.client_id).map(role => {
// //                                     const isSelected = membership.roles.some(mr => mr.id === role.id);
// //                                     return (
// //                                       <CommandItem
// //                                         key={role.id}
// //                                         onSelect={() => {
// //                                           document.getElementById(`role-${membership.client_id}-${role.id}`)?.click();
// //                                         }}
// //                                       >
// //                                         <div className="flex items-center space-x-2">
// //                                           <Checkbox
// //                                             id={`role-${membership.client_id}-${role.id}`}
// //                                             checked={isSelected}
// //                                             onCheckedChange={(checked) => {
// //                                               const currentRoleIdsSet = new Set(membership.roles.map(r => r.id));
// //                                               if (checked) {
// //                                                 currentRoleIdsSet.add(role.id);
// //                                               } else {
// //                                                 currentRoleIdsSet.delete(role.id);
// //                                               }
// //                                               const updatedRoleIdsArray = Array.from(currentRoleIdsSet); // Fix 1: Deduplicate roleIds

// //                                               // Optimistically update UI
// //                                               const updatedMemberships = [...selectedUser.memberships];
// //                                               updatedMemberships[index] = {
// //                                                 ...updatedMemberships[index],
// //                                                 roles: roles.filter(r => updatedRoleIdsArray.includes(r.id)) // Update role objects based on new IDs
// //                                               };
// //                                               setSelectedUser({ ...selectedUser, memberships: updatedMemberships });

// //                                               updateRolesMutation.mutate({ clientId: membership.client_id, roleIds: updatedRoleIdsArray });
// //                                             }}
// //                                           />
// //                                           <Label>{role.name}</Label>
// //                                         </div>
// //                                       </CommandItem>
// //                                     );
// //                                   })}
// //                                 </CommandGroup>
// //                               </Command>
// //                             </PopoverContent>
// //                           </Popover>
// //                         </div>
// //                       </div>
// //                     ))
// //                   ) : (
// //                     <p className="text-muted-foreground">This user is not a member of any clients yet.</p>
// //                   )}

// //                   {/* Add to new Client Section */}
// //                   <div className="border-t pt-4 mt-6">
// //                     <h3 className="text-lg font-semibold mb-3">Add User to a New Client</h3>
// //                     <div className="flex flex-col gap-4">
// //                       <Select
// //                         value={addingClientId}
// //                         onValueChange={(value) => {
// //                           setAddingClientId(value);
// //                           setSelectedNewRoles([]); // Reset roles when client changes
// //                         }}
// //                         disabled={availableClientsToAdd?.length === 0}
// //                       >
// //                         <SelectTrigger className="w-[200px]">
// //                           <SelectValue placeholder={availableClientsToAdd?.length === 0 ? "No more clients to add" : "Select Client"} />
// //                         </SelectTrigger>
// //                         <SelectContent>
// //                           {availableClientsToAdd?.map((client) => (
// //                             <SelectItem key={client.id} value={client.id}>
// //                               {client.company_name} {/* Fix 3: Changed from client.name to client.company_name */}
// //                             </SelectItem>
// //                           ))}
// //                         </SelectContent>
// //                       </Select>

// //                       {addingClientId && (
// //                         <div className="space-y-2">
// //                           <Label>Assign Roles for {clients?.find(t => t.id === addingClientId)?.company_name}:</Label> {/* Fix 3: Changed to company_name */}
// //                           <Popover>
// //                             <PopoverTrigger asChild>
// //                               <Button variant="outline" className="w-[200px] justify-between">
// //                                 {selectedNewRoles.length === 0
// //                                   ? "Select Roles"
// //                                   : `${selectedNewRoles.length} role(s) selected`}
// //                                 <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
// //                               </Button>
// //                             </PopoverTrigger>
// //                             <PopoverContent className="w-[200px] p-0">
// //                               <Command>
// //                                 <CommandGroup>
// //                                   {/* Filter roles to show only global ones or those belonging to the adding client */}
// //                                   {roles?.filter(r => r.client_id === null || r.client_id === addingClientId).map(role => (
// //                                     <CommandItem
// //                                       key={role.id}
// //                                       onSelect={() => {
// //                                         document.getElementById(`new-client-role-${role.id}`)?.click();
// //                                       }}
// //                                     >
// //                                       <div className="flex items-center space-x-2">
// //                                         <Checkbox
// //                                           id={`new-client-role-${role.id}`}
// //                                           checked={selectedNewRoles.includes(role.id)}
// //                                           onCheckedChange={(checked) => {
// //                                             setSelectedNewRoles((prev) => {
// //                                               const prevSet = new Set(prev);
// //                                               if (checked) {
// //                                                 prevSet.add(role.id);
// //                                               } else {
// //                                                 prevSet.delete(role.id);
// //                                               }
// //                                               return Array.from(prevSet); // Fix 1: Deduplicate roleIds
// //                                             });
// //                                           }}
// //                                         />
// //                                         <Label htmlFor={`new-client-role-${role.id}`}>{role.name}</Label>
// //                                       </div>
// //                                     </CommandItem>
// //                                   ))}
// //                                 </CommandGroup>
// //                               </Command>
// //                             </PopoverContent>
// //                           </Popover>

// //                           <Button
// //                             onClick={() => addClientMembershipMutation.mutate({ clientId: addingClientId, roleIds: selectedNewRoles })}
// //                             disabled={!addingClientId || selectedNewRoles.length === 0 || addClientMembershipMutation.isLoading}
// //                           >
// //                             <PlusIcon className="h-4 w-4 mr-2" /> Add User to Client
// //                           </Button>
// //                         </div>
// //                       )}
// //                     </div>
// //                   </div>
// //                 </div>
// //               </div>
// //             )}

// //             <DialogFooter>
// //               <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
// //               <Button
// //                 onClick={handleUpdateUser}
// //                 disabled={updateUserMutation.isPending}
// //                 className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
// //               >
// //                 {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
// //               </Button>
// //             </DialogFooter>
// //           </DialogContent>
// //         </Dialog>

// //         {/* Roles and Permission Dialogs */}
// //         <AddRoleDialog permissions={permissions} open={showAddRoleDialog} onClose={setShowAddRoleDialog} onSuccess={() => {
// //           queryClient.invalidateQueries({ queryKey: ['roles'] });
// //         }} />
// //         <AddPermissionDialog open={showAddPermissionsDialog} onClose={setShowAddPermissionsDialog} onSuccess={() => {
// //           queryClient.invalidateQueries({ queryKey: ['permissions'] });
// //         }} />
// //       </div>
// //     </AdminOnly>
// //   );
// // }

// // // import React, { useState, useEffect } from 'react';
// // // import { api } from '@/api/apiClient';
// // // import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// // // import AdminOnly from '@/components/AdminOnly';
// // // import { Plus, Search, Edit2, Users, Mail } from 'lucide-react';
// // // import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// // // import { Button } from "@/components/ui/button";
// // // import { Input } from "@/components/ui/input";
// // // import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// // // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// // // import { Label } from "@/components/ui/label";
// // // import { AvatarImg } from "@/components/UserAvatar";
// // // import PageHeader from '@/components/shared/PageHeader';
// // // import DataTable from '@/components/shared/DataTable';
// // // import StatusBadge from '@/components/shared/StatusBadge';
// // // import EmptyState from '@/components/shared/EmptyState';
// // // import { toast } from 'sonner';
// // // import { useClient } from '@/lib/ClientContext';
// // // import { usePermission } from '@/hooks/usePermission';
// // // import { usePlatformRole } from '@/hooks/usePlatfromRole';
// // // import AddRoleDialog from '@/components/roles/AddRoleDialog';
// // // import AddPermissionDialog from '@/components/permissions/AddPermissionDialog';
// // // import { Badge } from "@/components/ui/badge";
// // // import { Checkbox } from "@/components/ui/checkbox";
// // // import { PlusIcon, Trash2Icon, ChevronDownIcon } from "lucide-react";
// // // import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// // // import { Command, CommandGroup, CommandItem } from "@/components/ui/command";


// // // // --- JSDoc Type Definitions for improved type checking ---
// // // /**
// // //  * @typedef {object} Role
// // //  * @property {string} id
// // //  * @property {string} name
// // //  */

// // // /**
// // //  * @typedef {object} ClientMembership
// // //  * @property {string} id
// // //  * @property {string} client_id
// // //  * @property {string} client_name // Provided by backend GET /api/users
// // //  * @property {boolean} is_active
// // //  * @property {string} created_at
// // //  * @property {Role[]} roles
// // //  */

// // // /**
// // //  * @typedef {object} UserData
// // //  * @property {string} id
// // //  * @property {string} email
// // //  * @property {string} full_name
// // //  * @property {string} platform_role
// // //  * @property {boolean} is_active
// // //  * @property {string} last_login_at
// // //  * @property {string} created_at
// // //  * @property {string} [avatar_storage_key]
// // //  * @property {string} [phone]
// // //  * @property {string} [job_title]
// // //  * @property {string} status
// // //  * @property {ClientMembership[]} memberships
// // //  */

// // // export default function AdminUsers() {
// // //   const [searchTerm, setSearchTerm] = useState('');
// // //   const [roleFilter, setRoleFilter] = useState('all'); // This will filter by role ID now
// // //   const [showInviteDialog, setShowInviteDialog] = useState(false);
// // //   const { activeClientId } = useClient();
// // //   // Changed roleId to roleIds (array) as per backend invite structure
// // //   const [inviteData, setInviteData] = useState({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' });
// // //   /** @type {UserData | null} */ // Explicitly type selectedUser state
// // //   const [selectedUser, setSelectedUser] = useState(null);
// // //   const [showEditDialog, setShowEditDialog] = useState(false);
// // //   const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
// // //   const [showAddPermissionsDialog, setShowAddPermissionsDialog] = useState(false);
// // //   const userId=selectedUser?.id
// // //   const [addingClientId, setAddingClientId] = useState('');
// // //   const [selectedNewRoles, setSelectedNewRoles] = useState([]);
// // //   const [openRoleSelect, setOpenRoleSelect] = useState(false); // State to manage popover for multi-select

// // //   const queryClient = useQueryClient();

// // //   const isSuperAdmin = usePlatformRole('super_admin'); // Added for more granular checks
// // //   const isPlatformAdmin = usePlatformRole('platform_admin'); // Added for more granular checks
// // //   const isInternalAdmin = isSuperAdmin || isPlatformAdmin; // Combined check

// // //   // Use the correct permission string for client user invite
// // //   const canInviteClientUser = usePermission('client:users.invite');
// // //   // Assuming 'platform:users.invite' or similar permission check for platform users
// // //   // For simplicity, assuming internal admins can invite platform users
// // //   const canInvitePlatformUser = isInternalAdmin;

// // //   const [page, setPage] = useState(1); // Page declared but not yet fully integrated for pagination

// // //   const { data: usersData = {}, isLoading } = useQuery({
// // //     queryKey: ['admin-users', page, searchTerm, roleFilter], // Include filters in queryKey
// // //     queryFn: () => api.getUsers({
// // //       page,
// // //       limit: 50, // Or adjust as needed
// // //       order: '-created_at',
// // //       search: searchTerm,
// // //       platform_role: roleFilter === 'super_admin' || roleFilter === 'platform_admin' || roleFilter === 'platform_user' ? roleFilter : undefined, // Filter by platform_role
// // //       // For client roles, we might need a separate backend endpoint or more complex filter logic
// // //       // client_role_id: roleFilter !== 'all' && !['super_admin', 'platform_admin', 'platform_user'].includes(roleFilter) ? roleFilter : undefined,
// // //     }),
// // //   });
// // //   const users = usersData?.users ?? [];

// // //   // const { data: user, isLoading: isLoadingUser, error: userError} = useQuery({
// // //   //   queryKey: ['user', userId],
// // //   //   queryFn: () =>  api.getUser(userId),
// // //   // });

// // //   const { data: clients = [] } = useQuery({
// // //     queryKey: ['clients'],
// // //     queryFn: () => api.getClients({ order: 'company_name', limit: 200 }),
// // //     enabled: isInternalAdmin, // Only internal admins can list all clients
// // //   });

// // //   const { data: roles = [] } = useQuery({
// // //     queryKey: ['roles'],
// // //     queryFn: () => api.getRoles({ limit: 200 }), // Fetch all roles to populate dropdowns
// // //   });

// // //   const { data: permissions = [] } = useQuery({
// // //     queryKey: ['permissions'],
// // //     queryFn: () => api.getPermissions({ limit: 200 }), // Fetch all permissions
// // //   });

// // //   const updateUserMutation = useMutation({
// // //     mutationFn: ({ id, data }) => api.updateUser(id, data),
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: ['admin-users'] });
// // //       setShowEditDialog(false);
// // //       setSelectedUser(null);
// // //       toast.success('User updated successfully');
// // //     },
// // //     onError: (error) => {
// // //       console.error('Failed to update user:', error);
// // //       toast.error(`Failed to update user: ${ error.message}`);
// // //     }
// // //   });

// // //   // Mutation to update user's roles within a specific client
// // //   const updateRolesMutation = useMutation({
// // //     mutationFn: ({ clientId, roleIds }) => api.updateUserClientRoles(
// // //       userId,
// // //       clientId,
// // //       {roleIds: roleIds}),
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: ['user', userId] });
// // //       // setShowEditDialog(false);
// // //       // setSelectedUser(null);
// // //       // toast.success('User updated successfully');
// // //       toast.success("Roles updated successfully!");
// // //     },
// // //     onError: (error) => {
// // //       toast.error(`Failed to update roles: ${error.message}`);
// // //       // console.error('Failed to update user:', error);
// // //       // toast.error(`Failed to update user: ${error.response?.data?.error || error.message}`);
// // //     }
// // //   });
// // //    // Mutation to add user to a new client with roles
// // //    const addClientMembershipMutation = useMutation({
// // //     mutationFn: ({ clientId, roleIds }) => api.addUserToClient(
// // //       userId,
// // //       clientId,
// // //       {roleIds: roleIds}),
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: ['user', userId] });
// // //       queryClient.invalidateQueries({ queryKey: ['clients'] });
// // //       setAddingClientId('');
// // //       setSelectedNewRoles([]);
// // //       toast.success("Added to new client successfully!");
// // //     },
// // //     onError: (err) => {
// // //       toast.error(`Failed to add to client: ${err.message}`);
// // //     },
// // //   });

// // //   // Mutation to remove user from a client
// // //   const removeClientMembershipMutation = useMutation({
// // //     mutationFn: ({ clientId}) => api.removeUserFromClient(
// // //       userId,
// // //       clientId),
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: ['user', userId] });
// // //       queryClient.invalidateQueries({ queryKey: ['clients'] });;
// // //       toast.success("Removed from client successfully!");
// // //     },
// // //     onError: (err) => {
// // //       toast.error(`Failed to remove from client: ${err.message}`);
// // //     },
// // //   });

// // //   const inviteUserMutation = useMutation({
// // //     mutationFn: (invitePayload) => api.inviteUser(invitePayload),
// // //     onSuccess: () => {
// // //       queryClient.invalidateQueries({ queryKey: ['admin-users'] }); // Invalidate user list to show new user if accepted
// // //       toast.success('Invitation sent successfully');
// // //       setShowInviteDialog(false);
// // //       // Reset invite data including roleIds as an empty array
// // //       setInviteData({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' });
// // //     },
// // //     onError: (error) => {
// // //       console.error('Failed to send invitation:', error);
// // //       toast.error(`Failed to send invitation: ${error.response?.data?.error || error.message}`);
// // //     }
// // //   });

// // //   const handleInvite = async () => {
// // //     const payload = {
// // //       email: inviteData.email,
// // //       inviteType: inviteData.inviteType,
// // //       platformRole: inviteData.platformRole,
// // //       invited_by_message: '', // Add message if needed
// // //     };

// // //     if (inviteData.inviteType === 'client') {
// // //       // For client invites, client_id must be set.
// // //       // If the current user is NOT an internal admin, activeClientId is used by default.
// // //       payload.clientId = isInternalAdmin ? inviteData.clientId : activeClientId;

// // //       if (!payload.clientId) {
// // //         toast.error('Client is required for client invite.');
// // //         return;
// // //       }
// // //       if (inviteData.roleIds.length === 0) {
// // //         toast.error('At least one role is required for client invite.');
// // //         return;
// // //       }
// // //       payload.role_ids = inviteData.roleIds; // Backend expects role_ids array
// // //     } else if (inviteData.inviteType === 'platform') {
// // //       if (!inviteData.platformRole) {
// // //         toast.error('Platform role is required for platform invite.');
// // //         return;
// // //       }
// // //       // No clientId or roleIds for platform invite
// // //     }

// // //     inviteUserMutation.mutate(payload);
// // //   };

// // //   const handleEditUser = (user) => {
// // //     // Populate selectedUser with the full user object including memberships
// // //     setSelectedUser({ ...user });
// // //     setShowEditDialog(true);
// // //   };

// // //   const handleUpdateUser = async () => {
// // //     if (!selectedUser) return;

// // //     // Construct the update payload for the backend PATCH /api/users/:id
// // //     const updatePayload = {
// // //       full_name: selectedUser.full_name,
// // //       phone: selectedUser.phone,
// // //       job_title: selectedUser.job_title,
// // //       avatar_storage_key: selectedUser.avatar_storage_key,
// // //       status: selectedUser.status,
// // //     };

// // //     // Only internal admins can update platform_role
// // //     if (isInternalAdmin && selectedUser.platform_role) {
// // //       updatePayload.platform_role = selectedUser.platform_role;
// // //     }

// // //     // Prepare memberships for update
// // //     // This assumes the `selectedUser.memberships` object in state is directly editable in the dialog
// // //     // A more robust solution would involve a dedicated component for editing memberships/roles.
// // //     if (selectedUser.memberships && Array.isArray(selectedUser.memberships)) {
// // //       updatePayload.memberships = selectedUser.memberships.map(m => ({
// // //         clientId: m.client_id, // Use client_id directly from membership
// // //         roleIds: m.roles.map(r => r.id), // Extract role IDs
// // //       }));
// // //     }

// // //     updateUserMutation.mutate(
// // //       {
// // //         id: selectedUser.id,
// // //         data: updatePayload
// // //       });
// // //   };

// // //   const filteredUsers = users.filter(user => {
// // //     const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // //       user.email?.toLowerCase().includes(searchTerm.toLowerCase());

// // //     let matchesRole = true;
// // //     if (roleFilter !== 'all') {
// // //       // Check if user has the selected platform_role
// // //       const hasPlatformRole = user.platform_role === roleFilter;
// // //       // Check if user has the selected role ID in any of their memberships
// // //       const hasMembershipRole = user.memberships.some(m => m.roles.some(role => role.id === roleFilter));
// // //       matchesRole = hasPlatformRole || hasMembershipRole;
// // //     }

// // //     return matchesSearch && matchesRole;
// // //   });

// // //   const getInitials = (name) => {
// // //     if (!name) return 'U';
// // //     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
// // //   };

// // //   const columns = [
// // //     {
// // //       header: 'User',
// // //       render: (row) => (
// // //         <div className="flex items-center gap-3">
// // //           <AvatarImg avatarKey={row.avatar_storage_key} fallback={getInitials(row.full_name)} />
// // //           <div>
// // //             <p className="font-medium text-slate-900">{row.full_name || 'No Name'}</p>
// // //             <p className="text-sm text-slate-500">{row.email}</p>
// // //           </div>
// // //         </div>
// // //       )
// // //     },
// // //     { // Display Platform Role and then Client Roles
// // //       header: 'Role(s)',
// // //       render: (row) => (
// // //         <div className="flex flex-col gap-0.5">
// // //           {row.platform_role && (
// // //             <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
// // //               {row.platform_role.replace(/_/g, ' ')}
// // //             </span>
// // //           )}
// // //           {row.memberships.map(m => (
// // //             <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
// // //               {`${m.client_name}: ${m.roles.map(r => r.name).join(', ')}`}
// // //             </span>
// // //           ))}
// // //         </div>
// // //       )
// // //     },
// // //     // Removed 'Permissions' column as backend GET /api/users does not provide permissions per membership.
// // //     // If needed, the backend query for GET /api/users must be updated.
// // //     isInternalAdmin && {
// // //       header: 'Client',
// // //       render: (row) => (
// // //         <div className="flex flex-col gap-0.5">
// // //           {row.memberships.length > 0 ? (
// // //             row.memberships.map(m => (
// // //               <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
// // //                 {m.client_name}
// // //               </span>
// // //             ))
// // //           ) : (
// // //             <span className="px-2 py-0.5 text-slate-500">- N/A -</span>
// // //           )}
// // //         </div>
// // //       )
// // //     },
// // //     {
// // //       header: 'Status',
// // //       render: (row) => <StatusBadge status={row.status || 'active'} />
// // //     },
// // //     {
// // //       header: 'Actions',
// // //       render: (row) => (
// // //         <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditUser(row); }}>
// // //           <Edit2 className="h-4 w-4" />
// // //         </Button>
// // //       )
// // //     },
// // //   ].filter(Boolean); // Filter out false values from conditional columns
// // //   const availableClientsToAdd = clients?.filter(
// // //     (client) => !selectedUser?.memberships.some((m) => m.client_id === client.id)
// // //   );
  
// // //   return (
// // //     <AdminOnly>
// // //       <div className="space-y-6">
// // //         <PageHeader
// // //           title="Users"
// // //           subtitle="Manage user accounts, roles, and permissions across clients and platform."
// // //           actions={
// // //             <>
// // //               {canInviteClientUser || canInvitePlatformUser ? (
// // //                 <Button
// // //                   onClick={() => setShowInviteDialog(true)}
// // //                   className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
// // //                 >
// // //                   <Mail className="h-4 w-4 mr-2" />
// // //                   Invite User
// // //                 </Button>
// // //               ) : null}
// // //               {isInternalAdmin && (
// // //                 <Button
// // //                   onClick={() => setShowAddRoleDialog(true)}
// // //                   className="bg-gray-200 text-gray-800 hover:bg-gray-300"
// // //                 >
// // //                   <Plus className="h-4 w-4 mr-2" />
// // //                   Add Role Type
// // //                 </Button>
// // //               )}
// // //               {isInternalAdmin && (
// // //                 <Button
// // //                   onClick={() => setShowAddPermissionsDialog(true)}
// // //                   className="bg-gray-200 text-gray-800 hover:bg-gray-300"
// // //                 >
// // //                   <Plus className="h-4 w-4 mr-2" />
// // //                   Add Permission Type
// // //                 </Button>
// // //               )}
// // //             </>
// // //           }
// // //         />

// // //         <Card className="border-0 shadow-sm">
// // //           <CardContent className="p-4">
// // //             <div className="flex flex-col sm:flex-row gap-4">
// // //               <div className="relative flex-1">
// // //                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
// // //                 <Input
// // //                   placeholder="Search users by name or email..."
// // //                   value={searchTerm}
// // //                   onChange={(e) => setSearchTerm(e.target.value)}
// // //                   className="pl-9"
// // //                 />
// // //               </div>
// // //               <Select value={roleFilter} onValueChange={setRoleFilter}>
// // //                 <SelectTrigger className="w-full sm:w-48">
// // //                   <SelectValue placeholder="Filter by Role" />
// // //                 </SelectTrigger>
// // //                 <SelectContent>
// // //                   <SelectItem value="all">All Roles</SelectItem>
// // //                   <SelectItem value="super_admin">Super Admin</SelectItem>
// // //                   <SelectItem value="platform_admin">Platform Admin</SelectItem>
// // //                   <SelectItem value="platform_user">Platform User</SelectItem>
// // //                   {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
// // //                 </SelectContent>
// // //               </Select>
// // //             </div>
// // //           </CardContent>
// // //         </Card>

// // //         {users.length === 0 && !isLoading ? (
// // //           <EmptyState
// // //             icon={Users}
// // //             title="No users yet"
// // //             description="Invite users to get started"
// // //             action={() => setShowInviteDialog(true)}
// // //             actionLabel="Invite User"
// // //           />
// // //         ) : (
// // //           <DataTable
// // //             columns={columns}
// // //             data={filteredUsers}
// // //             isLoading={isLoading}
// // //             emptyMessage="No users match your search"
// // //           />
// // //         )}

// // //         {/* Invite Dialog */}
// // //         <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
// // //           <DialogContent className="sm:max-w-md">
// // //             <DialogHeader>
// // //               <DialogTitle>Invite User</DialogTitle>
// // //             </DialogHeader>
// // //             <div className="space-y-4 py-4 overflow-y-auto" >
// // //               <div>
// // //                 <Label>Email Address</Label>
// // //                 <Input
// // //                   type="email"
// // //                   placeholder="user@example.com"
// // //                   value={inviteData.email}
// // //                   onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
// // //                   className="mt-1"
// // //                 />
// // //               </div>
// // //               {isInternalAdmin && <div>
// // //                 <Label> Invite Type</Label>
// // //                 <Select value={inviteData.inviteType} onValueChange={(v) => {
// // //                   setInviteData({ ...inviteData, inviteType: v, platformRole: '', roleIds: [], clientId: '' });
// // //                 }}>
// // //                   <SelectTrigger className="mt-1">
// // //                     <SelectValue />
// // //                   </SelectTrigger>
// // //                   <SelectContent>
// // //                     <SelectItem value="platform">Platform User </SelectItem>
// // //                     <SelectItem value="client">Client User</SelectItem>
// // //                   </SelectContent>
// // //                 </Select>
// // //               </div>}
// // //               {isInternalAdmin && inviteData.inviteType === 'platform' && (
// // //                 <div>
// // //                   <Label> Platform Role</Label>
// // //                   <Select value={inviteData.platformRole} onValueChange={(v) => { console.log(inviteData, v);
// // //                     setInviteData({ ...inviteData, platformRole: v })}}>
// // //                     <SelectTrigger className="mt-1">
// // //                       <SelectValue />
// // //                     </SelectTrigger>
// // //                     <SelectContent>
// // //                       <SelectItem value="super_admin">Super Admin</SelectItem>
// // //                       <SelectItem value="platform_admin">Platform Admin</SelectItem>
// // //                       <SelectItem value="platform_user">Platform User</SelectItem>
// // //                     </SelectContent>
// // //                   </Select>
// // //                   <p className="text-xs text-slate-500 mt-1">
// // //                     {inviteData.platformRole === 'super_admin' ? 'Highest platform access.' :
// // //                      inviteData.platformRole === 'platform_admin' ? 'Full platform access.' :
// // //                     'Standard platform user access.'}
// // //                   </p>
// // //                 </div>
// // //               )}
// // //               {inviteData.inviteType === 'client' && (
// // //                 <>
// // //                   <div>
// // //                     <Label>Role(s)</Label>
// // //                     {/* For multiple roles, this would need to be a multi-select component */}
// // //                     <Select
// // //                       value={inviteData.roleIds[0] || ''}
// // //                       onValueChange={(v) => setInviteData({ ...inviteData, roleIds: [v] })} // Store as array
// // //                     >
// // //                       <SelectTrigger className="mt-1">
// // //                         <SelectValue placeholder="Select role" />
// // //                       </SelectTrigger>
// // //                       <SelectContent>
// // //                         {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
// // //                       </SelectContent>
// // //                     </Select>
// // //                     <p className="text-xs text-slate-500 mt-1">
// // //                       Assign one or more roles for the user within the selected client.
// // //                     </p>
// // //                   </div>
// // //                   {(isInternalAdmin || activeClientId) && (
// // //                     <div>
// // //                       <Label>Assign to Client</Label>
// // //                       <Select
// // //                         value={inviteData.clientId || ''}
// // //                         onValueChange={(v) => setInviteData({ ...inviteData, clientId: v })}
// // //                       >
// // //                         <SelectTrigger className="mt-1">
// // //                           <SelectValue placeholder="Select client" />
// // //                         </SelectTrigger>
// // //                         <SelectContent>
// // //                           {isInternalAdmin ? ( // Internal admin can pick any client
// // //                             clients.map(client => (
// // //                               <SelectItem key={client.id} value={client.id}>
// // //                                 {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
// // //                               </SelectItem>
// // //                             ))
// // //                           ) : ( // Regular client admin can only invite to their active client
// // //                             activeClientId && clients.filter(c => c.id === activeClientId).map(client => (
// // //                               <SelectItem key={client.id} value={client.id}>
// // //                                 {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
// // //                               </SelectItem>
// // //                             ))
// // //                           )}
// // //                         </SelectContent>
// // //                       </Select>
// // //                     </div>
// // //                   )}
// // //                 </>
// // //               )}
// // //             </div>
// // //             <DialogFooter>
// // //               <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
// // //               <Button
// // //                 onClick={handleInvite}
// // //                 disabled={!inviteData.email || inviteUserMutation.isPending || (inviteData.inviteType === 'platform' && !inviteData.platformRole) || (inviteData.inviteType === 'client' && ((!inviteData.clientId && !activeClientId) || inviteData.roleIds.length === 0))}
// // //                 className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
// // //               >
// // //                 {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
// // //               </Button>
// // //             </DialogFooter>
// // //           </DialogContent>
// // //         </Dialog>

// // //         {/* Edit User Dialog */}
// // //         <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
// // //           <DialogContent className="sm:max-w-lg">
// // //             <DialogHeader>
// // //               <DialogTitle>Edit User: {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
// // //             </DialogHeader>
// // //             {selectedUser && (
// // //               <div className="space-y-4 py-4">
// // //                 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
// // //                   <AvatarImg avatarKey={selectedUser.avatar_storage_key} fallback={getInitials(selectedUser.full_name)} />
// // //                   <div>
// // //                     <p className="font-medium">{selectedUser.full_name || 'No Name'}</p>
// // //                     <p className="text-sm text-slate-500">{selectedUser.email}</p>
// // //                   </div>
// // //                 </div>

// // //                 {/* Editable User Details */}
// // //                 <div>
// // //                   <Label htmlFor="fullName">Full Name</Label>
// // //                   <Input
// // //                     id="fullName"
// // //                     value={selectedUser.full_name || ''}
// // //                     onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
// // //                     className="mt-1"
// // //                   />
// // //                 </div>
// // //                 <div>
// // //                   <Label htmlFor="phone">Phone</Label>
// // //                   <Input
// // //                     id="phone"
// // //                     value={selectedUser.phone || ''}
// // //                     onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
// // //                     className="mt-1"
// // //                   />
// // //                 </div>
// // //                 <div>
// // //                   <Label htmlFor="jobTitle">Job Title</Label>
// // //                   <Input
// // //                     id="jobTitle"
// // //                     value={selectedUser.job_title || ''}
// // //                     onChange={(e) => setSelectedUser({ ...selectedUser, job_title: e.target.value })}
// // //                     className="mt-1"
// // //                   />
// // //                 </div>

// // //                 {isInternalAdmin && (
// // //                   <div>
// // //                     <Label>Platform Role</Label>
// // //                     <Select
// // //                       value={selectedUser.platform_role || ''}
// // //                       onValueChange={(v) => setSelectedUser({ ...selectedUser, platform_role: v })}
// // //                     >
// // //                       <SelectTrigger className="mt-1">
// // //                         <SelectValue placeholder="Select platform role" />
// // //                       </SelectTrigger>
// // //                       <SelectContent>
// // //                         <SelectItem value="super_admin">Super Admin</SelectItem>
// // //                         <SelectItem value="platform_admin">Platform Admin</SelectItem>
// // //                         <SelectItem value="platform_user">Platform User</SelectItem>
// // //                       </SelectContent>
// // //                     </Select>
// // //                   </div>
// // //                 )}

// // //                 {isInternalAdmin && (
// // //                   <div>
// // //                     <Label>Account Status</Label>
// // //                     <Select
// // //                       value={selectedUser.status || 'active'}
// // //                       onValueChange={(v) => setSelectedUser({ ...selectedUser, status: v })}
// // //                     >
// // //                       <SelectTrigger className="mt-1">
// // //                         <SelectValue />
// // //                       </SelectTrigger>
// // //                       <SelectContent>
// // //                         <SelectItem value="active">Active</SelectItem>
// // //                         <SelectItem value="inactive">Inactive</SelectItem>
// // //                       </SelectContent>
// // //                     </Select>
// // //                   </div>
// // //                 )}

// // //                 {selectedUser.memberships?.length > 0 && (
// // //                   <div className="grid md:grid-cols-1 gap-4">
// // //                   <div>
// // //                     <h3 className="font-semibold text-lg mb-2">Client Memberships</h3>
// // //                     {selectedUser.memberships.map((membership, index) => (
// // //                       <div key={membership.id} className="border p-3 rounded-lg mb-2 bg-gray-50">
// // //                         <p className="font-medium">{membership.client_name}</p>
// // //                         <div className="mt-2">
// // //                           <Label>Roles for this Client</Label>
// // //                           {/* This needs to be a multi-select or a more sophisticated role editor */}
// // //                           <Select
// // //                             value={membership.roles[0]?.id || ''} // Assuming one role for simple edit
// // //                             onValueChange={(v) => {
// // //                               const updatedMemberships = [...selectedUser.memberships];
// // //                               updatedMemberships[index].roles = roles.filter(r => r.id === v); // Update role object
// // //                               setSelectedUser({ ...selectedUser, memberships: updatedMemberships });
// // //                             }}
// // //                           >
// // //                             <SelectTrigger className="mt-1">
// // //                               <SelectValue placeholder="Select role" />
// // //                             </SelectTrigger>
// // //                             <SelectContent>
// // //                               {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
// // //                             </SelectContent>
// // //                           </Select>
// // //                         </div>
// // //                       </div>
// // //                     ))}
// // //                   </div>
// // //                   <Card>
// // //         <CardHeader>
// // //           <CardTitle>Client Memberships & Roles</CardTitle>
// // //         </CardHeader>
// // //         <CardContent className="space-y-6">
// // //           {selectedUser.memberships?.length > 0 ? (
// // //             selectedUser.memberships.map((membership, index) => (
// // //               <div key={membership.client_id} className="border p-4 rounded-md shadow-sm space-y-3">
// // //                 <div className="flex justify-between items-center">
// // //                   <h3 className="text-lg font-semibold">{membership.client_name}</h3>
// // //                   <Button
// // //                     variant="destructive"
// // //                     size="sm"
// // //                     onClick={() => removeClientMembershipMutation.mutate(membership.client_id)}
// // //                     disabled={removeClientMembershipMutation.isLoading}
// // //                   >
// // //                     <Trash2Icon className="h-4 w-4 mr-2" /> Remove from Client
// // //                   </Button>
// // //                 </div>
// // //                 <div className="space-y-2">
// // //                   <p className="text-sm font-medium">Roles in {membership.client_name}:</p>
// // //                   <div className="flex flex-wrap gap-2 mb-2">
// // //                     {membership.roles?.map((role) => (
// // //                       <Badge key={role.id} variant="secondary">{role.name}</Badge>
// // //                     ))}
// // //                   </div>

// // //                   {/* Multi-select Role Editor for existing membership */}
// // //                   <Popover open={openRoleSelect === membership.client_id} onOpenChange={(isOpen) => setOpenRoleSelect(isOpen ? membership.client_id : null)}>
// // //                     <PopoverTrigger asChild>
// // //                       <Button variant="outline" className="w-[200px] justify-between">
// // //                         Manage Roles
// // //                         <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
// // //                       </Button>
// // //                     </PopoverTrigger>
// // //                     <PopoverContent className="w-[200px] p-0">
// // //                       <Command>
// // //                         <CommandGroup>
// // //                           {//.filter(r => r.client_id === null || r.client_id === membership.client_id)
// // //                           roles?.map(role => {
// // //                             const isSelected = membership.roles.some(mr => mr.id === role.id);
// // //                             return (
// // //                               <CommandItem
// // //                                 key={role.id}
// // //                                 onSelect={() => {
// // //                                   let updatedRoles = [];
// // //                                   if (isSelected) {
// // //                                     updatedRoles = membership.roles.filter(mr => mr.id !== role.id).map(r => r.id);
// // //                                   } else {
// // //                                     updatedRoles = [...membership.roles.map(r => r.id), role.id];
// // //                                   }
// // //                                   const updatedMemberships = [...selectedUser.memberships];
// // //                               updatedMemberships[index].roles = updatedRoles;
// // //                               setSelectedUser({ ...selectedUser, memberships: updatedMemberships });
// // //                                   updateRolesMutation.mutate({ clientId: membership.client_id, roleIds: updatedRoles });
// // //                                 }}
// // //                               >
// // //                                 <div className="flex items-center space-x-2">
// // //                                   <Checkbox
// // //                                     checked={isSelected}
// // //                                     onCheckedChange={() => {
// // //                                       let updatedRoles = [];
// // //                                       if (isSelected) {
// // //                                         updatedRoles = membership.roles.filter(mr => mr.id !== role.id).map(r => r.id);
// // //                                       } else {
// // //                                         updatedRoles = [...membership.roles.map(r => r.id), role.id];
// // //                                       }
// // //                                       const updatedMemberships = [...selectedUser.memberships];
// // //                               updatedMemberships[index].roles = updatedRoles;
// // //                               setSelectedUser({ ...selectedUser, memberships: updatedMemberships });
// // //                                       updateRolesMutation.mutate({ clientId: membership.client_id, roleIds: updatedRoles });
// // //                                     }}
// // //                                   />
// // //                                   <Label>{role.name}</Label>
// // //                                 </div>
// // //                               </CommandItem>
// // //                             );
// // //                           })}
// // //                         </CommandGroup>
// // //                       </Command>
// // //                     </PopoverContent>
// // //                   </Popover>
// // //                 </div>
// // //               </div>
// // //             ))
// // //           ) : (
// // //             <p className="text-muted-foreground">This user is not a member of any clients yet.</p>
// // //           )}

// // //           {/* Add to new Client Section */}
// // //           <div className="border-t pt-4 mt-6">
// // //             <h3 className="text-lg font-semibold mb-3">Add User to a New Client</h3>
// // //             <div className="flex flex-col gap-4">
// // //               <Select
// // //                 value={addingClientId}
// // //                 onValueChange={(value) => {
// // //                   setAddingClientId(value);
// // //                   setSelectedNewRoles([]); // Reset roles when client changes
// // //                 }}
// // //                 disabled={availableClientsToAdd?.length === 0}
// // //               >
// // //                 <SelectTrigger className="w-[200px]">
// // //                   <SelectValue placeholder={availableClientsToAdd?.length === 0 ? "No more clients to add" : "Select Client"} />
// // //                 </SelectTrigger>
// // //                 <SelectContent>
                  
// // //                   {availableClientsToAdd?.map((client) => (
// // //                     <SelectItem key={client.id} value={client.id}>
// // //                       {client.name}
// // //                     </SelectItem>
// // //                   ))}
// // //                 </SelectContent>
// // //               </Select>

// // //               {addingClientId && (
// // //                 <div className="space-y-2">
// // //                   <Label>Assign Roles for {clients?.find(t => t.id === addingClientId)?.name}:</Label>
// // //                   <Popover>
// // //                     <PopoverTrigger asChild>
// // //                       <Button variant="outline" className="w-[200px] justify-between">
// // //                         {selectedNewRoles.length === 0
// // //                           ? "Select Roles"
// // //                           : `${selectedNewRoles.length} role(s) selected`}
// // //                         <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
// // //                       </Button>
// // //                     </PopoverTrigger>
// // //                     <PopoverContent className="w-[200px] p-0">
// // //                       <Command>
// // //                         <CommandGroup>
// // //                           {roles?.filter(r => r.client_id === null || r.client_id === addingClientId).map(role => (
// // //                             <CommandItem
// // //                               key={role.id}
// // //                               onSelect={() => {
// // //                                 setSelectedNewRoles((prev) =>
// // //                                   prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
// // //                                 );
// // //                               }}
// // //                             >
// // //                               <div className="flex items-center space-x-2">
// // //                                 <Checkbox
// // //                                   checked={selectedNewRoles.includes(role.id)}
// // //                                   onCheckedChange={() => {
// // //                                     setSelectedNewRoles((prev) =>
// // //                                       prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
// // //                                     );
// // //                                   }}
// // //                                 />
// // //                                 <Label>{role.name}</Label>
// // //                               </div>
// // //                             </CommandItem>
// // //                           ))}
// // //                         </CommandGroup>
// // //                       </Command>
// // //                     </PopoverContent>
// // //                   </Popover>

// // //                   <Button
// // //                     onClick={() => addClientMembershipMutation.mutate({ clientId: addingClientId, roleIds: selectedNewRoles })}
// // //                     disabled={!addingClientId || selectedNewRoles.length === 0 || addClientMembershipMutation.isLoading}
// // //                   >
// // //                     <PlusIcon className="h-4 w-4 mr-2" /> Add User to Client
// // //                   </Button>
// // //                 </div>
// // //               )}
// // //             </div>
// // //           </div>
// // //         </CardContent>
// // //       </Card>
// // //                   </div> 
// // //                 )}
// // //               </div>
// // //             )}
  
// // //             <DialogFooter>
// // //               <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
// // //               <Button
// // //                 onClick={handleUpdateUser}
// // //                 disabled={updateUserMutation.isPending}
// // //                 className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
// // //               >
// // //                 {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
// // //               </Button>
// // //             </DialogFooter>
// // //           </DialogContent>
// // //         </Dialog>

// // //         {/* Roles and Permission Dialogs */}
// // //         <AddRoleDialog permissions={permissions} open={showAddRoleDialog} onClose={setShowAddRoleDialog} onSuccess={() => {
// // //           queryClient.invalidateQueries({ queryKey: ['roles'] });
// // //         }} />
// // //         <AddPermissionDialog open={showAddPermissionsDialog} onClose={setShowAddPermissionsDialog} onSuccess={() => {
// // //           queryClient.invalidateQueries({ queryKey: ['permissions'] });
// // //         }} />
// // //       </div>
// // //     </AdminOnly>
// // //   );
// // // }
// // // // import React, { useState, useEffect } from 'react'; // Added useEffect
// // // // import { api } from '@/api/apiClient';
// // // // import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// // // // import AdminOnly from '@/components/AdminOnly';
// // // // import { Plus, Search, Edit2, Users, Mail } from 'lucide-react';
// // // // import { Card, CardContent } from "@/components/ui/card";
// // // // import { Button } from "@/components/ui/button";
// // // // import { Input } from "@/components/ui/input";
// // // // import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
// // // // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// // // // import { Label } from "@/components/ui/label";
// // // // import { AvatarImg } from "@/components/UserAvatar";
// // // // import PageHeader from '@/components/shared/PageHeader';
// // // // import DataTable from '@/components/shared/DataTable';
// // // // import StatusBadge from '@/components/shared/StatusBadge';
// // // // import EmptyState from '@/components/shared/EmptyState';
// // // // import { toast } from 'sonner';
// // // // import { useClient } from '@/lib/ClientContext';
// // // // import { usePermission } from '@/hooks/usePermission';
// // // // import { usePlatformRole } from '@/hooks/usePlatfromRole';
// // // // import InternalAndClientAdmin from '@/components/InternalAndClientAdmin';
// // // // import AddRoleDialog from '@/components/roles/AddRoleDialog';
// // // // import AddPermissionDialog from '@/components/permissions/AddPermissionDialog';

// // // // export default function AdminUsers() {
// // // //   const [searchTerm, setSearchTerm] = useState('');
// // // //   const [roleFilter, setRoleFilter] = useState('all'); // This will filter by role ID now
// // // //   const [showInviteDialog, setShowInviteDialog] = useState(false);
// // // //   const { activeClientId } = useClient(); // Only need activeClientId, switchClient is not used here
// // // //   const [inviteData, setInviteData] = useState({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' }); // roleId is now roleIds (array)
// // // //   const [selectedUser, setSelectedUser] = useState(null);
// // // //   const [showEditDialog, setShowEditDialog] = useState(false);
// // // //   const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
// // // //   const [showAddPermissionsDialog, setShowAddPermissionsDialog] = useState(false);

// // // //   const queryClient = useQueryClient();

// // // //   // Assuming usePlatformRole maps to req.user.isInternalAdmin correctly
// // // //   const isInternalAdmin = usePlatformRole('super_admin') || usePlatformRole('platform_admin');
// // // //   // Assuming usePermission checks against req.user.memberships.permissions or req.user.platform_role for global perms
// // // //   const canInviteUser = usePermission('client:users.invite'); // Use resource:action format

// // // //   // Placeholder for internal admin permission to invite platform users
// // // //   const canInvitePlatformUser = usePermission('platform:users.invite'); // Assuming such a permission exists or is checked by platform_admin role

// // // //   // No return Forbidden here, AdminOnly component handles it or a route guard.
// // // //   // if (!canInviteUser && !canInvitePlatformUser) { ... }

// // // //   const [page, setPage] = useState(1); // Page is declared but not used in the query for now.

// // // //   const { data: usersData = {}, isLoading } = useQuery({
// // // //     queryKey: ['admin-users'],
// // // //     // API call needs to handle pagination if `page` state is to be used
// // // //     queryFn: () => api.getUsers({ page, limit: 50, order: '-created_at' }), // Adjust limit as needed
// // // //   });
// // // //   const users = usersData?.users ?? []; // Accessing users from returned data object

// // // //   const { data: clients = [] } = useQuery({
// // // //     queryKey: ['clients'],
// // // //     queryFn: () => api.getClients({ order: 'company_name', limit: 200 }),
// // // //     enabled: isInternalAdmin, // Only internal admins can list all clients
// // // //   });

// // // //   const { data: roles = [] } = useQuery({
// // // //     queryKey: ['roles'],
// // // //     queryFn: () => api.getRoles({ limit: 200 }), // Fetch all roles to populate dropdowns
// // // //   });

// // // //   const { data: permissions = [] } = useQuery({
// // // //     queryKey: ['permissions'],
// // // //     queryFn: () => api.getPermissions({ limit: 200 }), // Fetch all permissions
// // // //   });

// // // //   const updateUserMutation = useMutation({
// // // //     mutationFn: ({ id, data }) => api.updateUser(id, data), // This now expects an object matching the PATCH /api/users/:id structure
// // // //     onSuccess: () => {
// // // //       queryClient.invalidateQueries({ queryKey: ['admin-users'] });
// // // //       setShowEditDialog(false);
// // // //       setSelectedUser(null);
// // // //       toast.success('User updated successfully');
// // // //     },
// // // //     onError: (error) => {
// // // //       console.error('Failed to update user:', error);
// // // //       toast.error(`Failed to update user: ${error.response?.data?.error || error.message}`);
// // // //     }
// // // //   });

// // // //   const inviteUserMutation = useMutation({
// // // //     mutationFn: (invitePayload) => api.inviteUser(invitePayload),
// // // //     onSuccess: () => {
// // // //       queryClient.invalidateQueries({ queryKey: ['admin-users'] }); // Invalidate user list to show new user if accepted
// // // //       toast.success('Invitation sent successfully');
// // // //       setShowInviteDialog(false);
// // // //       setInviteData({ email: '', roleIds: [], platformRole: '', inviteType: 'client', clientId: '' }); // Reset invite data
// // // //     },
// // // //     onError: (error) => {
// // // //       console.error('Failed to send invitation:', error);
// // // //       toast.error(`Failed to send invitation: ${error.response?.data?.error || error.message}`);
// // // //     }
// // // //   });

// // // //   const handleInvite = async () => {
// // // //     const payload = {
// // // //       email: inviteData.email,
// // // //       inviteType: inviteData.inviteType,
// // // //       platformRole: inviteData.platformRole,
// // // //       invited_by_message: '', // Add message if needed
// // // //     };

// // // //     if (inviteData.inviteType === 'client') {
// // // //       if (!inviteData.clientId) {
// // // //         toast.error('Client is required for client invite.');
// // // //         return;
// // // //       }
// // // //       if (inviteData.roleIds.length === 0) { // Ensure roleIds is an array
// // // //         toast.error('At least one role is required for client invite.');
// // // //         return;
// // // //       }
// // // //       payload.clientId = inviteData.clientId;
// // // //       payload.role_ids = inviteData.roleIds; // Backend expects role_ids array
// // // //     } else if (inviteData.inviteType === 'platform') {
// // // //       if (!inviteData.platformRole) {
// // // //         toast.error('Platform role is required for platform invite.');
// // // //         return;
// // // //       }
// // // //       // No clientId or roleIds for platform invite
// // // //     }

// // // //     inviteUserMutation.mutate(payload);
// // // //   };

// // // //   const handleEditUser = (user) => {
// // // //     // Populate selectedUser with the full membership structure for editing
// // // //     // This assumes the edit dialog will need to be more complex to handle multiple memberships/roles
// // // //     setSelectedUser({
// // // //       ...user,
// // // //       // For simplified editing in the dialog, we might extract one membership's details
// // // //       // For a full multi-membership editor, the dialog UI would need significant refactor.
// // // //       // For now, let's just make sure the full user object is available.
// // // //     });
// // // //     setShowEditDialog(true);
// // // //   };

// // // //   const handleUpdateUser = async () => {
// // // //     if (!selectedUser) return;

// // // //     const updatePayload = {
// // // //       status: selectedUser.status,
// // // //       // Only update platform_role if the current user is an internal admin
// // // //       ...(isInternalAdmin && { platform_role: selectedUser.platform_role }),
// // // //       full_name: selectedUser.full_name, // Assuming full_name can be edited
// // // //       phone: selectedUser.phone, // Assuming phone can be edited
// // // //       job_title: selectedUser.job_title, // Assuming job_title can be edited
// // // //       avatar_storage_key: selectedUser.avatar_storage_key, // Assuming avatar can be edited
// // // //     };

// // // //     // If editing memberships, reconstruct the array matching backend expectations
// // // //     // This is a simplified example; a real editor would have UI for each membership
// // // //     if (selectedUser.memberships && Array.isArray(selectedUser.memberships)) {
// // // //       updatePayload.memberships = selectedUser.memberships.map(m => ({
// // // //         clientId: m.client.id, // Or m.client_id directly if flattened
// // // //         roleIds: m.roles.map(r => r.id),
// // // //       }));
// // // //     }

// // // //     updateUserMutation.mutate(
// // // //       {
// // // //         id: selectedUser.id,
// // // //         data: updatePayload
// // // //       });
// // // //   };

// // // //   const filteredUsers = users.filter(user => {
// // // //     const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
// // // //       user.email?.toLowerCase().includes(searchTerm.toLowerCase());

// // // //     let matchesRole = true;
// // // //     if (roleFilter !== 'all') {
// // // //       // Check if user has the selected platform_role or any role within any membership
// // // //       const hasPlatformRole = user.platform_role === roleFilter;
// // // //       const hasMembershipRole = user.memberships.some(m => m.roles.some(role => role.id === roleFilter)); // Compare role ID
// // // //       matchesRole = hasPlatformRole || hasMembershipRole;
// // // //     }

// // // //     return matchesSearch && matchesRole;
// // // //   });

// // // //   const getInitials = (name) => {
// // // //     if (!name) return 'U';
// // // //     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
// // // //   };

// // // //   const columns = [
// // // //     {
// // // //       header: 'User',
// // // //       render: (row) => (
// // // //         <div className="flex items-center gap-3">
// // // //           <AvatarImg avatarKey={row.avatar_storage_key} fallback={getInitials(row.full_name)} />
// // // //           <div>
// // // //             <p className="font-medium text-slate-900">{row.full_name || 'No Name'}</p>
// // // //             <p className="text-sm text-slate-500">{row.email}</p>
// // // //           </div>
// // // //         </div>
// // // //       )
// // // //     },
// // // //     { // Display Platform Role and then Client Roles
// // // //       header: 'Role(s)',
// // // //       render: (row) => (
// // // //         <div className="flex flex-col gap-0.5">
// // // //           {row.platform_role && (
// // // //             <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
// // // //               {row.platform_role.replace(/_/g, ' ')} {/* Nicer display */}
// // // //             </span>
// // // //           )}
// // // //           {row.memberships.map(m => (
// // // //             <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
// // // //               {`${m.client_name || m.client.company_name}: ${m.roles.map(r => r.name).join(', ')}`}
// // // //             </span>
// // // //           ))}
// // // //         </div>
// // // //       )
// // // //     },
// // // //     isInternalAdmin && { // Show permissions only for internal admins
// // // //       header: 'Permissions',
// // // //       render: (row) => (
// // // //         <div className="flex flex-col gap-0.5">
// // // //           {row.memberships.map(m => (
// // // //             <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
// // // //               {`${m.client_name || m.client.company_name}: [${m.permissions.join(', ')}]`}
// // // //             </span>
// // // //           ))}
// // // //           {/* Add global permissions here if needed based on platform_role */}
// // // //         </div>
// // // //       )
// // // //     },
// // // //     isInternalAdmin && { // Show client name only for internal admins
// // // //       header: 'Client',
// // // //       render: (row) => (
// // // //         <div className="flex flex-col gap-0.5">
// // // //           {row.memberships.map(m => (
// // // //             <span key={m.id} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
// // // //               {m.client_name || m.client.company_name}
// // // //             </span>
// // // //           ))}
// // // //         </div>
// // // //       )
// // // //     },
// // // //     {
// // // //       header: 'Status',
// // // //       render: (row) => <StatusBadge status={row.status || 'active'} />
// // // //     },
// // // //     {
// // // //       header: 'Actions',
// // // //       render: (row) => (
// // // //         <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditUser(row); }}>
// // // //           <Edit2 className="h-4 w-4" />
// // // //         </Button>
// // // //       )
// // // //     },
// // // //   ].filter(Boolean); // Filter out false values from conditional columns

// // // //   return (
// // // //     <AdminOnly> {/* Ensures only authorized users see this page */}
// // // //       <div className="space-y-6">
// // // //         <PageHeader
// // // //           title="Users"
// // // //           subtitle="Manage user accounts, roles, and permissions across clients and platform."
// // // //           actions={
// // // //             <>
// // // //               {canInviteUser || canInvitePlatformUser ? ( // Only show invite if user has permission
// // // //                 <Button
// // // //                   onClick={() => setShowInviteDialog(true)}
// // // //                   className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
// // // //                 >
// // // //                   <Mail className="h-4 w-4 mr-2" />
// // // //                   Invite User
// // // //                 </Button>
// // // //               ) : null}
// // // //               {/* These buttons are for adding global roles/permissions, likely restricted to super_admin or platform_admin */}
// // // //               {isInternalAdmin && (
// // // //                 <Button
// // // //                   onClick={() => setShowAddRoleDialog(true)}
// // // //                   className="bg-gray-200 text-gray-800 hover:bg-gray-300" // Changed color to distinguish
// // // //                 >
// // // //                   <Plus className="h-4 w-4 mr-2" />
// // // //                   Add Role Type
// // // //                 </Button>
// // // //               )}
// // // //               {isInternalAdmin && (
// // // //                 <Button
// // // //                   onClick={() => setShowAddPermissionsDialog(true)}
// // // //                   className="bg-gray-200 text-gray-800 hover:bg-gray-300" // Changed color to distinguish
// // // //                 >
// // // //                   <Plus className="h-4 w-4 mr-2" />
// // // //                   Add Permission Type
// // // //                 </Button>
// // // //               )}
// // // //             </>
// // // //           }
// // // //         />

// // // //         <Card className="border-0 shadow-sm">
// // // //           <CardContent className="p-4">
// // // //             <div className="flex flex-col sm:flex-row gap-4">
// // // //               <div className="relative flex-1">
// // // //                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
// // // //                 <Input
// // // //                   placeholder="Search users by name or email..."
// // // //                   value={searchTerm}
// // // //                   onChange={(e) => setSearchTerm(e.target.value)}
// // // //                   className="pl-9"
// // // //                 />
// // // //               </div>
// // // //               <Select value={roleFilter} onValueChange={setRoleFilter}>
// // // //                 <SelectTrigger className="w-full sm:w-48">
// // // //                   <SelectValue placeholder="Filter by Role" />
// // // //                 </SelectTrigger>
// // // //                 <SelectContent>
// // // //                   <SelectItem value="all">All Roles</SelectItem>
// // // //                   {/* Assuming these are platform roles */}
// // // //                   <SelectItem value="super_admin">Super Admin</SelectItem>
// // // //                   <SelectItem value="platform_admin">Platform Admin</SelectItem>
// // // //                   <SelectItem value="platform_user">Platform User</SelectItem>
// // // //                   {/* Then list client-specific roles */}
// // // //                   {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))} {/* Value is now role.id */}
// // // //                 </SelectContent>
// // // //               </Select>
// // // //             </div>
// // // //           </CardContent>
// // // //         </Card>

// // // //         {users.length === 0 && !isLoading ? (
// // // //           <EmptyState
// // // //             icon={Users}
// // // //             title="No users yet"
// // // //             description="Invite users to get started"
// // // //             action={() => setShowInviteDialog(true)}
// // // //             actionLabel="Invite User"
// // // //           />
// // // //         ) : (
// // // //           <DataTable
// // // //             columns={columns}
// // // //             data={filteredUsers}
// // // //             isLoading={isLoading}
// // // //             emptyMessage="No users match your search"
// // // //           />
// // // //         )}

// // // //         {/* Invite Dialog */}
// // // //         <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
// // // //           <DialogContent className="sm:max-w-md">
// // // //             <DialogHeader>
// // // //               <DialogTitle>Invite User</DialogTitle>
// // // //             </DialogHeader>
// // // //             <div className="space-y-4 py-4">
// // // //               <div>
// // // //                 <Label>Email Address</Label>
// // // //                 <Input
// // // //                   type="email"
// // // //                   placeholder="user@example.com"
// // // //                   value={inviteData.email}
// // // //                   onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
// // // //                   className="mt-1"
// // // //                 />
// // // //               </div>
// // // //               {isInternalAdmin && <div>
// // // //                 <Label> Invite Type</Label>
// // // //                 <Select value={inviteData.inviteType} onValueChange={(v) => {
// // // //                   setInviteData({ ...inviteData, inviteType: v, platformRole: '', roleIds: [], clientId: '' }); // Reset related fields on type change
// // // //                 }}>
// // // //                   <SelectTrigger className="mt-1">
// // // //                     <SelectValue />
// // // //                   </SelectTrigger>
// // // //                   <SelectContent>
// // // //                     <SelectItem value="platform">Platform User </SelectItem>
// // // //                     <SelectItem value="client">Client User</SelectItem>
// // // //                   </SelectContent>
// // // //                 </Select>
// // // //               </div>}
// // // //               {isInternalAdmin && inviteData.inviteType === 'platform' && (
// // // //                 <div>
// // // //                   <Label> Platform Role</Label>
// // // //                   <Select value={inviteData.platformRole} onValueChange={(v) => setInviteData({ ...inviteData, platformRole: v })}>
// // // //                     <SelectTrigger className="mt-1">
// // // //                       <SelectValue />
// // // //                     </SelectTrigger>
// // // //                     <SelectContent>
// // // //                       <SelectItem value="platform_admin">Platform Admin</SelectItem>
// // // //                       <SelectItem value="platform_user">Platform User</SelectItem>
// // // //                     </SelectContent>
// // // //                   </Select>
// // // //                   <p className="text-xs text-slate-500 mt-1">
// // // //                     {inviteData.platformRole === 'platform_admin' ? 'Full platform access.' :
// // // //                       'Standard platform user access.'}
// // // //                   </p>
// // // //                 </div>
// // // //               )}
// // // //               {inviteData.inviteType === 'client' && (
// // // //                 <>
// // // //                   <div>
// // // //                     <Label>Role(s)</Label>
// // // //                     {/* For multiple roles, this would need to be a multi-select component */}
// // // //                     <Select value={inviteData.roleIds[0] || ''} onValueChange={(v) => setInviteData({ ...inviteData, roleIds: [v] })}>
// // // //                       <SelectTrigger className="mt-1">
// // // //                         <SelectValue placeholder="Select role" />
// // // //                       </SelectTrigger>
// // // //                       <SelectContent>
// // // //                         {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
// // // //                       </SelectContent>
// // // //                     </Select>
// // // //                     <p className="text-xs text-slate-500 mt-1">
// // // //                       Assign one or more roles for the user within the selected client.
// // // //                     </p>
// // // //                   </div>
// // // //                   {(isInternalAdmin || activeClientId) && ( // Show client selector for internal admin or if current user is in a client context
// // // //                     <div>
// // // //                       <Label>Assign to Client</Label>
// // // //                       <Select
// // // //                         value={inviteData.clientId || ''}
// // // //                         onValueChange={(v) => setInviteData({ ...inviteData, clientId: v })}
// // // //                       >
// // // //                         <SelectTrigger className="mt-1">
// // // //                           <SelectValue placeholder="Select client" />
// // // //                         </SelectTrigger>
// // // //                         <SelectContent>
// // // //                           {isInternalAdmin ? ( // Internal admin can pick any client
// // // //                             clients.map(client => (
// // // //                               <SelectItem key={client.id} value={client.id}>
// // // //                                 {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
// // // //                               </SelectItem>
// // // //                             ))
// // // //                           ) : ( // Regular client admin can only invite to their active client
// // // //                             activeClientId && clients.filter(c => c.id === activeClientId).map(client => (
// // // //                               <SelectItem key={client.id} value={client.id}>
// // // //                                 {client.company_name}{client.coaster_name ? ` · ${client.coaster_name}` : ''}
// // // //                               </SelectItem>
// // // //                             ))
// // // //                           )}
// // // //                         </SelectContent>
// // // //                       </Select>
// // // //                     </div>
// // // //                   )}
// // // //                 </>
// // // //               )}
// // // //             </div>
// // // //             <DialogFooter>
// // // //               <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
// // // //               <Button
// // // //                 onClick={handleInvite}
// // // //                 disabled={!inviteData.email || inviteUserMutation.isPending || (inviteData.inviteType === 'platform' && !inviteData.platformRole) || (inviteData.inviteType === 'client' && (!inviteData.clientId || inviteData.roleIds.length === 0))}
// // // //                 className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
// // // //               >
// // // //                 {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
// // // //               </Button>
// // // //             </DialogFooter>
// // // //           </DialogContent>
// // // //         </Dialog>

// // // //         {/* Edit User Dialog */}
// // // //         <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
// // // //           <DialogContent className="sm:max-w-lg"> {/* Increased width for more content */}
// // // //             <DialogHeader>
// // // //               <DialogTitle>Edit User: {selectedUser?.full_name || selectedUser?.email}</DialogTitle>
// // // //             </DialogHeader>
// // // //             {selectedUser && (
// // // //               <div className="space-y-4 py-4">
// // // //                 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
// // // //                   <AvatarImg avatarKey={selectedUser.avatar_storage_key} fallback={getInitials(selectedUser.full_name)} />
// // // //                   <div>
// // // //                     <p className="font-medium">{selectedUser.full_name || 'No Name'}</p>
// // // //                     <p className="text-sm text-slate-500">{selectedUser.email}</p>
// // // //                   </div>
// // // //                 </div>

// // // //                 {/* Editable User Details */}
// // // //                 <div>
// // // //                   <Label htmlFor="fullName">Full Name</Label>
// // // //                   <Input
// // // //                     id="fullName"
// // // //                     value={selectedUser.full_name || ''}
// // // //                     onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
// // // //                     className="mt-1"
// // // //                   />
// // // //                 </div>
// // // //                 <div>
// // // //                   <Label htmlFor="phone">Phone</Label>
// // // //                   <Input
// // // //                     id="phone"
// // // //                     value={selectedUser.phone || ''}
// // // //                     onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })}
// // // //                     className="mt-1"
// // // //                   />
// // // //                 </div>
// // // //                 <div>
// // // //                   <Label htmlFor="jobTitle">Job Title</Label>
// // // //                   <Input
// // // //                     id="jobTitle"
// // // //                     value={selectedUser.job_title || ''}
// // // //                     onChange={(e) => setSelectedUser({ ...selectedUser, job_title: e.target.value })}
// // // //                     className="mt-1"
// // // //                   />
// // // //                 </div>

// // // //                 {isInternalAdmin && ( // Only internal admins can change platform role
// // // //                   <div>
// // // //                     <Label>Platform Role</Label>
// // // //                     <Select
// // // //                       value={selectedUser.platform_role || ''}
// // // //                       onValueChange={(v) => setSelectedUser({ ...selectedUser, platform_role: v })}
// // // //                     >
// // // //                       <SelectTrigger className="mt-1">
// // // //                         <SelectValue placeholder="Select platform role" />
// // // //                       </SelectTrigger>
// // // //                       <SelectContent>
// // // //                         <SelectItem value="super_admin">Super Admin</SelectItem>
// // // //                         <SelectItem value="platform_admin">Platform Admin</SelectItem>
// // // //                         <SelectItem value="platform_user">Platform User</SelectItem>
// // // //                       </SelectContent>
// // // //                     </Select>
// // // //                   </div>
// // // //                 )}

// // // //                 {isInternalAdmin && ( // Only internal admins can change user status
// // // //                   <div>
// // // //                     <Label>Account Status</Label>
// // // //                     <Select
// // // //                       value={selectedUser.status || 'active'}
// // // //                       onValueChange={(v) => setSelectedUser({ ...selectedUser, status: v })}
// // // //                     >
// // // //                       <SelectTrigger className="mt-1">
// // // //                         <SelectValue />
// // // //                       </SelectTrigger>
// // // //                       <SelectContent>
// // // //                         <SelectItem value="active">Active</SelectItem>
// // // //                         <SelectItem value="inactive">Inactive</SelectItem>
// // // //                       </SelectContent>
// // // //                     </Select>
// // // //                   </div>
// // // //                 )}

// // // //                 {/* Membership and Roles Editing (Simplified for now - needs proper component for multi-edit) */}
// // // //                 {selectedUser.memberships?.length > 0 && (
// // // //                   <div>
// // // //                     <h3 className="font-semibold text-lg mb-2">Client Memberships</h3>
// // // //                     {selectedUser.memberships.map((membership, index) => (
// // // //                       <div key={membership.id} className="border p-3 rounded-lg mb-2 bg-gray-50">
// // // //                         <p className="font-medium">{membership.client_name || membership.client.company_name}</p>
// // // //                         <div className="mt-2">
// // // //                           <Label>Roles for this Client</Label>
// // // //                           {/* This needs to be a multi-select or a more sophisticated role editor */}
// // // //                           <Select
// // // //                             value={membership.roles[0]?.id || ''} // Assuming one role for simple edit
// // // //                             onValueChange={(v) => {
// // // //                               const updatedMemberships = [...selectedUser.memberships];
// // // //                               updatedMemberships[index].roles = roles.filter(r => r.id === v); // Update role object
// // // //                               setSelectedUser({ ...selectedUser, memberships: updatedMemberships });
// // // //                             }}
// // // //                           >
// // // //                             <SelectTrigger className="mt-1">
// // // //                               <SelectValue placeholder="Select role" />
// // // //                             </SelectTrigger>
// // // //                             <SelectContent>
// // // //                               {roles.map(r => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
// // // //                             </SelectContent>
// // // //                           </Select>
// // // //                         </div>
// // // //                       </div>
// // // //                     ))}
// // // //                   </div>
// // // //                 )}
// // // //               </div>
// // // //             )}
// // // //             <DialogFooter>
// // // //               <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
// // // //               <Button
// // // //                 onClick={handleUpdateUser}
// // // //                 disabled={updateUserMutation.isPending}
// // // //                 className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
// // // //               >
// // // //                 {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
// // // //               </Button>
// // // //             </DialogFooter>
// // // //           </DialogContent>
// // // //         </Dialog>

// // // //         {/* Roles and Permission Dialogs */}
// // // //         <AddRoleDialog open={showAddRoleDialog} onClose={setShowAddRoleDialog} onSuccess={() => {
// // // //           queryClient.invalidateQueries({ queryKey: ['roles'] });
// // // //         }} />
// // // //         <AddPermissionDialog open={showAddPermissionsDialog} onClose={setShowAddPermissionsDialog} onSuccess={() => {
// // // //           queryClient.invalidateQueries({ queryKey: ['permissions'] });
// // // //         }} />
// // // //       </div>
// // // //     </AdminOnly>
// // // //   );
// // // // }