
import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Edit2, Building2, Shield, Lock, Unlock } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { addYears, isAfter, parseISO } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';

export default function AdminClients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    coaster_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    subscription_tier: 'basic',
    status: 'active',
    warranty_start_date: '',
    contract_date: '',
    no_warranty: false,
    on_hold: false,
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['admin-clients', searchTerm, statusFilter], // Include filters in queryKey
    queryFn: () => api.getClients({
      order: '-created_at', 
      limit: 200,
      search: searchTerm,
      status: statusFilter === 'all' ? undefined : statusFilter, // Only send status if not 'all'
    }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      setShowDialog(false);
      resetForm();
      toast.success('Client created successfully');
    },
    onError: (error) => {
        console.error('Failed to create client:', error);
        toast.error(`Failed to create client: ${error.response?.data?.error || error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      setShowDialog(false);
      resetForm();
      toast.success('Client updated successfully');
    },
    onError: (error) => {
        console.error('Failed to update client:', error);
        toast.error(`Failed to update client: ${error.response?.data?.error || error.message}`);
    }
  });

  const resetForm = () => {
    setFormData({
      company_name: '',
      coaster_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      country: '',
      subscription_tier: 'basic',
      status: 'active',
      warranty_start_date: '',
      contract_date: '',
      no_warranty: false,
      on_hold: false,
      notes: ''
    });
    setSelectedClient(null);
  };

  const getWarrantyStatus = (client) => {
    if (client.no_warranty) return { label: 'No Warranty', color: 'text-slate-500', valid: false };
    if (!client.warranty_start_date) return { label: 'Not Set', color: 'text-amber-600', valid: false };
    const start = parseISO(client.warranty_start_date);
    // const years = client.subscription_tier === 'basic' ? 1 : 2; // Assuming basic is 1 year, others are 2
    const years =  1;
    const expiry = addYears(start, years);
    const isValid = isAfter(expiry, new Date());
    return {
      label: isValid ? `Valid until ${formatInTimeZone(expiry,'UTC', 'MMM d, yyyy')}` : `Expired ${formatInTimeZone(expiry,'UTC', 'MMM d, yyyy')}`,
      color: isValid ? 'text-emerald-600' : 'text-rose-600',
      valid: isValid,
      expiry
    };
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setFormData({
      company_name: client.company_name || '',
      coaster_name: client.coaster_name || '',
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip_code: client.zip_code || '',
      country: client.country || '',
      subscription_tier: client.subscription_tier || 'basic',
      status: client.status || 'active',
      warranty_start_date: client.warranty_start_date || '', // Format for date input
      contract_date: client.contract_date || '', // Format for date input new Date(client.contract_date + 'T00:00:00') : null,
      no_warranty: client.no_warranty || false,
      on_hold: client.on_hold || false,
      notes: client.notes || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    // Basic validation for required fields
    if (!formData.company_name || !formData.contact_email) {
      toast.error('Company Name and Contact Email are required.');
      return;
    }
    if (selectedClient) {
      await updateMutation.mutateAsync({ id: selectedClient.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.coaster_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const tierLabels = {
    basic: 'Basic',
    default: 'Default',
    advanced: 'Advanced'
  };

  const columns = [
    {
      header: 'Company',
      sortKey: 'company_name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5 text-[#1e3a5f]" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.company_name}</p>
            {row.coaster_name && (
              <p className="text-sm font-medium text-blue-600">{row.coaster_name}</p>
            )}
            <p className="text-sm text-slate-500">{row.contact_email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Contact',
      render: (row) => (
        <div>
          <p className="font-medium">{row.contact_name || '-'}</p>
          <p className="text-sm text-slate-500">{row.contact_phone || '-'}</p>
        </div>
      )
    },
    {
      header: 'Subscription',
      render: (row) => (
        <span className="px-2 py-1 bg-[#1e3a5f]/10 text-[#1e3a5f] rounded text-sm font-medium">
          {tierLabels[row.subscription_tier] || 'Basic'}
        </span>
      )
    },
    {
      header: 'Warranty',
      render: (row) => {
        const ws = getWarrantyStatus(row);
        return (
          <span className={`text-sm font-medium ${ws.color}`}>
            {ws.label}
          </span>
        );
      }
    },
    {
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          {row.on_hold && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
              <Lock className="h-3 w-3" /> On Hold
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
          <Edit2 className="h-4 w-4" />
        </Button>
      )
    },
  ];
  return (<AdminOnly >
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        subtitle="Manage client organizations"
        actions={
          <Button
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        }
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </CardContent>
        </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clients yet"
          description="Add your first client to get started"
          action={() => { resetForm(); setShowDialog(true); }}
          actionLabel="Add Client"
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredClients}
          isLoading={isLoading}
          emptyMessage="No clients match your search"
        />
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Company Name *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Coaster/Ride Name</Label> {/* Made optional as per your example */}
                <Input
                  value={formData.coaster_name}
                  onChange={(e) => setFormData({ ...formData, coaster_name: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., Thunder Mountain"
                />
              </div>
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Contact Email *</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Subscription Tier</Label>
                <Select
                  value={formData.subscription_tier}
                  onValueChange={(v) => setFormData({ ...formData, subscription_tier: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>State / Province</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>ZIP / Postal Code</Label>
                <Input
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contract Date */}
              <div>
                <Label>Contract Date</Label>
                <Input
                  type="date"
                  value={formData.contract_date}
                  onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* On Hold */}
              <div className="col-span-2 flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                <div>
                  <p className="text-sm font-medium text-rose-700 flex items-center gap-1"><Lock className="h-3.5 w-3.5" /> Account Hold</p>
                  <p className="text-xs text-rose-500">Prevents client from submitting new requests</p>
                </div>
                <Switch
                  checked={formData.on_hold}
                  onCheckedChange={(v) => setFormData({ ...formData, on_hold: v })}
                />
              </div>

              {/* Warranty Section */}
              <div className="col-span-2 border-t pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Warranty
                </p>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-3">
                  <div>
                    <p className="text-sm font-medium">No Warranty</p>
                    <p className="text-xs text-slate-500">This client has no warranty coverage</p>
                  </div>
                  <Switch
                    checked={formData.no_warranty}
                    onCheckedChange={(v) => setFormData({ ...formData, no_warranty: v, warranty_start_date: v ? '' : formData.warranty_start_date })}
                  />
                </div>
                {!formData.no_warranty && (
                  <div>
                    <Label>Warranty Start Date</Label>
                    <Input
                      type="date"
                      value={formData.warranty_start_date}
                      onChange={(e) => setFormData({ ...formData, warranty_start_date: e.target.value })}
                      className="mt-1"
                    />
                    {formData.warranty_start_date && (
                       <p className="text-xs text-slate-500 mt-1">
                       {formData.subscription_tier === 'basic' ? 'Basic: 1 year warranty' : formData.subscription_tier === 'default' ? 'Default: 1 year warranty':'Pro: 1 year warranty'}
                       {' — '}expires{' '}
                       {formatInTimeZone(addYears(parseISO(formData.warranty_start_date), formData.subscription_tier === 'basic' ? 1 : 1),'UTC', 'MMM d, yyyy')}
                       </p>
                    )}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.company_name || !formData.contact_email || createMutation.isPending || updateMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : selectedClient ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </AdminOnly>);
}
