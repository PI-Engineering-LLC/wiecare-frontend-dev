import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Edit2, GraduationCap, Trash2, Users, Eye, Clock, FileEdit, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import StatsCard from '@/components/shared/StatsCard';
import EmptyState from '@/components/shared/EmptyState';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function AdminTraining() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    coaster_name: '',
    category: 'operations',
    instructor: '',
    location: '',
    is_online: false,
    meeting_link: '',
    session_date: '',
    start_time: '',
    end_time: '',
    duration_hours: 2,
    max_participants: 20,
    is_mandatory: false,
    status: 'upcoming'
  });

  const [activeTab, setActiveTab] = useState('sessions');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestUpdate, setRequestUpdate] = useState({ status: '', admin_notes: '' });


  const queryClient = useQueryClient();

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ['admin-trainings'],
    queryFn: () => api.getTrainings({ order:'-session_date', limit: 200}),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['all-registrations'],
    queryFn: () => api.getRegistrations({ order:'-created_at', limit: 500}),
  });

  const { data: trainingRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['admin-training-requests'],
    queryFn: () => api.getTrainingRequests({ order:'-created_at', limit: 200}),
  });
  
  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateTrainingRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-training-requests']});
      setShowRequestDialog(false);
      toast.success('Training request updated');
    },
  });

  const handleViewRequest = (req) => {
    setSelectedRequest(req);
    setRequestUpdate({ status: req.status || 'pending', admin_notes: req.admin_notes || '' });
    setShowRequestDialog(true);
  };
  const createMutation = useMutation({
    mutationFn: (data) => api.createTraining(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings']});
      setShowDialog(false);
      resetForm();
      toast.success('Training created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateTraining(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings']});
      setShowDialog(false);
      resetForm();
      toast.success('Training updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteTraining(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings']});
      toast.success('Training deleted');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      coaster_name: '',
      category: 'operations',
      instructor: '',
      location: '',
      is_online: false,
      meeting_link: '',
      session_date: '',
      start_time: '',
      end_time: '',
      duration_hours: 2,
      max_participants: 20,
      is_mandatory: false,
      status: 'upcoming'
    });
    setSelectedTraining(null);
  };

  const handleEdit = (training) => {
    setSelectedTraining(training);
    setFormData({
      title: training.title || '',
      description: training.description || '',
      coaster_name: training.coaster_name || '',
      category: training.category || 'operations',
      instructor: training.instructor || '',
      location: training.location || '',
      is_online: training.is_online || false,
      meeting_link: training.meeting_link || '',
      session_date: training.session_date || '',
      start_time: training.start_time || '',
      end_time: training.end_time || '',
      duration_hours: training.duration_hours || 2,
      max_participants: training.max_participants || 20,
      is_mandatory: training.is_mandatory || false,
      status: training.status || 'upcoming'
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (selectedTraining) {
      await updateMutation.mutateAsync({ id: selectedTraining.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const getRegistrationCount = (trainingId) => {
    return registrations.filter(r => r.training_id === trainingId && r.status === 'registered').length;
  };

  const filteredTrainings = trainings.filter(training => {
    const matchesSearch = training.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || training.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pendingRequestsCount = trainingRequests.filter(r => r.status === 'pending').length;

  const requestColumns = [
    {
      header: 'Client',
      render: (row) => <span className="font-medium">{row.client_name || '-'}</span>
    },
    {
      header: 'Type',
      render: (row) => <span className="capitalize">{row.training_type?.replace(/_/g, ' ') || '-'}</span>
    },
    {
      header: 'Participants',
      render: (row) => <span>{row.number_of_participants || 1}</span>
    },
    {
      header: 'Preferred Dates',
      render: (row) => (
        <div className="text-sm">
          {row.preferred_date_1 ? <p>{formatInTimeZone(new Date(row.preferred_date_1),'UTC', 'MMM d, yyyy')}</p> : null}
          {row.preferred_date_2 ? <p className="text-slate-400">{formatInTimeZone(new Date(row.preferred_date_2),'UTC', 'MMM d, yyyy')}</p> : null}
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleViewRequest(row); }}>
          <Eye className="h-4 w-4" />
        </Button>
      )
    },
  ];

  const categories = ['safety', 'operations', 'maintenance', 'business', 'technical', 'certification'];

  const columns = [
    {
      header: 'Training',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.title}</p>
          {row.coaster_name && (
            <p className="text-sm text-slate-600 mt-0.5">{row.coaster_name}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize text-xs">{row.category}</Badge>
            {row.is_mandatory && <Badge variant="destructive" className="text-xs">Mandatory</Badge>}
          </div>
        </div>
      )
    },
    {
      header: 'Date & Time',
      render: (row) => (
        <div>
          <p className="font-medium">{row.session_date ? formatInTimeZone(new Date(row.session_date),'UTC', 'MMM d, yyyy') : '-'}</p>
          <p className="text-sm text-slate-500">{row.start_time} - {row.end_time}</p>
        </div>
      )
    },
    {
      header: 'Location',
      render: (row) => (
        <span className={row.is_online ? 'text-blue-600' : ''}>
          {row.is_online ? 'Online' : row.location || '-'}
        </span>
      )
    },
    {
      header: 'Registrations',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-slate-400" />
          <span>{getRegistrationCount(row.id)}/{row.max_participants || '∞'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(row.id); }}>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <AdminOnly>
    <div className="space-y-6">
      <PageHeader
        title="Training Sessions"
        subtitle="Create and manage training sessions"
        actions={
          <Button 
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Training
          </Button>
        }
      />

<Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sessions">Training Sessions</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Training Requests
            {pendingRequestsCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-semibold">
                {pendingRequestsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4 mt-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search training..."
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
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {trainings.length === 0 && !isLoading ? (
        <EmptyState
          icon={GraduationCap}
          title="No training sessions"
          description="Create your first training session"
          action={() => { resetForm(); setShowDialog(true); }}
          actionLabel="Create Training"
        />
      ) : (
        <DataTable columns={columns} data={filteredTrainings} isLoading={isLoading} />
      )}
      </TabsContent>
      <TabsContent value="requests" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatsCard title="Pending" value={trainingRequests.filter(r => r.status === 'pending').length} icon={Clock} variant="warning" />
            <StatsCard title="Scheduled" value={trainingRequests.filter(r => r.status === 'scheduled').length} icon={CalendarIcon} variant="primary" />
            <StatsCard title="Completed" value={trainingRequests.filter(r => r.status === 'completed').length} icon={GraduationCap} variant="success" />
          </div>

          {trainingRequests.length === 0 && !isLoadingRequests ? (
            <EmptyState
              icon={GraduationCap}
              title="No training requests"
              description="Client training requests will appear here"
            />
          ) : (
            <DataTable columns={requestColumns} data={trainingRequests} isLoading={isLoadingRequests} />
          )}
        </TabsContent>
      </Tabs>

      {/* Training Request Detail Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Training Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Client</p>
                  <p className="font-semibold">{selectedRequest.client_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Submitted By</p>
                  <p className="font-semibold">{selectedRequest.user_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Training Type</p>
                  <p className="font-semibold capitalize">{selectedRequest.training_type?.replace(/_/g, ' ') || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Participants</p>
                  <p className="font-semibold">{selectedRequest.number_of_participants || 1}</p>
                </div>
              </div>

              {selectedRequest.description && (
                <div>
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="mt-1">{selectedRequest.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
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
                      ? formatInTimeZone(new Date(selectedRequest.preferred_date_2), 'UTC', 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label>Status</Label>
                  <Select value={requestUpdate.status} onValueChange={(v) => setRequestUpdate({ ...requestUpdate, status: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={requestUpdate.admin_notes}
                    onChange={(e) => setRequestUpdate({ ...requestUpdate, admin_notes: e.target.value })}
                    className="mt-1"
                    rows={2}
                    placeholder="Notes visible to client..."
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
            <Button
              variant="outline"
              className="text-[#005f27] border-[#005f27] hover:bg-[#edf0be] gap-1"
              onClick={() => {
                setShowRequestDialog(false);
                window.location.href = createPageUrl(`AdminQuotes?training_request_id=${selectedRequest.id}&client_id=${selectedRequest.client_id}&title=${encodeURIComponent(`Training: ${selectedRequest.training_type?.replace(/_/g, ' ')}`)}`);
              }}
            >
              <FileEdit className="h-4 w-4" /> Create Quote
            </Button>
            <Button
              variant="outline"
              className="text-[#1e3a5f] border-[#1e3a5f] hover:bg-blue-50 gap-1"
              onClick={() => {
                setActiveTab('sessions');
                setShowRequestDialog(false);
                resetForm();
                setFormData(prev => ({
                  ...prev,
                  title: `${selectedRequest.training_type?.replace(/_/g, ' ')} - ${selectedRequest.client_name}`,
                  category: selectedRequest.training_type === 'maintenance' ? 'maintenance' : 'operations',
                  max_participants: selectedRequest.number_of_participants || 1,
                  session_date: selectedRequest.preferred_date_1 || '',
                }));
                setShowDialog(true);
                updateRequestMutation.mutate({ id: selectedRequest.id, data: { ...requestUpdate, status: 'scheduled' } });
              }}
            >
              <CalendarIcon className="h-4 w-4" /> Schedule Training
            </Button>
            <Button
              onClick={() => updateRequestMutation.mutate({ id: selectedRequest.id, data: requestUpdate })}
              disabled={updateRequestMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {updateRequestMutation.isPending ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTraining ? 'Edit Training' : 'Create Training'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Coaster/Ride Name *</Label>
                <Input
                  value={formData.coaster_name}
                  onChange={(e) => setFormData({ ...formData, coaster_name: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., Thunder Mountain, Space Coaster"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>
              <div>
                <Label>Instructor</Label>
                <Input
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Session Date *</Label>
                <Input
                  type="date"
                  value={formData.session_date}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    session_date: e.target.value,
                    status: e.target.value && formData.status === 'upcoming' ? 'upcoming' : formData.status
                  })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Duration (hours)</Label>
                <Input
                  type="number"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <Label>Online Session</Label>
                  <p className="text-sm text-slate-500">This is a virtual training</p>
                </div>
                <Switch
                  checked={formData.is_online}
                  onCheckedChange={(v) => setFormData({ ...formData, is_online: v })}
                />
              </div>
              {formData.is_online ? (
                <div className="col-span-2">
                  <Label>Meeting Link</Label>
                  <Input
                    value={formData.meeting_link}
                    onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                    className="mt-1"
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div className="col-span-2">
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}
              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <Label>Mandatory Training</Label>
                  <p className="text-sm text-slate-500">Required for all clients</p>
                </div>
                <Switch
                  checked={formData.is_mandatory}
                  onCheckedChange={(v) => setFormData({ ...formData, is_mandatory: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.title || !formData.session_date || !formData.coaster_name}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : selectedTraining ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminOnly>
  );
}