import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Edit2, FileText, Send, Trash2, Eye, X } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import LineItemsTable from '@/components/shared/LineItemsTable';
import { toast } from 'sonner';
import { PublicImage } from '@/components/PublicImage';
import { useLocation, useNavigate } from 'react-router-dom';

const EMPTY_ITEM = { item_number: '', z_number: '', description: '', quantity: 1, unit_price: 0, total: 0 };

const DEFAULT_FORM = {
  client_id: '',
  sending_entity: '',
  title: '',
  description: '',
  items: [{ ...EMPTY_ITEM }],
  packing: 0,
  export_declaration: 0,
  discount_percent: 0,
  tax_rate: 19,
  valid_until: '',
  notes: '',
  status: 'draft'
};

export default function AdminQuotes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('quotes');
  const [showDialog, setShowDialog] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [highlightQuoteId, setHighlightQuoteId] = useState(null);
  const [viewingRequest, setViewingRequest] = useState(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get('quote_id');
    if (quoteId) setHighlightQuoteId(quoteId);

    // Auto-open new quote dialog pre-filled from a maintenance/training request
    const maintenanceRequestId = params.get('maintenance_request_id');
    const trainingRequestId = params.get('training_request_id');
    const clientId = params.get('client_id');
    const title = params.get('title');
    if (maintenanceRequestId || trainingRequestId) {
      setFormData(prev => ({
        ...DEFAULT_FORM,
        client_id: clientId || '',
        title: title ? decodeURIComponent(title) : '',
        maintenance_request_id: maintenanceRequestId || undefined,
        training_request_id: trainingRequestId || undefined,
      }));
      setShowDialog(true);
    }
  }, []);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['admin-quotes'],
    queryFn: () => api.getQuotes({order: '-created_at', limit: 200}),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients({order: '-created_at', limit: 200}),
  });
  

  // Auto-open quote from notification link
  useEffect(() => {
    if (highlightQuoteId && quotes.length > 0) {
      const quote = quotes.find(q => q.id === highlightQuoteId);
      if (quote) handleEdit(quote);
    }
  }, [highlightQuoteId, quotes]);

  const createMutation = useMutation({
    mutationFn: (data) => api.createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes']});
      setShowDialog(false);
      setViewingRequest(null)
      resetForm();
      if (location.search) {
        navigate(location.pathname, { replace: true });
      }
      toast.success('Quote created successfully');
    },onError: () => {
      toast.success('Error creating quote.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateQuote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes']});
      setShowDialog(false);
      setViewingRequest(null)
      resetForm();
      if (location.search) {
        navigate(location.pathname, { replace: true });
      }
      toast.success('Quote updated successfully');
    },
    onError: () => {
      toast.success('Error updating quote.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes']});
      toast.success('Quote deleted');
    },
  });

  const resetForm = () => {
    setFormData({ ...DEFAULT_FORM, items: [{ ...EMPTY_ITEM }] });
    setSelectedQuote(null);
    setShowDiscount(false);
  };

  const handleEdit = (quote) => {
    setSelectedQuote(quote);
    const discountPercent = quote.discount_percent || 0;
    setFormData({
      client_id: quote.client_id || '',
      sending_entity: quote.sending_entity || '',
      title: quote.title || '',
      description: quote.description || '',
      items: quote.items?.length > 0 ? quote.items : [{ ...EMPTY_ITEM }],
      packing: quote.packing || 0,
      export_declaration: quote.export_declaration || 0,
      discount_percent: discountPercent,
      tax_rate: quote.tax_rate ?? 19,
      valid_until: quote.valid_until || '',
      notes: quote.notes || '',
      status: quote.status || 'draft'
    });
    setShowDiscount(discountPercent > 0);
    setShowDialog(true);
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const packing = parseFloat(formData.packing) || 0;
    const exportDecl = parseFloat(formData.export_declaration) || 0;
    const rawDiscountAmount = showDiscount ? subtotal * ((parseFloat(formData.discount_percent) || 0) / 100) : 0;
    const discountAmount = Math.round(rawDiscountAmount * 100) / 100
    const taxableBase = subtotal - discountAmount;
    const rawTaxAmount = taxableBase * ((formData.tax_rate || 0) / 100);
    const taxAmount = Math.round(rawTaxAmount * 100) / 100
    const total = taxableBase + packing + exportDecl + taxAmount;
    return { subtotal, packing, exportDecl, discountAmount, taxAmount, total };
  };

  const handleSubmit = async (overrideStatus) => {
    const client = clients.find(c => c.id === formData.client_id);
    const { subtotal, packing, exportDecl, discountAmount, taxAmount, total } = calculateTotals();
    const isClientRequest = selectedQuote && (selectedQuote.status === 'pending' || selectedQuote.status === 'assigned') && !selectedQuote.sending_entity;

    const quoteData = {
      ...formData,
      status: overrideStatus ?? formData.status,
      client_name: client?.company_name || '',
      subtotal,
      packing,
      export_declaration: exportDecl,
      discount_percent: showDiscount ? (parseFloat(formData.discount_percent) || 0) : 0,
      tax_amount: taxAmount,
      total_amount: total,
      currency: 'USD',
      quote_number: (!selectedQuote || isClientRequest) ? `Q-${Date.now()}` : (selectedQuote.quote_number || `Q-${Date.now()}`)
    };

    if (selectedQuote && !isClientRequest) {
      const updatedQuote = await updateMutation.mutateAsync({ id: selectedQuote.id, data: quoteData });
      // If sending/updating to client (status = sent), notify them
      if ((overrideStatus || formData.status) === 'sent') {
      }
    } else {
      const newQuote = await createMutation.mutateAsync(quoteData);

      if (isClientRequest) {
        // Mark the client's original request as resolved
        await  updateMutation.mutateAsync({ id: selectedQuote.id, data:{ status: 'converted', converted_to_order_id: newQuote.id }});
      }
    }
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
  };

  const handleSend = async (quote) => {
    await updateMutation.mutateAsync({ id: quote.id, data: { status: 'sent' } });

    // Find client's contact email just to show correct toast
    const client = clients.find(c => c.id === quote.client_id);
    const recipientEmail = client?.contact_email;

    toast.success('Quote sent to client' + (recipientEmail ? ' and email notification sent' : ''));
  };

  // Admin quotes: have a sending_entity set
  const adminQuotesFiltered = quotes
    .filter(q => !!q.sending_entity)
    .filter(quote => {
      const matchesSearch = quote.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           quote.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

  // Pre-fill form from a client's pending request to create a quote response
  const handleCreateFromRequest = async (row) => {
    // Mark client request as "assigned" immediately
    await updateMutation.mutateAsync({id: row.id,data: { status: 'assigned' }});
    queryClient.invalidateQueries({ queryKey: ['admin-quotes']});

    setSelectedQuote(row);
    setFormData({
      client_id: row.client_id || '',
      sending_entity: row.sending_entity || '',
      title: row.title || '',
      description: row.description || '',
      items: row.items?.length > 0 ? row.items : [{ ...EMPTY_ITEM }],
      packing: row.packing || 0,
      export_declaration: row.export_declaration || 0,
      discount_percent: 0,
      tax_rate: 19,
      valid_until: row.valid_until || '',
      notes: row.notes || '',
      status: 'draft'
    });
    setShowDiscount(false);
    setShowDialog(true);
  };
  const handleDeleteQuoteItemByIndex = (indexToDelete, error) => { 
    if (error.status === 404) {
    setSelectedQuote((prevQuote) => ({ ...prevQuote, items: prevQuote.items.filter((_, i) => i !== indexToDelete) })); 
  }
  };
  const handleDeleteRequestItemByIndex = (indexToDelete, error) => { 
    if (error.status === 404) {
    setViewingRequest((prevQuote) => ({ ...prevQuote, items: prevQuote.items.filter((_, i) => i !== indexToDelete) })); 
  }
  };

  const adminColumns = [
    {
      header: 'Quote #',
      render: (row) => <span className="font-medium">{row.quote_number || `Q-${row.id?.slice(-6)}`}</span>
    },
    {
      header: 'From',
      render: (row) => <span className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">{row.sending_entity || 'Admin Quote'}</span>
    },
    {
      header: 'Client',
      render: (row) => <span className="font-medium">{row.client_name || '-'}</span>
    },
    {
      header: 'Title',
      render: (row) => <span className="truncate max-w-xs block">{row.title}</span>
    },
    {
      header: 'Amount',
      render: (row) => <span className="font-semibold">{row.total_amount ? `$${row.total_amount}` : '—'}</span>
    },
    {
      header: 'Status',
      render: (row) => (
        <Select value={row.status} onValueChange={(newStatus) => updateMutation.mutate({ id: row.id, data: { status: newStatus } })}>
          <SelectTrigger className="w-32" onClick={(e) => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          {row.status === 'draft' && (
            <Button variant="ghost" size="icon" title="Send Quote to Client" onClick={(e) => { e.stopPropagation(); handleSend(row); }}>
              <Send className="h-4 w-4 text-blue-600" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(row.id); }}>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      )
    },
  ];

  const requestColumns = [
    {
      header: 'Client',
      render: (row) => <span className="font-medium">{row.client_name || '-'}</span>
    },
    {
      header: 'Title',
      render: (row) => <span className="truncate max-w-xs block">{row.title}</span>
    },
    {
      header: 'Requested',
      render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'
    },
    {
      header: 'Status',
      render: (row) => row.status === 'assigned'
        ? <span className="inline-flex items-center text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Assigned</span>
        : <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Pending</span>
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="View Request" onClick={(e) => { e.stopPropagation(); setViewingRequest(row); }}>
            <Eye className="h-4 w-4 text-slate-500" />
          </Button>
          {row.status === 'pending' && (
            <Button
              size="sm"
              className="bg-[#005f27] hover:bg-[#436a36] text-white text-xs gap-1 h-8 px-3"
              onClick={(e) => { e.stopPropagation(); handleCreateFromRequest(row); }}
            >
              <Plus className="h-3.5 w-3.5" /> Create Quote
            </Button>
          )}
          {row.status === 'assigned' && (
            <Button
              size="sm"
              variant="outline"
              className="text-[#005f27] border-[#005f27] hover:bg-[#edf0be] text-xs gap-1 h-8 px-3"
              onClick={(e) => { e.stopPropagation(); handleCreateFromRequest(row); }}
            >
              <Edit2 className="h-3.5 w-3.5" /> Continue
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(row.id); }}>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      )
    },
  ];

  const { subtotal, packing, exportDecl, discountAmount, taxAmount, total } = calculateTotals();

  return (
    <AdminOnly>
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        subtitle="Create and manage quotes"
        actions={
          <Button
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Quote
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="quotes">
            Admin Quotes
            {quotes.filter(q => q.sending_entity || (q.status !== 'pending' && q.status !== 'assigned' && !q.sending_entity === false)).length > 0 && null}
          </TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Client Requests
            {quotes.filter(q => !q.sending_entity && (q.status === 'pending' || q.status === 'assigned')).length > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                {quotes.filter(q => !q.sending_entity && q.status === 'pending').length || ''}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── ADMIN QUOTES TAB ── */}
        <TabsContent value="quotes" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search quotes..."
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
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          {adminQuotesFiltered.length === 0 && !isLoading ? (
            <EmptyState
              icon={FileText}
              title="No quotes yet"
              description="Create your first quote"
              action={() => { resetForm(); setShowDialog(true); }}
              actionLabel="Create Quote"
            />
          ) : (
            <DataTable columns={adminColumns} data={adminQuotesFiltered} isLoading={isLoading} />
          )}
        </TabsContent>

        {/* ── CLIENT REQUESTS TAB ── */}
        <TabsContent value="requests" className="space-y-4">
          {quotes.filter(q => !q.sending_entity && (q.status === 'pending' || q.status === 'assigned')).length === 0 && !isLoading ? (
            <EmptyState
              icon={FileText}
              title="No client requests"
              description="Client quote requests will appear here"
            />
          ) : (
            <DataTable columns={requestColumns} data={quotes.filter(q => !q.sending_entity && (q.status === 'pending' || q.status === 'assigned'))} isLoading={isLoading} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) {resetForm(); setShowDialog(open);setHighlightQuoteId(null);
        if (location.search) {
          navigate(location.pathname, { replace: true });
        }}
       }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuote ? 'Edit Quote' : 'Create Quote'}</DialogTitle>
            {selectedQuote?.quote_number && (
              <p className="text-sm text-slate-500 font-mono mt-1">Document #: {selectedQuote.quote_number}</p>
            )}
          </DialogHeader>
          <div className="space-y-5 py-4">

            {/* Client request context - shown when editing a client-submitted pending quote */}
            {selectedQuote && (selectedQuote.status === 'pending' || selectedQuote.status === 'assigned') && !selectedQuote.sending_entity && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Client's Original Request</p>
                {selectedQuote.description && (
                  <p className="text-sm text-amber-900 whitespace-pre-line">{selectedQuote.description}</p>
                )}
                {/* Show item photos if client attached any */}
                {selectedQuote.items?.some(item => item.photo_storage_key) && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Attached Photos</p>
                    <div className="flex flex-wrap gap-3">
                      {selectedQuote.items.map((item, idx) => item.photo_storage_key ? (
                        <div key={idx} className="flex flex-col items-center gap-1">
                          {/* <a href={item.photo_storage_key} target="_blank" rel="noopener noreferrer"> */}
                            <PublicImage
                              docKey={item.photo_storage_key}
                              alt={`Item ${idx + 1} photo`}
                              className="h-20 w-20 rounded-lg object-cover border-2 border-amber-300 hover:border-amber-500 transition-colors cursor-pointer"
                              isLink={true}
                              onError={(err) => {
                                handleDeleteQuoteItemByIndex(idx,err)
                              }
                              }
                            />
                          {/* </a> */}
                          <span className="text-[10px] text-amber-700">
                            {item.ez_number ? `EZ# ${item.ez_number}` : item.description ? item.description.slice(0, 15) : `Item ${idx + 1}`}
                          </span>
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes / modifications from client */}
            {selectedQuote?.notes && selectedQuote.notes.includes('Client Modification Request') && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide mb-1">Client Modification Requests</p>
                <p className="text-sm text-rose-900 whitespace-pre-line">{selectedQuote.notes}</p>
              </div>
            )}

            {/* Top fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sending Entity *</Label>
                <Select value={formData.sending_entity} onValueChange={(v) => setFormData({ ...formData, sending_entity: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Wiegand Sports Gmbh">Wiegand Sports</SelectItem>
                    <SelectItem value="Wiegand Services LLC">Wiegand Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valid Until *</Label>
                <Input
                  type="date"
                  value={formData.valid_until?.split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1"
                />
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
            </div>

            {/* Line Items */}
            <LineItemsTable
              items={formData.items}
              onChange={(newItems) => setFormData({ ...formData, items: newItems })}
              showUnit={false}
              showLineType={!!(formData.maintenance_request_id || formData.training_request_id)}
            />

            {/* Totals */}
            <div className="border-t pt-4 space-y-3 max-w-xs ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>

              {/* Discount */}
              {showDiscount ? (
                <div className="flex justify-between items-center text-sm gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 whitespace-nowrap">Discount</span>
                    <Input
                      type="number"
                      className="w-16 h-7"
                      value={formData.discount_percent}
                      onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="text-slate-600">%</span>
                  </div>
                  <span className="text-rose-600">-${discountAmount.toFixed(2)}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDiscount(true)}
                  className="text-xs text-[#1e3a5f] underline underline-offset-2 hover:text-[#2d5a8a]"
                >
                  + Add Discount
                </button>
              )}

              <div className="flex justify-between items-center text-sm gap-4">
                <span className="text-slate-600 whitespace-nowrap">Packing ($)</span>
                <Input
                  type="number"
                  className="w-28 h-7 text-right"
                  value={formData.packing}
                  onChange={(e) => setFormData({ ...formData, packing: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex justify-between items-center text-sm gap-4">
                <span className="text-slate-600 whitespace-nowrap">Export Declaration ($)</span>
                <Input
                  type="number"
                  className="w-28 h-7 text-right"
                  value={formData.export_declaration}
                  onChange={(e) => setFormData({ ...formData, export_declaration: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex justify-between items-center text-sm gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600">Tax</span>
                  <Input
                    type="number"
                    className="w-16 h-7"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="text-slate-600">%</span>
                </div>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>Cancel</Button>
            {/* Save as draft — not applicable when responding to a client request */}
            {!(selectedQuote && (selectedQuote.status === 'pending' || selectedQuote.status === 'assigned') && !selectedQuote.sending_entity) && (
              <Button
                variant="outline"
                onClick={() => handleSubmit('draft')}
                disabled={!formData.client_id || !formData.title || createMutation.isPending || updateMutation.isPending}
              >
                Save as Draft
              </Button>
            )}
            <Button
              onClick={() => handleSubmit('sent')}
              disabled={!formData.client_id || !formData.title ||!formData.sending_entity || 
                ( isNaN(new Date(formData?.valid_until).getTime())) || createMutation.isPending || updateMutation.isPending}
              className="bg-[#005f27] hover:bg-[#436a36]"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
                (selectedQuote && (selectedQuote.status === 'pending' || selectedQuote.status === 'assigned') && !selectedQuote.sending_entity)
                  ? 'Create & Send to Client'
                  : selectedQuote
                    ? 'Update & Send'
                    : 'Create & Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Client Request Dialog */}
      <Dialog open={!!viewingRequest} onOpenChange={() => setViewingRequest(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Quote Request</DialogTitle>
          </DialogHeader>
          {viewingRequest && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Client</p>
                  <p className="font-semibold text-slate-800">{viewingRequest.client_name || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Submitted</p>
                  <p className="text-sm">{viewingRequest.created_at ? new Date(viewingRequest.created_at).toLocaleDateString() : '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Title</p>
                <p className="font-medium text-slate-900">{viewingRequest.title}</p>
              </div>

              {viewingRequest.description && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-3">{viewingRequest.description}</p>
                </div>
              )}

              {viewingRequest.items?.length > 0 && viewingRequest.items.some(i => i.ez_number || i.item_number || i.description) && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Requested Items</p>
                  <div className="space-y-2">
                    {viewingRequest.items.filter(i => i.ez_number || i.item_number || i.description).map((item, idx) => (
                      <div key={idx} className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm">
                        <div className="flex flex-wrap gap-3 text-xs text-amber-700 mb-1">
                          {item.ez_number && <span>EZ# <strong>{item.ez_number}</strong></span>}
                          {item.item_number && <span>Item# <strong>{item.item_number}</strong></span>}
                          {item.quantity && <span>Qty: <strong>{item.quantity}</strong></span>}
                        </div>
                        {item.description && <p className="text-slate-700">{item.description}</p>}
                        {item.photo_storage_key && (
                            <PublicImage docKey={item.photo_storage_key} alt="Attached" className="h-16 w-16 rounded-md object-cover border border-amber-300 hover:opacity-80 transition-opacity"
                             isLink={true}
                             onError={(err) => {
                              handleDeleteRequestItemByIndex(idx,err)
                            }
                            }
                              />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewingRequest(null)}>Close</Button>
            {viewingRequest?.status === 'pending' && (
              <Button
                className="bg-[#005f27] hover:bg-[#436a36] text-white gap-1"
                onClick={() => { handleCreateFromRequest(viewingRequest); setViewingRequest(null); }}
              >
                <Plus className="h-4 w-4" /> Create Quote
              </Button>
            )}
            {viewingRequest?.status === 'assigned' && (
              <Button
                variant="outline"
                className="text-[#005f27] border-[#005f27] hover:bg-[#edf0be] gap-1"
                onClick={() => { handleCreateFromRequest(viewingRequest); setViewingRequest(null); }}
              >
                <Edit2 className="h-4 w-4" /> Continue Quote
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminOnly>
  );
}