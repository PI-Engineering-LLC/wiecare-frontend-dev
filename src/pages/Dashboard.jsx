import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  ShoppingCart,
  Wrench,
  GraduationCap,
  BookOpen,
  AlertCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Plus,
  FileBox
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StatsCard from '@/components/shared/StatsCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/ClientContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { activeClientId } = useClient();

  // Queries are already correctly structured to use activeClientId if present
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', activeClientId],
    queryFn: () => activeClientId
      ? api.getInvoices({ client_id: activeClientId , order:'-created_at', limit: 50 })
      : api.getInvoices({  order:'-created_at', limit: 50 }),
    enabled: !!user,
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['orders', activeClientId],
    queryFn: () => activeClientId
      ? api.getOrders({ client_id: activeClientId , order:'-created_at', limit: 50 })
      : api.getOrders({ order:'-created_at', limit: 50 }),
    enabled: !!user,
  });

  const { data: maintenance = [], isLoading: loadingMaintenance } = useQuery({
    queryKey: ['maintenance', activeClientId],
    queryFn: () => activeClientId
      ? api.getMaintenance({ client_id: activeClientId , order:'-created_at', limit: 50 })
      : api.getMaintenance({  order:'-created_at', limit: 50 }),
    enabled: !!user,
  });

  const { data: trainings = [], isLoading: loadingTrainings } = useQuery({
    queryKey: ['trainings'], // Assuming this endpoint does not need activeClientId or filters by user's context
    queryFn: () => api.getTrainings({ status: 'upcoming' , order:'-session_date', limit: 10 }),
    enabled: !!user,
  });

  const { data: courseProgress = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['courseProgress', user?.id],
    queryFn: () => user?.id
      ? api.getAllCourseProgress({ user_id: user.id , order:'-last_watched_at', limit: 5 })
      : [],
    enabled: !!user?.id,
  });

  const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const totalDue = pendingInvoices.reduce((sum, i) => sum + (i.balance_due || i.total_amount || 0), 0);

  const pendingMaintenance = maintenance.filter(m => m.status === 'pending');
  const scheduledMaintenance = maintenance.filter(m => m.status === 'scheduled');

  const quickActions = [
    { label: 'Request Quote', icon: FileText, page: 'Quotes', action: 'new' },
    { label: 'Schedule Maintenance', icon: Wrench, page: 'Maintenance', action: 'new' },
    { label: 'Book Training', icon: GraduationCap, page: 'Training' },
    { label: 'View Documents', icon: FileBox, page: 'Documents' },
  ];

  const isLoading = loadingInvoices || loadingOrders || loadingMaintenance;

  return (
    <div className="space-y-4 px-0">
      {/* Stats Grid — 2 cols on mobile, 4 on lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Pending Invoices"
          value={isLoading ? '...' : pendingInvoices.length}
          icon={FileText}
          variant={overdueInvoices.length > 0 ? 'danger' : 'default'}
        />
        <StatsCard
          title="Total Orders"
          value={isLoading ? '...' : orders.length}
          icon={ShoppingCart}
        />
        <StatsCard
          title="Maintenance"
          value={isLoading ? '...' : maintenance.length}
          icon={Wrench}
          variant={pendingMaintenance.length > 0 ? 'warning' : 'default'}
        />
        <StatsCard
          title="Amount Due"
          value={isLoading ? '...' : `$${totalDue.toLocaleString()}`}
          icon={AlertCircle}
          variant={overdueInvoices.length > 0 ? 'danger' : 'primary'}
        />
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={createPageUrl(action.page) + (action.action ? `?action=${action.action}` : '')}
              >
                <div className="min-h-[44px] flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border border-slate-200 hover:bg-[#edf0be] hover:border-[#005f27] hover:text-[#005f27] transition-all cursor-pointer text-slate-700">
                  <action.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
            <Link to={createPageUrl('Invoices')}>
              <Button variant="ghost" size="sm" className="text-[#005f27] h-9 px-2">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loadingInvoices ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No invoices yet</p>
            ) : (
              <div className="space-y-2">
                {invoices.slice(0, 5).map(invoice => (
                  <div
                    key={invoice.id}
                    className="flex flex-col p-3 bg-slate-50 rounded-lg gap-1 min-h-[44px]"
                  >
                    <p className="font-medium text-slate-900 text-sm truncate">{invoice.invoice_number || invoice.title}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {invoice.due_date ? format(new Date(invoice.due_date), 'MMM d, yyyy') : 'No due date'}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="font-semibold text-slate-900 text-xs">${invoice.total_amount?.toLocaleString()}</p>
                        <StatusBadge status={invoice.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Training */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">Upcoming Training</CardTitle>
            <Link to={createPageUrl('Training')}>
              <Button variant="ghost" size="sm" className="text-[#005f27] h-9 px-2">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loadingTrainings ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : trainings.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No upcoming training sessions</p>
            ) : (
              <div className="space-y-2">
                {trainings.slice(0, 5).map(training => (
                  <div
                    key={training.id}
                    className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg min-h-[44px]"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-[#005f27]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-4 w-4 text-[#005f27]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{training.title}</p>
                        <p className="text-xs text-slate-500">
                          {training.session_date ? format(new Date(training.session_date), 'MMM d, yyyy') : ''}
                          {training.start_time && ` at ${training.start_time}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusBadge status={training.is_mandatory ? 'mandatory' : training.category} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">Maintenance Requests</CardTitle>
            <Link to={createPageUrl('Maintenance')}>
              <Button variant="ghost" size="sm" className="text-[#005f27] h-9 px-2">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 bg-[#edf0be] rounded-lg">
                <p className="text-xl font-bold text-[#005f27]">{pendingMaintenance.length}</p>
                <p className="text-xs text-[#436a36]">Pending</p>
              </div>
              <div className="text-center p-2 bg-[#4f7790]/10 rounded-lg">
                <p className="text-xl font-bold text-[#4f7790]">{scheduledMaintenance.length}</p>
                <p className="text-xs text-[#4f7790]">Scheduled</p>
              </div>
              <div className="text-center p-2 bg-[#005f27]/10 rounded-lg">
                <p className="text-xl font-bold text-[#005f27]">
                  {maintenance.filter(m => m.status === 'completed').length}
                </p>
                <p className="text-xs text-[#436a36]">Completed</p>
              </div>
            </div>
            {maintenance.slice(0, 3).map(req => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-2 p-3 border-b last:border-0 min-h-[44px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 text-sm truncate">{req.title}</p>
                  <p className="text-xs text-slate-500 capitalize truncate">{req.maintenance_type?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex-shrink-0">
                  <StatusBadge status={req.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Continue Learning */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-base font-semibold">Continue Learning</CardTitle>
            <Link to={createPageUrl('Courses')}>
              <Button variant="ghost" size="sm" className="text-[#005f27] h-9 px-2">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loadingCourses ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : courseProgress.length === 0 ? (
              <div className="text-center py-6">
                <BookOpen className="h-9 w-9 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Start learning at Wie-University</p>
                <Link to={createPageUrl('Courses')}>
                  <Button className="mt-3 h-11 bg-[#005f27] hover:bg-[#436a36]">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {courseProgress.map(progress => (
                  <div
                    key={progress.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg min-h-[44px]"
                  >
                    <div className="w-9 h-9 bg-[#005f27]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="h-4 w-4 text-[#005f27]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{progress.course_title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#005f27] rounded-full transition-all"
                            style={{ width: `${progress.progress_percent || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{progress.progress_percent || 0}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}