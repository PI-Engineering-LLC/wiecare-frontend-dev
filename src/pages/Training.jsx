import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, GraduationCap, Calendar, MapPin, Video, Users, CheckCircle2, Clock, Plus, LayoutGrid } from 'lucide-react';
import TrainingCalendar from '@/components/training/TrainingCalendar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from '@/components/shared/PageHeader';
import StatsCard from '@/components/shared/StatsCard';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { usePrivateDocument } from '@/hooks/usePrivateDocument';
import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/ClientContext';

export default function Training() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [activeTab, setActiveTab] = useState('available');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const { handleSecureView, currentlyLoadingKey } = usePrivateDocument();
  const [trainingRequest, setTrainingRequest] = useState({
    training_type: 'operations',
    description: '',
    preferred_date_1: '',
    preferred_date_2: '',
    number_of_participants: 1
  });

  const queryClient = useQueryClient();
  const {activeClientId, switchClient} = useClient()

  const { data: trainings = [], isLoading: loadingTrainings } = useQuery({
    queryKey: ['trainings', activeClientId],
    queryFn: () => api.getTrainings({ order:'-session_date', limit: 100 }),
    enabled: !!user,
  });

  const { data: registrations = [], isLoading: loadingRegistrations } = useQuery({
    queryKey: ['registrations', user?.id, activeClientId],
    queryFn: () => user?.id 
      ? api.getRegistrations({ user_id: user.id, order:'-created_at', limit: 100 }) 
      : [],
    enabled: !!user?.id,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['training-requests', user?.id, activeClientId],
    queryFn: () => api.getTrainingRequests({ user_id: user.id, order:'-created_at', limit: 50 }) ,
    enabled: !!user?.id,
  });

  const registerMutation = useMutation({
    mutationFn: (data) => api.createRegistrations(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations']});
      setSelectedTraining(null);
      toast.success('Successfully registered for training');
    },
  });

  const cancelRegistrationMutation = useMutation({
    mutationFn: (id) => api.updateRegistrations(id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations']});
      toast.success('Registration cancelled');
    },
  });

  const requestTrainingMutation = useMutation({
    mutationFn: (data) => api.createTrainingRequests(data),
    onSuccess: () => {
      setShowRequestDialog(false);
      setTrainingRequest({
        training_type: 'operations',
        description: '',
        preferred_date_1: '',
        preferred_date_2: '',
        number_of_participants: 1
      });
      toast.success('Training request submitted successfully');
    },
  });

  const handleRegister = async (training) => {
    if (!activeClientId) {
      toast.error('Your account is not linked to a client. Please contact support.');
      return;
    }
    await registerMutation.mutateAsync({
      training_id: training.id,
      training_title: training.title,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      client_id: activeClientId,
      status: 'registered',
      registration_date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handleRequestTraining = async () => {
    if (!activeClientId) {
      toast.error('Your account is not linked to a client. Please contact support.');
      return;
    }
    await requestTrainingMutation.mutateAsync({
      ...trainingRequest,
      client_id: activeClientId ,
      user_id: user.id,
      user_name: user.full_name,
      user_email: user.email,
      status: 'pending'
    });
  };

  const registeredTrainingIds = registrations
    .filter(r => r.status === 'registered' || r.status === 'attended')
    .map(r => r.training_id);

  const upcomingTrainings = trainings.filter(t => 
    t.status === 'upcoming' && 
    new Date(t.session_date) >= new Date()
  );

  const myUpcoming = registrations.filter(r => 
    (r.status === 'registered' || r.status === 'attended') &&
    trainings.find(t => t.id === r.training_id)?.status === 'upcoming'
  );

  const myCompleted = registrations.filter(r => 
    r.status === 'completed' || r.status === 'attended'
  );

  const filteredTrainings = upcomingTrainings.filter(training => {
    const matchesSearch = training.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || training.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['safety', 'operations', 'maintenance', 'business', 'technical', 'certification'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Sessions"
        subtitle="Browse and register for training sessions"
        actions={
          <Button 
            onClick={() => setShowRequestDialog(true)}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Training
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Available Sessions" value={upcomingTrainings.length} icon={GraduationCap} />
        <StatsCard title="Registered" value={myUpcoming.length} icon={Calendar} variant="primary" />
        <StatsCard title="Completed" value={myCompleted.length} icon={CheckCircle2} variant="success" />
        <StatsCard 
          title="Upcoming" 
          value={myUpcoming.length} 
          icon={Clock} 
          variant="warning" 
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="available">Available Training</TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="registered">My Registrations</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          {/* Filters */}
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search training sessions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Training Cards */}
          {filteredTrainings.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No training sessions available"
              description="Check back later for upcoming training sessions"
            />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTrainings.map(training => {
                const isRegistered = registeredTrainingIds.includes(training.id);
                const isFull = training.max_participants && 
                  (training.current_registrations || 0) >= training.max_participants;
                
                return (
                  <Card key={training.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className="capitalize">
                          {training.category}
                        </Badge>
                        {training.is_mandatory && (
                          <Badge variant="destructive">Mandatory</Badge>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-lg text-slate-900 mb-1">{training.title}</h3>
                      {training.coaster_name && (
                        <p className="text-sm font-medium text-blue-600 mb-2">{training.coaster_name}</p>
                      )}
                      
                      {training.description && (
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{training.description}</p>
                      )}
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(training.session_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        {training.start_time && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Clock className="h-4 w-4" />
                            <span>{training.start_time} - {training.end_time || 'TBD'}</span>
                          </div>
                        )}
                        {training.is_online ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Video className="h-4 w-4" />
                            <span>Online Session</span>
                          </div>
                        ) : training.location && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="h-4 w-4" />
                            <span>{training.location}</span>
                          </div>
                        )}
                        {training.max_participants && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Users className="h-4 w-4" />
                            <span>{training.current_registrations || 0} / {training.max_participants} spots</span>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        className={`w-full ${
                          isRegistered 
                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                            : 'bg-[#1e3a5f] hover:bg-[#2d5a8a]'
                        }`}
                        disabled={isRegistered || isFull}
                        onClick={() => setSelectedTraining(training)}
                      >
                        {isRegistered ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Registered
                          </>
                        ) : isFull ? (
                          'Session Full'
                        ) : (
                          'Register'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <TrainingCalendar
            trainings={upcomingTrainings}
            registeredTrainingIds={registeredTrainingIds}
            onSelectTraining={setSelectedTraining}
          />
        </TabsContent>

        <TabsContent value="registered" className="mt-6">
          {myUpcoming.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming registrations"
              description="Browse available training sessions to register"
            />
          ) : (
            <div className="space-y-4">
              {myUpcoming.map(reg => {
                const training = trainings.find(t => t.id === reg.training_id);
                return (
                  <Card key={reg.id} className="border-0 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-[#1e3a5f]" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{reg.training_title}</p>
                          <p className="text-sm text-slate-500">
                            {training?.session_date 
                              ? format(new Date(training.session_date + 'T00:00:00'), 'MMM d, yyyy')
                              : 'Date TBD'}
                            {training?.start_time && ` at ${training.start_time}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={reg.status} />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() => cancelRegistrationMutation.mutate(reg.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {myCompleted.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No completed training"
              description="Your completed training sessions will appear here"
            />
          ) : (
            <div className="space-y-4">
              {myCompleted.map(reg => (
                <Card key={reg.id} className="border-0 shadow-sm">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{reg.training_title}</p>
                        <p className="text-sm text-slate-500">
                          Completed on {reg.completion_date 
                            ? format(new Date(reg.completion_date + 'T00:00:00'), 'MMM d, yyyy')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {reg.certificate_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={reg.certificate_storage_key}
                          onClick={(e) => {
                            try {
                              handleSecureView(e, reg.certificate_storage_key)
                            } catch (error) {
                              if (error.message === "FILE_MISSING_IN_STORAGE") {
                                toast.error('File Not Found');
                              } else {
                                toast.error('Failed to download, please try again');
                              }
                            }

                          }

                          }>
                          {currentlyLoadingKey === reg.certificate_storage_key? 'Authorizing Access...' : 'View Certificate'} 
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-requests" className="mt-6">
          {myRequests.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No training requests"
              description="Submit a training request using the button above"
              action={() => setShowRequestDialog(true)}
              actionLabel="Request Training"
            />
          ) : (
            <div className="space-y-4">
              {myRequests.map(req => (
                <Card key={req.id} className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="h-5 w-5 text-[#1e3a5f]" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 capitalize">{req.training_type?.replace(/_/g, ' ')} Training</p>
                          <p className="text-sm text-slate-500 mt-0.5">
                          {req.number_of_participants} participant{req.number_of_participants !== 1 ? 's' : ''} · Submitted {format(new Date(req.created_at), 'MMM d, yyyy')}                          </p>
                          {req.preferred_date_1 && (
                            <p className="text-sm text-slate-400 mt-0.5">
                            Preferred: {format(new Date(req.preferred_date_1 + 'T00:00:00'), 'MMM d, yyyy')}
                            {req.preferred_date_2 && ` or ${format(new Date(req.preferred_date_2 + 'T00:00:00'), 'MMM d, yyyy')}`}
                          </p>
                          )}
                          {req.description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{req.description}</p>
                          )}
                          {req.admin_notes && (
                            <p className="text-sm text-blue-600 mt-1 italic">Admin: {req.admin_notes}</p>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Registration Confirmation Dialog */}
      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Registration</DialogTitle>
          </DialogHeader>
          {selectedTraining && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-lg">{selectedTraining.title}</h3>
                {selectedTraining.coaster_name && (
                  <p className="text-sm font-medium text-blue-600 mt-1">{selectedTraining.coaster_name}</p>
                )}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span>{format(new Date(selectedTraining.session_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  {selectedTraining.start_time && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>{selectedTraining.start_time} - {selectedTraining.end_time || 'TBD'}</span>
                    </div>
                  )}
                  {selectedTraining.is_online ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="h-4 w-4 text-slate-400" />
                      <span>Online Session</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{selectedTraining.location || 'Location TBD'}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-500">
                You will receive a confirmation email with further details about the training session.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTraining(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleRegister(selectedTraining)}
              disabled={registerMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {registerMutation.isPending ? 'Registering...' : 'Confirm Registration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Training Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Training</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Training Type</Label>
              <Select 
                value={trainingRequest.training_type} 
                onValueChange={(value) => setTrainingRequest({...trainingRequest, training_type: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">Operations Training</SelectItem>
                  <SelectItem value="maintenance">Maintenance Training</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe your training needs..."
                value={trainingRequest.description}
                onChange={(e) => setTrainingRequest({...trainingRequest, description: e.target.value})}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label>Number of Participants</Label>
              <Input
                type="number"
                min="1"
                defaultValue={1}
                value={trainingRequest.number_of_participants}
                onChange={(e) => setTrainingRequest({...trainingRequest, number_of_participants: e.target.value === '' ? '' : parseInt(e.target.value) || 1})}
                // onChange={(e) => setTrainingRequest({ ...trainingRequest, number_of_participants: parseInt(e.target.value) || 1 })}
                onBlur={(e) => {
                  if (e.target.value === "" || Number(e.target.value) < 1) {
                    e.target.value = "1";
                  }
                }}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Preferred Date 1</Label>
              <Input
                type="date"
                value={trainingRequest.preferred_date_1}
                onChange={(e) => setTrainingRequest({...trainingRequest, preferred_date_1: e.target.value})}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Preferred Date 2 (Optional)</Label>
              <Input
                type="date"
                value={trainingRequest.preferred_date_2}
                onChange={(e) => setTrainingRequest({...trainingRequest, preferred_date_2: e.target.value})}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestTraining}
              disabled={!trainingRequest.training_type || !trainingRequest.preferred_date_1 || !(parseInt(trainingRequest.number_of_participants) >= 1) || requestTrainingMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {requestTrainingMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}