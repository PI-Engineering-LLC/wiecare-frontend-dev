import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShoppingCart, Package, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import StatsCard from '@/components/shared/StatsCard';
import EmptyState from '@/components/shared/EmptyState';
import MasterOrderDetail from '@/components/orders/MasterOrderDetail';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/ClientContext';

export default function Orders() {
  const {user, api} = useAuth()
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

 
  const { activeClientId, switchClient } = useClient()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', activeClientId],
    queryFn: () => activeClientId
      ? api.getOrders( { client_id: activeClientId , order:'-created_at', limit: 100})
      : api.getOrders( { order:'-created_at', limit: 50 }),
    enabled: !!user,
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    // Show split orders as processing, others use their actual status
    const displayStatus = order.is_split ? 'partially_processing' : order.status;
    const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getDisplayStatus = (order) => order.is_split ? 'partially_processing' : order.status;

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const processingOrders = orders.filter(o => ['partially_processing', 'invoiced'].includes(o.status));
  const completedOrders = orders.filter(o => ['completed', 'delivered'].includes(o.status));

  const columns = [
    {
      header: 'Order #',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-900">{row.order_number || `ORD-${row.id?.slice(-6)}`}</span>
          {row.is_split && <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700">Multi-shipment</span>}
        </div>
      )
    },
    {
      header: 'Title',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.title}</p>
          {row.description && <p className="text-sm text-slate-500 truncate max-w-xs">{row.description}</p>}
        </div>
      )
    },
    { header: 'Amount', render: (row) => <span className="font-semibold">${row.total_amount?.toLocaleString() || '-'}</span> },
    { header: 'Date', render: (row) => row.created_at ? format(new Date(row.created_at + 'T00:00:00'), 'MMM d, yyyy')  : '—' },
    { header: 'Status', render: (row) => <StatusBadge status={getDisplayStatus(row)} /> },
    {
      header: 'Tracking',
      render: (row) => row.tracking_number ? <span className="text-xs font-mono text-slate-600">{row.tracking_number}</span> : <span className="text-xs text-slate-400">—</span>
    },
    {
      header: '',
      render: (row) => (
        <Button variant="ghost" size="sm" className="text-xs" onClick={(e) => { e.stopPropagation(); setSelectedOrder(row); }}>
          View Details
        </Button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" subtitle="Track your orders and deliveries" />

      <div className="grid grid-cols-3 gap-4">
        <StatsCard title="Pending" value={pendingOrders.length} icon={ShoppingCart} />
        <StatsCard title="Processing" value={processingOrders.length} icon={Package} variant="warning" />
        <StatsCard title="Completed" value={completedOrders.length} icon={CheckCircle2} variant="success" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partially_processing">Processing</SelectItem>
                <SelectItem value="partially_shipped">Partially Shipped</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {orders.length === 0 && !isLoading ? (
        <EmptyState icon={ShoppingCart} title="No orders yet" description="Your approved quotes will appear here as orders" />
      ) : (
        <DataTable columns={columns} data={filteredOrders} isLoading={isLoading} onRowClick={setSelectedOrder} />
      )}

      {/* Master Order Detail */}
      <MasterOrderDetail
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        isAdmin={false}
      />
    </div>
  );
}