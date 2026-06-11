import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Search, ShoppingCart, Package, Scissors } from 'lucide-react';
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
import SplitOrderDialog from '@/components/orders/SplitOrderDialog';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const queryClient = useQueryClient();

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => api.getOrders({ order: '-created_date', limit: 200}),
  });

  const { data: partOrders = [], isLoading: loadingPartOrders } = useQuery({
    queryKey: ['admin-part-orders'],
    queryFn: () => api.getPartOrders({ order: '-created_date', limit: 200}),
  });

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const masterOrders = orders;
  const allOrders = [
    ...masterOrders.map(o => ({ ...o, _type: 'order' })),
    ...partOrders.map(o => ({ ...o, _type: 'part_order' }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const filteredOrders = allOrders.filter(order => {
    const matchesSearch = order.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = allOrders.filter(o => o.status === 'pending').length;
  const processingCount = allOrders.filter(o => ['partially_processing', 'invoiced'].includes(o.status)).length;
  const completedCount = allOrders.filter(o => ['completed', 'delivered'].includes(o.status)).length;

  const columns = [
    {
      header: 'Order #',
      render: (row) => (
        <div>
          <span className="font-medium">{row.order_number || `ORD-${row.id?.slice(-6)}`}</span>
          <div className="flex gap-1 mt-0.5">
            <span className={`px-1.5 py-0.5 text-xs rounded ${row._type === 'part_order' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
              {row._type === 'part_order' ? 'Parts' : 'Order'}
            </span>
            {row.is_split && (
              <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700">Split</span>
            )}
          </div>
        </div>
      )
    },
    { header: 'Client', render: (row) => <span className="font-medium">{row.client_name || '-'}</span> },
    { header: 'Amount', render: (row) => <span className="font-semibold">${row.total_amount?.toLocaleString() || '0'}</span> },
    { header: 'Date', render: (row) => row.created_date ? format(new Date(row.created_date), 'MMM d, yyyy') : '—' },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={(e) => { e.stopPropagation(); handleViewOrder(row); }}>
            View
          </Button>
          {row._type === 'order' && !row.is_split && row.items?.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-[#1e3a5f]"
              onClick={(e) => { e.stopPropagation(); setSelectedOrder(row); setShowSplit(true); }}
            >
              <Scissors className="h-3.5 w-3.5" /> Split
            </Button>
          )}
        </div>
      )
    },
  ];

  return (
    <AdminOnly>
    <div className="space-y-6">
      <PageHeader title="Orders" subtitle="Manage all orders and parts orders" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Pending" value={pendingCount} icon={Package} variant="warning" />
        <StatsCard title="Processing" value={processingCount} icon={Package} variant="primary" />
        <StatsCard title="Completed" value={completedCount} icon={Package} variant="success" />
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
                <SelectItem value="partially_processing">Partially Processing</SelectItem>
                <SelectItem value="partially_shipped">Partially Shipped</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {allOrders.length === 0 && !loadingOrders && !loadingPartOrders ? (
        <EmptyState icon={ShoppingCart} title="No orders yet" description="Orders will appear here when clients approve quotes" />
      ) : (
        <DataTable columns={columns} data={filteredOrders} isLoading={loadingOrders || loadingPartOrders} onRowClick={(row) => handleViewOrder(row)} />
      )}

      {/* Master Order Detail Dialog */}
      {selectedOrder && selectedOrder._type === 'order' && (
        <MasterOrderDetail
          order={selectedOrder}
          open={showDetail}
          onClose={() => { setShowDetail(false); setSelectedOrder(null); }}
          isAdmin={true}
          onSplitClick={() => { setShowDetail(false); setShowSplit(true); }}
        />
      )}

      {/* Split Dialog */}
      {selectedOrder && selectedOrder._type === 'order' && (
        <SplitOrderDialog
          order={selectedOrder}
          open={showSplit}
          onClose={() => { setShowSplit(false); setSelectedOrder(null); }}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-orders']})}
        />
      )}
    </div>
    </AdminOnly>
  );
}