import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Wrench, Clock, CheckCircle2, AlertTriangle, Download, FileText } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import StatsCard from '@/components/shared/StatsCard';
import EmptyState from '@/components/shared/EmptyState';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { useClient } from '@/lib/ClientContext';
import { usePrivateDocument } from '@/hooks/usePrivateDocument';
import { useAuth } from '@/lib/AuthContext';

export default function Maintenance() {
  const {user} = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { handleSecureView, currentlyLoadingKey } = usePrivateDocument();
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    maintenance_type: 'routine_maintenance',
    priority: 'medium',
    equipment_info: '',
    preferred_date_1: null,
    preferred_date_2: null
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    checkUrlParams();
  }, []);

  const checkUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'new') {
      setShowNewDialog(true);
    }
  };

const {activeClientId} = useClient()

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['maintenance', activeClientId],
    queryFn: () => activeClientId 
      ? api.getMaintenance({ client_id: activeClientId , order:'-created_at', limit: 100 })
      : api.getMaintenance({ order:'-created_at', limit: 100 }),
    enabled: !!user,
  });


  const createRequestMutation = useMutation({
    mutationFn: (data) => api.createMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance']});
      setShowNewDialog(false);
      setNewRequest({
        title: '',
        description: '',
        maintenance_type: 'routine_maintenance',
        priority: 'medium',
        equipment_info: '',
        preferred_date_1: null,
        preferred_date_2: null
      });
      toast.success('Maintenance request submitted successfully');
    },
  });
  const updateMutation = useMutation({
      mutationFn: ({ id, data }) => api.updateMaintenance(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['maintenance']});
        setShowNewDialog(false);
        toast.success('Request updated successfully');
      },
    });

  const handleSubmitRequest = async () => {
    if (!activeClientId) {
      toast.error('Your account is not linked to a client. Please contact support.');
      return;
    }
    
    await createRequestMutation.mutateAsync({
      ...newRequest,
      client_id: activeClientId,
      status: 'pending',
      request_number: `MR-${Date.now()}`,
      preferred_date_1: newRequest.preferred_date_1 ? formatInTimeZone(newRequest.preferred_date_1,'UTC', 'yyyy-MM-dd') : null,
      preferred_date_2: newRequest.preferred_date_2 ? formatInTimeZone(newRequest.preferred_date_2,'UTC', 'yyyy-MM-dd') : null,
    });
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.request_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const scheduledCount = requests.filter(r => r.status === 'scheduled').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  const columns = [
    {
      header: 'Request #',
      render: (row) => (
        <span className="font-medium text-slate-900">{row.request_number || `MR-${row.id?.slice(-6)}`}</span>
      )
    },
    {
      header: 'Title',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.title}</p>
          <p className="text-sm text-slate-500 capitalize">{row.maintenance_type?.replace(/_/g, ' ')}</p>
        </div>
      )
    },
    {
      header: 'Priority',
      render: (row) => <StatusBadge status={row.priority} />
    },
    {
      header: 'Scheduled Date',
      render: (row) => row.scheduled_date 
      ? formatInTimeZone(new Date(row.scheduled_date),'UTC', 'MMM d, yyyy') 
      : 'Pending'
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.status === 'completed' && row.maintenance_type === 'inspection' && row.inspection_report_key && (
            <Button
              variant="ghost"
              size="sm"
              className="text-green-700 hover:text-green-800 hover:bg-green-50 text-xs"
              onClick={async (e) => {
                try {
                  await handleSecureView(e, row.inspection_report_key, true)

                } catch (error) {
                  if (error.message === "FILE_MISSING_IN_STORAGE") {
                    try {
                      await updateMutation.mutateAsync({ id: row.id, data: { inspection_report_key: null } });
                      const existingDoc = await api.getDs({ file_storage_key: row.inspection_report_key });
                      if (existingDoc.length > 0) {
                        await api.updateD(existingDoc.id, { file_storage_key: null, status: 'archived' })
                      }
                    } catch (error) {
                      toast.error('Error occured');
                    }

                    toast.error('File Not Found');
                  } else {
                    toast.error('Failed to download, please try again');
                  }
                }

              }

              }
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              {currentlyLoadingKey === row.inspection_report_key? 'Authorizing Access...' :'Report'}
              
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); setSelectedRequest(row); }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ];

  const maintenanceTypes = [
    { value: 'service_call', label: 'Service Visit' },
    { value: 'inspection', label: 'Inspection' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Requests"
        subtitle="Schedule and track maintenance for your equipment"
        actions={
          <Button 
            onClick={() => setShowNewDialog(true)}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Requests" value={requests.length} icon={Wrench} />
        <StatsCard title="Pending" value={pendingCount} icon={Clock} variant="warning" />
        <StatsCard title="Scheduled" value={scheduledCount} icon={CalendarIcon} variant="primary" />
        <StatsCard title="Completed" value={completedCount} icon={CheckCircle2} variant="success" />
      </div>

      {/* Filters */}
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
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      {requests.length === 0 && !isLoading ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance requests"
          description="Submit a maintenance request for your equipment"
          action={() => setShowNewDialog(true)}
          actionLabel="New Request"
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredRequests}
          isLoading={isLoading}
          emptyMessage="No requests match your search"
          onRowClick={setSelectedRequest}
        />
      )}

      {/* New Request Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Brief description of the issue"
                value={newRequest.title}
                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Maintenance Type</Label>
                <Select 
                  value={newRequest.maintenance_type} 
                  onValueChange={(v) => setNewRequest({ ...newRequest, maintenance_type: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select 
                  value={newRequest.priority} 
                  onValueChange={(v) => setNewRequest({ ...newRequest, priority: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Detailed description of the maintenance needed..."
                value={newRequest.description}
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preferred Date 1</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-1 justify-start text-left font-normal",
                        !newRequest.preferred_date_1 && "text-slate-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newRequest.preferred_date_1 
                        ? formatInTimeZone(newRequest.preferred_date_1,'UTC', 'PPP')
                        : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newRequest.preferred_date_1}
                      onSelect={(date) => setNewRequest({ ...newRequest, preferred_date_1: date })}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Preferred Date 2 (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-1 justify-start text-left font-normal",
                        !newRequest.preferred_date_2 && "text-slate-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newRequest.preferred_date_2 
                        ? formatInTimeZone(newRequest.preferred_date_2,'UTC', 'PPP')
                        : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newRequest.preferred_date_2}
                      onSelect={(date) => setNewRequest({ ...newRequest, preferred_date_2: date })}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitRequest}
              disabled={!newRequest.title || createRequestMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {createRequestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Details Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Request Number</p>
                  <p className="font-semibold">{selectedRequest.request_number || `MR-${selectedRequest.id?.slice(-6)}`}</p>
                </div>
                <StatusBadge status={selectedRequest.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="font-medium capitalize">{selectedRequest.maintenance_type?.replace(/_/g, ' ')}</p>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Preferred Date 1</p>
                  <p className="font-medium">
                    {selectedRequest.preferred_date_1 
                      ? formatInTimeZone(new Date(selectedRequest.preferred_date_1),'UTC', 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Preferred Date 2</p>
                  <p className="font-medium">
                    {selectedRequest.preferred_date_2 
                      ? formatInTimeZone(new Date(selectedRequest.preferred_date_2),'UTC', 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedRequest.scheduled_date && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Scheduled Date</p>
                  <p className="text-lg font-bold text-blue-800">
                  {formatInTimeZone(new Date(selectedRequest.scheduled_date),'UTC', 'MMMM d, yyyy')}
                  </p>
                </div>
              )}

              {selectedRequest.admin_notes && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Admin Notes</p>
                  <p className="mt-1">{selectedRequest.admin_notes}</p>
                </div>
              )}

              {selectedRequest.status === 'completed' && selectedRequest.maintenance_type === 'inspection' && (
                <div className={`p-4 rounded-lg border ${selectedRequest.inspection_report_key ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className={`h-5 w-5 ${selectedRequest.inspection_report_key ? 'text-green-600' : 'text-amber-500'}`} />
                      <div>
                        <p className={`text-sm font-medium ${selectedRequest.inspection_report_key ? 'text-green-800' : 'text-amber-800'}`}>
                          Inspection Report
                        </p>
                        <p className={`text-xs ${selectedRequest.inspection_report_key ? 'text-green-600' : 'text-amber-600'}`}>
                          {selectedRequest.inspection_report_key ? 'Report available for download' : 'Report not yet uploaded'}
                        </p>
                      </div>
                    </div>
                    {selectedRequest.inspection_report_key && (
                      <Button
                        size="sm"
                        className="bg-green-700 hover:bg-green-800"
                        onClick={async (e) => {
                          try {
                            await handleSecureView(e, selectedRequest.inspection_report_key, true)

                          } catch (error) {
                            if (error.message === "FILE_MISSING_IN_STORAGE") {
                              try {
                                await updateMutation.mutateAsync({ id: selectedRequest.id, data: { inspection_report_key: null } });
                                const existingDoc = await api.getDs({ file_storage_key: selectedRequest.inspection_report_key });
                                if (existingDoc.length > 0) {
                                  await api.updateD(existingDoc.id, { file_storage_key: null, status: 'archived' })
                                }
                              } catch (error) {
                                toast.error('Error occured');
                              }
          
                              toast.error('File Not Found');
                            } else {
                              toast.error('Failed to download, please try again');
                            }
                          }

                        }

                        }

                      >
                        <Download className="h-4 w-4 mr-1" />
                        {currentlyLoadingKey === selectedRequest.inspection_report_key? 'Authorizing Access...' :'Download'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}