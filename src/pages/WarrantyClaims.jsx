import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Shield, Upload, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { addYears, isAfter, parseISO } from 'date-fns';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';
import { usePrivateDocument } from '@/hooks/usePrivateDocument';
import { PrivateImageLink } from '@/components/PrivateImageLink';
import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/ClientContext';

export default function WarrantyClaims() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { uploadFileToS3, isUploading } = useUpload();
  const { handleSecureView, currentlyLoadingKey } = usePrivateDocument();
  const [newClaim, setNewClaim] = useState({
    equipment_info: '',
    issue_description: '',
    images: []
  });
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();
  const MAX_IMAGES = 5;


  const {activeClientId, switchClient} = useClient()

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['warrantyClaims', activeClientId],
    queryFn: () => activeClientId 
      ? api.getWarrantyClaims({ client_id: activeClientId, order: '-created_at', limit: 100 })
      : api.getWarrantyClaims({order: '-created_at', limit: 100 }),
    enabled: !!user,
  });

  const { data: client } = useQuery({
    queryKey: ['client', activeClientId],
    queryFn: () => api.getClient(activeClientId ),
    enabled: !!activeClientId,
  });

  const createClaimMutation = useMutation({
    mutationFn: (data) => api.createWarrantyClaim(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warrantyClaims']});
      setShowNewDialog(false);
      setNewClaim({
        equipment_info: '',
        issue_description: '',
        images: []
      });
      toast.success('Warranty claim submitted successfully');
    },
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (newClaim.images.length + files.length > MAX_IMAGES) {
      toast.error(`You can only upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    setUploading(true);
    try {
      const uploadedStorageKeys = [];
      for (const file of files) {
        const file_key = await uploadFileToS3({client_id: activeClientId, file, type:'claim_img'})
        // Create the native preview URL for this file
  const previewUrl = URL.createObjectURL(file);
  uploadedStorageKeys.push({
    uploadedStorageKey: file_key,
    previewUrl: previewUrl
  });
      }
      setNewClaim(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedStorageKeys]
      }));
      toast.success(`${files.length} image(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload image');
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    const targetImg = newClaim.images[index];
  if (targetImg.previewUrl) {
    URL.revokeObjectURL(targetImg.previewUrl);
  }
    setNewClaim(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const clientData = client;

  const warrantyStatus = (() => {
    if (!clientData) return null;
    if (clientData.no_warranty) return { valid: false, reason: 'no_warranty' };
    if (!clientData.warranty_start_date) return { valid: false, reason: 'not_set' };
    const start = parseISO(clientData.warranty_start_date);
    const years = clientData.subscription_tier === 'basic' ? 1 : 2;
    const expiry = addYears(start, years);
    return isAfter(expiry, new Date())
      ? { valid: true, expiry, years }
      : { valid: false, reason: 'expired', expiry };
  })();

  const handleSubmitClaim = async () => {
    if (!activeClientId) {
      toast.error('Client information is required to submit a claim');
      return;
    }
    if (warrantyStatus && !warrantyStatus.valid) {
      toast.error('Your warranty coverage does not allow submitting claims.');
      return;
    }
    const finalImagesForDatabase = newClaim.images.map(imgObj => imgObj.uploadedStorageKey);
    await createClaimMutation.mutateAsync({
      ...newClaim,
      images: [...finalImagesForDatabase],
      client_id: activeClientId,
      client_name: client?.[0]?.company_name || '',
      status: 'pending',
      claim_number: `WC-${Date.now()}`
    });
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.equipment_info?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.claim_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: 'Claim #',
      render: (row) => (
        <span className="font-medium text-slate-900">{row.claim_number || `WC-${row.id?.slice(-6)}`}</span>
      )
    },
    {
      header: 'Equipment',
      render: (row) => (
        <p className="font-medium text-slate-900 truncate max-w-xs">{row.equipment_info}</p>
      )
    },
    {
      header: 'Purchase Date',
      render: (row) => row.purchase_date ? format(new Date(row.purchase_date), 'MMM d, yyyy') : '-'
    },
    {
      header: 'Submitted',
      render: (row) => format(new Date(row.created_at), 'MMM d, yyyy')
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: '',
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); setSelectedClaim(row); }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warranty Claims"
        subtitle="Submit and track warranty claims for your equipment"
        actions={
          <Button 
            onClick={() => setShowNewDialog(true)}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Claim
          </Button>
        }
      />

      {/* Warranty Status Banner */}
      {activeClientId && (
        <Card className={`border-0 shadow-sm ${
          !clientData ? 'bg-slate-50' :
          warrantyStatus?.valid ? 'bg-emerald-50' : 
          warrantyStatus?.reason === 'not_set' ? 'bg-amber-50' : 'bg-rose-50'
        }`}>
          <CardContent className="p-4 flex items-center gap-3">
            {!clientData ? (
              <div className="h-5 w-5 rounded-full bg-slate-200 animate-pulse shrink-0" />
            ) : warrantyStatus?.valid ? (
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className={`h-5 w-5 shrink-0 ${warrantyStatus?.reason === 'not_set' ? 'text-amber-500' : 'text-rose-500'}`} />
            )}
            <div>
              {!clientData ? (
                <p className="text-sm text-slate-400">Loading warranty status...</p>
              ) : warrantyStatus?.valid ? (
                <>
                  <p className="text-sm font-semibold text-emerald-800">✓ Warranty Active</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {clientData.subscription_tier === 'basic' ? '1-year' : '2-year'} coverage · expires{' '}
                    {warrantyStatus.expiry.toLocaleDateString()}
                  </p>
                </>
              ) : warrantyStatus?.reason === 'no_warranty' ? (
                <>
                  <p className="text-sm font-semibold text-rose-800">Warranty Period Has Elapsed</p>
                  <p className="text-xs text-rose-700 mt-0.5">Your warranty period has elapsed. Please contact support for further assistance.</p>
                </>
              ) : warrantyStatus?.reason === 'expired' ? (
                <>
                  <p className="text-sm font-semibold text-rose-800">Warranty Expired</p>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Your warranty expired on {warrantyStatus.expiry.toLocaleDateString()}. New claims cannot be submitted.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-amber-800">Warranty Status Unknown</p>
                  <p className="text-xs text-amber-700 mt-0.5">Warranty start date not yet configured. Please contact support.</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
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

      {/* Claims Table */}
      {claims.length === 0 && !isLoading ? (
        <EmptyState
          icon={Shield}
          title="No warranty claims"
          description="Submit a warranty claim if you have an issue with your equipment"
          action={() => setShowNewDialog(true)}
          actionLabel="New Claim"
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredClaims}
          isLoading={isLoading}
          emptyMessage="No claims match your search"
          onRowClick={setSelectedClaim}
        />
      )}

      {/* New Claim Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Warranty Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Equipment Information</Label>
              <Input
                placeholder="Model, serial number, or description"
                value={newClaim.equipment_info}
                onChange={(e) => setNewClaim({ ...newClaim, equipment_info: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Issue Description</Label>
              <Textarea
                placeholder="Describe the issue in detail..."
                value={newClaim.issue_description}
                onChange={(e) => setNewClaim({ ...newClaim, issue_description: e.target.value })}
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label>Photos (Optional)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-[#1e3a5f] transition-colors"
                >
                  {uploading ? (
                    <span className="text-sm text-slate-500">Uploading...</span>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="text-sm text-slate-500">Click to upload images</span>
                    </>
                  )}
                </label>
              </div>
              
              {newClaim.images.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {newClaim.images.map((storage_key, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={storage_key.previewUrl}
                        alt={`Upload ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitClaim}
              disabled={!newClaim.equipment_info || !newClaim.issue_description || !activeClientId || createClaimMutation.isPending || (warrantyStatus && !warrantyStatus.valid)}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {createClaimMutation.isPending ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim Details Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Claim Details</DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Claim Number</p>
                  <p className="font-semibold">{selectedClaim.claim_number || `WC-${selectedClaim.id?.slice(-6)}`}</p>
                </div>
                <StatusBadge status={selectedClaim.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Equipment</p>
                  <p className="font-medium">{selectedClaim.equipment_info}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Purchase Date</p>
                  <p className="font-medium">
                    {selectedClaim.purchase_date 
                      ? format(new Date(selectedClaim.purchase_date), 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500">Issue Description</p>
                <p className="mt-1">{selectedClaim.issue_description}</p>
              </div>

              {selectedClaim.images && selectedClaim.images.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedClaim.images.map((storage_key, idx) => (
                      <PrivateImageLink 
                       storageKey={storage_key}
                       alt={`Claim photo ${idx + 1}`}
                       className="w-24 h-24 object-cover rounded-lg hover:opacity-80 transition-opacity">
                      </PrivateImageLink>
                    ))}
                  </div>
                </div>
              )}

              {selectedClaim.admin_notes && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Admin Response</p>
                  <p className="mt-1">{selectedClaim.admin_notes}</p>
                </div>
              )}

              {selectedClaim.resolution && (
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-600">Resolution</p>
                  <p className="mt-1 text-emerald-800">{selectedClaim.resolution}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}