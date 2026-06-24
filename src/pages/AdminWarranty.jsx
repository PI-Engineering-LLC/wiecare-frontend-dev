import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Search, Eye, Shield, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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
import StatsCard from '@/components/shared/StatsCard';
import EmptyState from '@/components/shared/EmptyState';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';
import { PublicImage } from '@/components/PublicImage';
import { PrivateImageLink } from '@/components/PrivateImageLink';

export default function AdminWarranty() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    admin_notes: '',
    resolution: ''
  });

  const queryClient = useQueryClient();

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['admin-warranty'],
    queryFn: () => api.getWarrantyClaims({ order: '-created_at', limit: 200 }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients-warranty'],
    queryFn: () => api.getClients({ order: '-created_at', limit: 200 }),
  });

  const getClientWarranty = (clientId) => {
    const c = clients.find(cl => cl.id === clientId);
    if (!c) return null;
    if (c.no_warranty) return { valid: false, label: 'No Warranty', color: 'text-slate-500' };
    if (!c.warranty_start_date) return { valid: false, label: 'Not Set', color: 'text-amber-600' };
    const expiry = addYears(parseISO(c.warranty_start_date), c.subscription_tier === 'basic' ? 1 : 1);
    const valid = isAfter(expiry, new Date());
    return {
      valid,
      label: valid ? `Valid until ${formatInTimeZone(expiry,'UTC', 'MMM d, yyyy')}` : `Expired`,
      color: valid ? 'text-emerald-600' : 'text-rose-600'
    };
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateWarrantyClaim(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-warranty'] });
      setShowDialog(false);
      toast.success('Claim updated successfully');
    },
  });

  const handleView = (claim) => {
    setSelectedClaim(claim);
    setUpdateData({
      status: claim.status || 'pending',
      admin_notes: claim.admin_notes || '',
      resolution: claim.resolution || ''
    });
    setShowDialog(true);
  };

  const handleUpdate = async () => {
    const data = { ...updateData };
    if (updateData.status === 'resolved') {
      data.resolved_date = formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd');
    }
    await updateMutation.mutateAsync({ id: selectedClaim.id, data });
  };

  const handleQuickAction = async (claim, status) => {
    await updateMutation.mutateAsync({
      id: claim.id,
      data: {
        status,
        resolved_date: status === 'resolved' ? formatInTimeZone(new Date(),'UTC', 'yyyy-MM-dd') : null
      }
    });
  };
  const handleDeleteClaimImgByIndex = (indexToDelete, error) => { 
    if (error.status === 404) {
    setSelectedClaim((prevClaim) => ({ ...prevClaim, images: prevClaim.images.filter((_, i) => i !== indexToDelete) })); 
  }};

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.equipment_info?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = claims.filter(c => c.status === 'pending').length;
  const reviewCount = claims.filter(c => c.status === 'under_review').length;
  const approvedCount = claims.filter(c => c.status === 'approved').length;
  const rejectedCount = claims.filter(c => c.status === 'rejected').length;

  const columns = [
    {
      header: 'Claim #',
      render: (row) => <span className="font-medium">{row.claim_number || `WC-${row.id?.slice(-6)}`}</span>
    },
    {
      header: 'Client',
      render: (row) => <span className="font-medium">{row.client_name || '-'}</span>
    },
    {
      header: 'Equipment',
      render: (row) => <span className="truncate max-w-xs block">{row.equipment_info}</span>
    },
    {
      header: 'Warranty',
      render: (row) => {
        const ws = getClientWarranty(row.client_id);
        if (!ws) return <span className="text-slate-400 text-sm">-</span>;
        return <span className={`text-sm font-medium ${ws.color}`}>{ws.label}</span>;
      }
    },
    {
      header: 'Submitted',
      render: (row) => formatInTimeZone(new Date(row.created_at),'UTC', 'MMM d, yyyy')
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleView(row); }}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-emerald-600"
                onClick={(e) => { e.stopPropagation(); handleQuickAction(row, 'approved'); }}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-rose-600"
                onClick={(e) => { e.stopPropagation(); handleQuickAction(row, 'rejected'); }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )
    },
  ];

  return (
    <AdminOnly>
      <div className="space-y-6">
        <PageHeader
          title="Warranty Claims"
          subtitle="Review and manage warranty claims"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard title="Pending" value={pendingCount} icon={Shield} variant="warning" />
          <StatsCard title="Under Review" value={reviewCount} icon={Shield} variant="primary" />
          <StatsCard title="Approved" value={approvedCount} icon={CheckCircle} variant="success" />
          <StatsCard title="Rejected" value={rejectedCount} icon={XCircle} variant="danger" />
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search claims..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {claims.length === 0 && !isLoading ? (
          <EmptyState
            icon={Shield}
            title="No warranty claims"
            description="Claims will appear here when clients submit them"
          />
        ) : (
          <DataTable columns={columns} data={filteredClaims} isLoading={isLoading} />
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Warranty Claim Details</DialogTitle>
            </DialogHeader>
            {selectedClaim && (
              <div className="space-y-4 py-4">
                {(() => {
                  const ws = getClientWarranty(selectedClaim.client_id);
                  if (ws) return (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${ws.valid ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      {ws.valid
                        ? <CheckCircle className="h-4 w-4 text-emerald-600" />
                        : <AlertTriangle className="h-4 w-4 text-rose-500" />
                      }
                      <span className={`text-sm font-medium ${ws.color}`}>Warranty: {ws.label}</span>
                    </div>
                  );
                  return null;
                })()}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Claim Number</p>
                    <p className="font-semibold">{selectedClaim.claim_number || `WC-${selectedClaim.id?.slice(-6)}`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Client</p>
                    <p className="font-semibold">{selectedClaim.client_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Equipment</p>
                    <p className="font-semibold">{selectedClaim.equipment_info}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Purchase Date</p>
                    <p className="font-semibold">
                      {selectedClaim.purchase_date
                      ? formatInTimeZone(new Date(selectedClaim.purchase_date),'UTC', 'MMM d, yyyy')
                      : '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Issue Description</p>
                  <p className="mt-1 p-3 bg-slate-50 rounded-lg">{selectedClaim.issue_description}</p>
                </div>

                {selectedClaim.images && selectedClaim.images.length > 0 && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Photos</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedClaim.images.map((storage_key, idx) => (
                        <PrivateImageLink
                          storageKey={storage_key}
                          alt={`Claim photo ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded-lg hover:opacity-80 transition-opacity"
                          onError={(err) => {
                            handleDeleteClaimImgByIndex(idx,err)
                          }}
                          >
                        </PrivateImageLink>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={updateData.status} onValueChange={(v) => setUpdateData({ ...updateData, status: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Admin Notes</Label>
                    <Textarea
                      value={updateData.admin_notes}
                      onChange={(e) => setUpdateData({ ...updateData, admin_notes: e.target.value })}
                      className="mt-1"
                      rows={2}
                      placeholder="Notes visible to client..."
                    />
                  </div>
                  {(updateData.status === 'approved' || updateData.status === 'resolved') && (
                    <div>
                      <Label>Resolution</Label>
                      <Textarea
                        value={updateData.resolution}
                        onChange={(e) => setUpdateData({ ...updateData, resolution: e.target.value })}
                        className="mt-1"
                        rows={2}
                        placeholder="Describe how the claim was resolved..."
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
              >
                {updateMutation.isPending ? 'Updating...' : 'Update Claim'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminOnly>
  );
}