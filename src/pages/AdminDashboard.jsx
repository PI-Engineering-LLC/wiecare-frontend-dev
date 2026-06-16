import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { 
  Building2, 
  Users, 
  FileText, 
  ShoppingCart, 
  Wrench, 
  GraduationCap, 
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from '@/components/shared/StatsCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatInTimeZone } from 'date-fns-tz';
import { useAuth } from '@/lib/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.getClients({ order: '-created_at',limit:100}),
    enabled: !!user,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => api.getInvoices({ order: '-created_at',limit:100}),
    enabled: !!user,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['admin-quotes'],
    queryFn: () => api.getQuotes({ order: '-created_at',limit:100}),
    enabled: !!user,
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ['admin-maintenance'],
    queryFn: () => api.getMaintenance({ order: '-created_at',limit:100}),
    enabled: !!user,
  });

  const { data: warrantyClaims = [] } = useQuery({
    queryKey: ['admin-warranty'],
    queryFn: () => api.getWarrantyClaims({ order: '-created_at',limit:50}),
    enabled: !!user,
  });

  const pendingQuotes = quotes.filter(q => q.status === 'pending');
  const pendingMaintenance = maintenance.filter(m => m.status === 'pending');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const pendingClaims = warrantyClaims.filter(c => c.status === 'pending');
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

  return (
    <AdminOnly>
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8a] rounded-2xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-white/80">Overview of your business operations</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Active Clients" value={clients?.filter(c => c.status === 'active').length} icon={Building2} variant="primary" />
        <StatsCard title="Pending Quotes" value={pendingQuotes.length} icon={FileText} variant={pendingQuotes.length > 0 ? 'warning' : 'default'} />
        <StatsCard title="Overdue Invoices" value={overdueInvoices.length} icon={AlertTriangle} variant={overdueInvoices.length > 0 ? 'danger' : 'success'} />
        <StatsCard title="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={TrendingUp} variant="success" />
      </div>

      {/* Action Required Section */}
      {(pendingQuotes.length > 0 || pendingMaintenance.length > 0 || pendingClaims.length > 0) && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {pendingQuotes.length > 0 && (
                <Link to={createPageUrl('AdminQuotes')} className="block">
                  <div className="p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <p className="text-2xl font-bold text-amber-700">{pendingQuotes.length}</p>
                    <p className="text-sm text-amber-600">Quotes awaiting response</p>
                  </div>
                </Link>
              )}
              {pendingMaintenance.length > 0 && (
                <Link to={createPageUrl('AdminMaintenance')} className="block">
                  <div className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <p className="text-2xl font-bold text-blue-700">{pendingMaintenance.length}</p>
                    <p className="text-sm text-blue-600">Maintenance requests pending</p>
                  </div>
                </Link>
              )}
              {pendingClaims.length > 0 && (
                <Link to={createPageUrl('AdminWarranty')} className="block">
                  <div className="p-4 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
                    <p className="text-2xl font-bold text-rose-700">{pendingClaims.length}</p>
                    <p className="text-sm text-rose-600">Warranty claims to review</p>
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Recent Quote Requests</CardTitle>
            <Link to={createPageUrl('AdminQuotes')}>
              <Button variant="ghost" size="sm" className="text-[#1e3a5f]">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No quotes yet</p>
            ) : (
              <div className="space-y-3">
                {quotes.slice(0, 5).map(quote => (
                  <div key={quote.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{quote.client_name || 'Unknown Client'}</p>
                      <p className="text-sm text-slate-500">{quote.title}</p>
                    </div>
                    <StatusBadge status={quote.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Maintenance */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Recent Maintenance Requests</CardTitle>
            <Link to={createPageUrl('AdminMaintenance')}>
              <Button variant="ghost" size="sm" className="text-[#1e3a5f]">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {maintenance.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No maintenance requests</p>
            ) : (
              <div className="space-y-3">
                {maintenance.slice(0, 5).map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{req.client_name || 'Unknown Client'}</p>
                      <p className="text-sm text-slate-500">{req.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={req.priority} />
                      <StatusBadge status={req.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Overdue Invoices</CardTitle>
            <Link to={createPageUrl('AdminInvoices')}>
              <Button variant="ghost" size="sm" className="text-[#1e3a5f]">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {overdueInvoices.length === 0 ? (
              <p className="text-emerald-600 text-center py-8">✓ No overdue invoices</p>
            ) : (
              <div className="space-y-3">
                {overdueInvoices.slice(0, 5).map(invoice => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{invoice.client_name}</p>
                      <p className="text-sm text-slate-500">Due: {invoice.due_date ? formatInTimeZone(new Date(invoice.due_date),'UTC', 'MMM d, yyyy') : 'N/A'}</p>
                    </div>
                    <p className="font-semibold text-rose-600">${invoice.balance_due?.toLocaleString() || invoice.total_amount?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Overview */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Clients by Subscription</CardTitle>
            <Link to={createPageUrl('AdminClients')}>
              <Button variant="ghost" size="sm" className="text-[#1e3a5f]">
                Manage <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['basic', 'pro_1_5', 'pro_2_0', 'advanced'].map(tier => {
                const count = clients.filter(c => c.subscription_tier === tier).length;
                const tierLabels = {
                  basic: 'Basic',
                  pro_1_5: 'Pro 1.5',
                  pro_2_0: 'Pro 2.0',
                  advanced: 'Advanced'
                };
                return (
                  <div key={tier} className="flex items-center justify-between">
                    <span className="text-slate-600 capitalize">{tierLabels[tier]}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#1e3a5f] rounded-full"
                          style={{ width: `${clients.length ? (count / clients.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </AdminOnly>
  );
}