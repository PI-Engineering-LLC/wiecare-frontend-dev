import React, { useState, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Search, Eye, Wrench, Calendar as CalendarIcon, Clock, CheckCircle2, Upload, FileText, Loader2, FileEdit } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import StatsCard from '@/components/shared/StatsCard';
import EmptyState from '@/components/shared/EmptyState';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { useUpload } from '@/hooks/useUpload';

export default function AdminMaintenance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    scheduled_date: null,
    admin_notes: '',
    completion_notes: ''
  });
  const [inspectionReport, setInspectionReport] = useState(null);
  const [uploadingReport, setUploadingReport] = useState(false);
  const { uploadFileToS3, isUploading } = useUpload();
  const fileInputRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-maintenance'],
    queryFn: () => api.getMaintenance(  { order:'-created_date', limit: 200}),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-maintenance']});
      setShowDialog(false);
      toast.success('Request updated successfully');
    },
  });

  const handleView = (request) => {
    setSelectedRequest(request);
    setUpdateData({
      status: request.status || 'pending',
      scheduled_date: request.scheduled_date ? new Date(request.scheduled_date) : null,
      admin_notes: request.admin_notes || '',
      completion_notes: request.completion_notes || ''
    });
    setInspectionReport(null);
    setShowDialog(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingReport(true);
    try{
    const file_key = await uploadFileToS3({client_id: selectedRequest?.client_id, file, type:'inspection_report'})     
    setInspectionReport({ file, fileKey: file_key });
    setUploadingReport(false);
    }catch(error){
      toast.error('Failed to upload file');
      setUploadingReport(false);
    }
  };

  const handleUpdate = async () => {
    let reportStorageKey = selectedRequest.inspection_report_key || null;

    // If a new report was uploaded and status is completed, save it
    if (inspectionReport?.fileKey && updateData.status === 'completed') {
      reportStorageKey = inspectionReport.fileKey;

      // Also store in Documents entity for the client
      await api.createD({
        title: `Inspection Report - ${selectedRequest.client_name} - ${format(new Date(), 'MMM d, yyyy')}`,
        description: `Inspection report for ${selectedRequest.title}`,
        category: 'inspection_report',
        coaster_name: selectedRequest.coaster_name || 'General',
        file_storage_key: reportStorageKey,
        file_type: 'pdf',
        client_id: selectedRequest.client_id,
        is_public: false,
        tags: ['inspection', 'report'],
        status: 'active'
      });
    }

    await updateMutation.mutateAsync({
      id: selectedRequest.id,
      data: {
        ...updateData,
        scheduled_date: updateData.scheduled_date?.toISOString().split('T')[0],
        ...(reportStorageKey && { inspection_report_key: reportStorageKey })
      }
    });
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const scheduledCount = requests.filter(r => r.status === 'scheduled').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  const columns = [
    {
      header: 'Request #',
      render: (row) => <span className="font-medium">{row.request_number || `MR-${row.id?.slice(-6)}`}</span>
    },
    {
      header: 'Client',
      render: (row) => <span className="font-medium">{row.client_name || '-'}</span>
    },
    {
      header: 'Type',
      render: (row) => <span className="capitalize">{row.maintenance_type?.replace(/_/g, ' ')}</span>
    },
    {
      header: 'Priority',
      render: (row) => <StatusBadge status={row.priority} />
    },
    {
      header: 'Scheduled',
      render: (row) => row.scheduled_date 
        ? format(new Date(row.scheduled_date), 'MMM d, yyyy') 
        : 'Not scheduled'
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleView(row); }}>
          <Eye className="h-4 w-4" />
        </Button>
      )
    },
  ];

  return (
    <AdminOnly>
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Requests"
        subtitle="Manage and schedule maintenance"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Pending" value={pendingCount} icon={Clock} variant="warning" />
        <StatsCard title="Scheduled" value={scheduledCount} icon={CalendarIcon} variant="primary" />
        <StatsCard title="In Progress" value={inProgressCount} icon={Wrench} variant="default" />
        <StatsCard title="Completed" value={completedCount} icon={CheckCircle2} variant="success" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search requests..."
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
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {requests.length === 0 && !isLoading ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance requests"
          description="Requests will appear here when clients submit them"
        />
      ) : (
        <DataTable columns={columns} data={filteredRequests} isLoading={isLoading} />
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maintenance Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Request Number</p>
                  <p className="font-semibold">{selectedRequest.request_number || `MR-${selectedRequest.id?.slice(-6)}`}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Client</p>
                  <p className="font-semibold">{selectedRequest.client_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="font-semibold capitalize">{selectedRequest.maintenance_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Priority</p>
                  <StatusBadge status={selectedRequest.priority} />
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500">Title</p>
                <p className="font-medium">{selectedRequest.title}</p>
              </div>

              {selectedRequest.description && (
                <div>
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="mt-1">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.equipment_info && (
                <div>
                  <p className="text-sm text-slate-500">Equipment</p>
                  <p className="font-medium">{selectedRequest.equipment_info}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Preferred Date 1</p>
                  <p className="font-medium">
                    {selectedRequest.preferred_date_1 
                      ? format(new Date(selectedRequest.preferred_date_1), 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Preferred Date 2</p>
                  <p className="font-medium">
                    {selectedRequest.preferred_date_2 
                      ? format(new Date(selectedRequest.preferred_date_2), 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label>Status</Label>
                  <Select value={updateData.status} onValueChange={(v) => setUpdateData({ ...updateData, status: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Scheduled Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full mt-1 justify-start text-left font-normal",
                          !updateData.scheduled_date && "text-slate-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {updateData.scheduled_date 
                          ? format(updateData.scheduled_date, 'PPP')
                          : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={updateData.scheduled_date}
                        onSelect={(date) => {
                          setUpdateData({ 
                            ...updateData, 
                            scheduled_date: date,
                            status: date ? 'scheduled' : updateData.status
                          });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
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
                {updateData.status === 'completed' && (
                  <div>
                    <Label>Completion Notes</Label>
                    <Textarea
                      value={updateData.completion_notes}
                      onChange={(e) => setUpdateData({ ...updateData, completion_notes: e.target.value })}
                      className="mt-1"
                      rows={2}
                      placeholder="Summary of work completed..."
                    />
                  </div>
                )}
                <div>
                  <Label>Inspection Report (PDF)</Label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {selectedRequest?.inspection_report_key && !inspectionReport ? (
                    <div className="mt-1 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 flex-1">Report already uploaded</span>
                      <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
                        Replace
                      </Button>
                    </div>
                  ) : inspectionReport ? (
                    <div className="mt-1 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-700 flex-1 truncate">{inspectionReport.file.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full mt-1 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingReport}
                    >
                      {uploadingReport ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                      ) : (
                        <><Upload className="h-4 w-4 mr-2" />Upload Inspection Report</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              variant="outline"
              className="text-[#005f27] border-[#005f27] hover:bg-[#edf0be] gap-1"
              onClick={() => {
                setShowDialog(false);
                window.location.href = createPageUrl(`AdminQuotes?maintenance_request_id=${selectedRequest.id}&client_id=${selectedRequest.client_id}&title=${encodeURIComponent(selectedRequest.title)}`);
              }}
            >
              <FileEdit className="h-4 w-4" /> Create Quote for This
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminOnly>
  );
}