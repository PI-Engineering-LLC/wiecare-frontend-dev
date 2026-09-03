import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Eye, CheckCircle, XCircle, FileText, Download, X, Edit3, Camera, ImagePlus, Loader2, Paperclip, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';
import { PublicImage } from '@/components/PublicImage';
import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/ClientContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClientSuspended, SuspendedNotice, SUSPENDED_MESSAGE } from '@/hooks/useClientSuspended';
import PartAutocomplete from '@/components/shared/PartAutocomplete';
import { useUrlParam } from '@/hooks/useUrlParam';
import NotesRenderer from '@/components/quotes/NotesRenderer';

export default function Quotes() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [modificationRequest, setModificationRequest] = useState('');
  const [quoteToModify, setQuoteToModify] = useState(null);

  const navigate = useNavigate();
  const location = useLocation()

  const { uploadFileToS3, isUploading } = useUpload();
  const [quoteRequest, setQuoteRequest] = useState({
    title: '',
    description: '',
    items: [{ ez_number: '', item_number: '', quantity: 1, description: '', photo_storage_key: '', uploading: false }]
  });
  const [uploadingIdx, setUploadingIdx] = useState(null);

  const queryClient = useQueryClient();
  const isSuspended = useClientSuspended();

  const [highlightQuoteId, setHighlightQuoteId] = useState(null);

  const actionParam = useUrlParam('action');
  const quoteIdParam = useUrlParam('quote_id');
  useEffect(() => {
    if (actionParam === 'new') setShowRequestDialog(true);
    if (quoteIdParam) setHighlightQuoteId(quoteIdParam);
  }, [actionParam, quoteIdParam]);
  

  // useEffect(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   if (params.get('action') === 'new') setShowRequestDialog(true);
  //   if (params.get('quote_id')) setHighlightQuoteId(params.get('quote_id'));
  // }, []);


  const { activeClientId, switchClient } = useClient()

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes', activeClientId],
    queryFn: () => activeClientId
      ? api.getQuotes({ client_id: activeClientId, sort: '-created_at', limit: 100 })
      : api.getQuotes({ sort: '-created_at', limit: 100 }),
    enabled: !!user,
  });

  // Auto-open quote from notification link
  useEffect(() => {
    if (highlightQuoteId && quotes.length > 0) {
      const quote = quotes.find(q => q.id === highlightQuoteId);
      if (quote) setSelectedQuote(quote);
    }
  }, [highlightQuoteId, quotes]);


  const createQuoteMutation = useMutation({
    mutationFn: (data) => api.createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setShowRequestDialog(false);
      setQuoteRequest({ title: '', description: '', items: [{ ez_number: '', item_number: '', quantity: 1, description: '' }] });
      toast.success('Quote request submitted successfully');
    },
  });

  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateQuote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      setShowModifyDialog(false);
      setModificationRequest('');
      setQuoteToModify(null);
      setSelectedQuote(null);
      setShowRequestDialog(false);
      if (location.search) {
        navigate(location.pathname, { replace: true });
      }
      toast.success('Quote updated successfully');
    },
  });
  const selectPart = (index, part) => {
    const newItems = [...quoteRequest.items];
    newItems[index] = {
      ...newItems[index],
      ez_number: part.ez_number ?? '',
      item_number: part.part_number ?? '',
      description: part.name ?? newItems[index].description,
    };
    setQuoteRequest({ ...quoteRequest, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...quoteRequest.items];
    newItems[index][field] = value;
    setQuoteRequest({ ...quoteRequest, items: newItems });
  };

  const addItem = () => {
    setQuoteRequest({
      ...quoteRequest,
      items: [...quoteRequest.items, { ez_number: '', item_number: '', quantity: 1, description: '', photo_storage_key: '' }]
    });
  };

  const handleItemPhotoUpload = async (idx, file) => {
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const file_key = await uploadFileToS3({ client_id: activeClientId, file, type: 'item_photo', isPrivate: false });
      const newItems = [...quoteRequest.items];
      newItems[idx].photo_storage_key = file_key;
      setQuoteRequest({ ...quoteRequest, items: newItems });
      setUploadingIdx(null);
    } catch (error) {
      toast.error('Failed to upload image');
      setUploadingIdx(null);
    }
  };

  const removeItem = (index) => {
    if (quoteRequest.items.length > 1) {
      setQuoteRequest({
        ...quoteRequest,
        items: quoteRequest.items.filter((_, i) => i !== index)
      });
    }
  };

  const handleRequestQuote = async () => {
    if (isSuspended) {
      toast.error(SUSPENDED_MESSAGE);
      return;
    }

    const effectiveClientId = activeClientId;
    if (!effectiveClientId) {
      toast.error('Your account is not linked to a client. Please contact support.');
      return;
    }

    const itemsText = quoteRequest.items.map(item => {
      const parts = [];
      if (item.ez_number) parts.push(`EZ# ${item.ez_number}`);
      if (item.item_number) parts.push(`Item# ${item.item_number}`);
      if (item.quantity) parts.push(`Qty: ${item.quantity}`);
      if (item.description) parts.push(item.description);
      if (item.photo_storage_key) parts.push(`[Photo attached]`);
      return parts.join(' | ');
    }).join('\n');

    const itemsWithPhotos = quoteRequest.items.map(({ uploading, ...item }) => item);

    const newQuote = await createQuoteMutation.mutateAsync({
      title: quoteRequest.title,
      description: `${quoteRequest.description}\n\nRequested Items:\n${itemsText}`,
      client_id: effectiveClientId,
      status: 'pending',
      items: itemsWithPhotos,
    });
  };

  const handleApproveQuote = async (quote) => {
    await updateQuoteMutation.mutateAsync({
      id: quote.id,
      data: { status: 'approved' }
    });
    toast.success('Quote accepted and order created');
  };

  const handleRejectQuote = async (quote) => {
    await updateQuoteMutation.mutateAsync({
      id: quote.id,
      data: { status: 'rejected' }
    });
  };

  const handleRequestModifications = async (quote) => {
    await updateQuoteMutation.mutateAsync({
      id: quote.id,
      data: {
        status: 'pending',
        notes: modificationRequest
      }
    });

    setShowModifyDialog(false);
    setModificationRequest('');
    setQuoteToModify(null);
    setSelectedQuote(null);
    if (location.search) {
      navigate(location.pathname, { replace: true });
    }
    toast.success('Modification request sent');
  };
  const handleDeleteQuoteItemByIndex = (indexToDelete, error) => {
    if (error.status === 404) {
      setSelectedQuote((prevQuote) => ({ ...prevQuote, items: prevQuote.items.filter((_, i) => i !== indexToDelete) }));
    }
  };

  // Split quotes: client's own requests vs admin-sent quotes
  const myRequests = quotes.filter(q => !q.sending_entity && (q.status === 'pending' || q.status === 'assigned'));
  const adminQuotes = quotes.filter(q => !!q.sending_entity);

  const filteredAdminQuotes = adminQuotes.filter((quote) => {
    const matchesSearch = quote.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const adminQuoteColumns = [
    {
      header: 'Quote #',
      render: (row) => (
        <span className="font-medium text-slate-900">{row.quote_number || `Q-${row.id?.slice(-6)}`}</span>
      )
    },
    {
      header: 'Title',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.title}</p>
          {row.sending_entity && <p className="text-xs text-slate-500">From: {row.sending_entity}</p>}
        </div>
      )
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold">{row.total_amount ? `$${row.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</span>
      )
    },
    {
      header: 'Valid Until',
      render: (row) => row.valid_until ? formatInTimeZone(new Date(row.valid_until), 'UTC', 'MMM d, yyyy') : '-'
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedQuote(row); }}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === 'sent' && (row.valid_until && new Date(row.valid_until) > new Date()) && (
            <>
              <Button variant="ghost" size="icon" className="text-emerald-600" onClick={(e) => { e.stopPropagation(); handleApproveQuote(row); }}>
                <CheckCircle className="h-4 w-4" />
              </Button>
              {/* <Button variant="ghost" size="icon" className="text-rose-600" onClick={(e) => { e.stopPropagation(); handleRejectQuote(row); }}>
                <XCircle className="h-4 w-4" />
              </Button> */}
            </>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes"
        subtitle="View and manage your quote requests"
        actions={
          <Button
            onClick={() => setShowRequestDialog(true)}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Quote
          </Button>
        }
      />

      {/* Section 1: Quotes sent by admin (require client action) */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#005f27]" />
          Quotes from Wiegand
          {adminQuotes.filter(q => q.status === 'sent').length > 0 && (
            <span className="ml-1 bg-[#005f27] text-white text-xs font-bold rounded-full px-2 py-0.5">
              {adminQuotes.filter(q => q.status === 'sent').length} awaiting action
            </span>
          )}
        </h2>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-3">
          <CardContent className="p-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search quotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="approved">Accepted</SelectItem>
                  {/* <SelectItem value="rejected">Rejected</SelectItem> */}
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {adminQuotes.length === 0 && !isLoading ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-slate-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No quotes from Wiegand yet</p>
            </CardContent>
          </Card>
        ) : (
          <DataTable
            columns={adminQuoteColumns}
            data={filteredAdminQuotes}
            isLoading={isLoading}
            emptyMessage="No quotes match your search"
            onRowClick={setSelectedQuote}
          />
        )}
      </div>

      {/* Section 2: Client's own requests */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-amber-600" />
          My Quote Requests
          {myRequests.length > 0 && (
            <span className="ml-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full px-2 py-0.5">
              {myRequests.length} pending review
            </span>
          )}
        </h2>

        {myRequests.length === 0 && !isLoading ? (
          <EmptyState
            icon={FileText}
            title="No quote requests yet"
            description="Submit a quote request and our team will prepare a quote for you"
            action={() => setShowRequestDialog(true)}
            actionLabel="Request Quote"
          />
        ) : (
          <div className="space-y-2">
            {myRequests.map(req => (
              <Card key={req.id} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">{req.title}</p>
                    {req.description && (
                      <p className="text-sm text-slate-500 truncate">{req.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted {req.created_at ? formatInTimeZone(new Date(req.created_at), 'UTC', 'MMM d, yyyy') : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                      Under Review
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Request Quote Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request a Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isSuspended && <SuspendedNotice />}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Request Title</label>
              <Input
                placeholder="What do you need a quote for?"
                value={quoteRequest.title}
                onChange={(e) => setQuoteRequest({ ...quoteRequest, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">General Description</label>
              <Textarea
                placeholder="Overall requirements or context..."
                value={quoteRequest.description}
                onChange={(e) => setQuoteRequest({ ...quoteRequest, description: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Items</label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {quoteRequest.items.map((item, idx) => (
                  <div key={idx} className="p-3 border rounded-lg space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {/* <PartAutocomplete
                        placeholder="EZ #"
                        value={item.ez_number}
                        // onChange={(e) => updateItem(idx, 'ez_number', e.target.value)}
                        onChange={(v) => updateItem(idx, 'ez_number', v)}
                        onSelect={(part) => selectPart(idx, part)}
                        showPrice={false}
                      /> */}
                      <Input
                        placeholder="EZ #"
                        value={item.ez_number}
                        onChange={(e) => updateItem(idx, 'ez_number', e.target.value)}
                      />
                      <Input
                        placeholder="Item #"
                        value={item.item_number}
                        onChange={(e) => updateItem(idx, 'item_number', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        className="flex-1"
                        placeholder="Description (if you don't have EZ# or Item#)"
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(idx)}
                        disabled={quoteRequest.items.length === 1}
                      >
                        <X className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>

                    {/* Photo upload */}
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer flex items-center gap-2 text-xs text-slate-500 hover:text-[#005f27] transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleItemPhotoUpload(idx, e.target.files[0])}
                          disabled={uploadingIdx === idx}
                        />
                        {uploadingIdx === idx ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                        ) : (
                          <><ImagePlus className="h-4 w-4" /> {item.photo_storage_key ? 'Change photo' : 'Attach photo (optional)'}</>
                        )}
                      </label>
                      {item.photo_storage_key && uploadingIdx !== idx && (
                        <div className="flex items-center gap-2">
                          {/* <img src={item.photo_storage_key} alt="Item photo" className="h-10 w-10 rounded-md object-cover border border-slate-200" /> */}
                          <PublicImage docKey={item.photo_storage_key} alt={"Item photo"} className="h-10 w-10 rounded-md object-cover border border-slate-200"
                            onError={(err) => {
                              handleDeleteQuoteItemByIndex(idx, err)
                            }
                            }
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(idx, 'photo_storage_key', '')}
                            className="text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestQuote}
              disabled={isSuspended || !quoteRequest.title || createQuoteMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {createQuoteMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Details Dialog */}
      <Dialog open={!!selectedQuote} onOpenChange={(open) => {
        setSelectedQuote(null);
        if (!open) {
          setHighlightQuoteId(null);
          if (location.search) {
            navigate(location.pathname, { replace: true });
          }
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quote Details</DialogTitle>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Quote Number</p>
                  <p className="font-semibold">{selectedQuote.quote_number || `Q-${selectedQuote.id?.slice(-6)}`}</p>
                </div>
                <StatusBadge status={selectedQuote.status} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Title</p>
                  <p className="font-medium">{selectedQuote.title}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Valid Until</p>
                  <p className="font-medium">
                    {selectedQuote.valid_until
                      ? formatInTimeZone(new Date(selectedQuote.valid_until), 'UTC', 'MMM d, yyyy')
                      : 'Not specified'}
                  </p>
                </div>
              </div>

              {selectedQuote.description && (
                <div>
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="mt-1">{selectedQuote.description}</p>
                </div>
              )}

              {selectedQuote.sending_entity && (
                <div>
                  <p className="text-sm text-slate-500">From</p>
                  <p className="font-medium">{selectedQuote.sending_entity}</p>
                </div>
              )}

              {selectedQuote.items && selectedQuote.items.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Items</p>
                  {/* Mobile: stacked cards */}
                  <div className="sm:hidden space-y-2">
                    {(selectedQuote.items || []).map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-3 text-sm space-y-1">
                        <p className="font-medium">{item.description || 'Item ' + (idx + 1)}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 text-xs">
                          {item.item_number && <span>Item #: {item.item_number}</span>}
                          {item.z_number && <span>Z #: {item.z_number}</span>}
                          <span>Qty: {item.quantity}</span>
                          <span>Price: ${item.unit_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <p className="text-right font-semibold">${item.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    ))}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden sm:block border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-medium">Item #</th>
                          <th className="text-left p-3 font-medium">Z #</th>
                          <th className="text-left p-3 font-medium">Description</th>
                          <th className="text-right p-3 font-medium">Qty</th>
                          <th className="text-right p-3 font-medium">Price</th>
                          <th className="text-right p-3 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedQuote.items || []).map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-3 text-slate-600">{item.item_number || '-'}</td>
                            <td className="p-3 text-slate-600">{item.ez_number || '-'}</td>
                            <td className="p-3">{item.description}</td>
                            <td className="p-3 text-right">{item.quantity}</td>
                            <td className="p-3 text-right">${item.unit_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right font-medium">${item.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals breakdown */}
              <div className="border rounded-lg p-4 bg-slate-50 space-y-2 text-sm max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span>${selectedQuote.subtotal?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0'}</span>
                </div>
                {selectedQuote.discount_percent > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount ({selectedQuote.discount_percent}%)</span>
                    <span>-${(selectedQuote.subtotal * selectedQuote.discount_percent / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }</span>
                  </div>
                )}
                {selectedQuote.packing > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Packing</span>
                    <span>${selectedQuote.packing?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }</span>
                  </div>
                )}
                {selectedQuote.export_declaration > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Export Declaration</span>
                    <span>${selectedQuote.export_declaration?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }</span>
                  </div>
                )}
                {selectedQuote.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax ({selectedQuote.tax_rate}%)</span>
                    <span>${selectedQuote.tax_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total</span>
                  <span>${selectedQuote.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })  || '0'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t">
                {/* <div className="flex-1">
                  {selectedQuote.notes && (
                    <div>
                      <p className="text-sm text-slate-500">Notes</p>
                      <p className="text-sm mt-1">{selectedQuote.notes}</p>
                    </div>
                  )}
                </div> */}
                {selectedQuote.status === 'sent' && (selectedQuote.valid_until && new Date(selectedQuote.valid_until) > new Date()) && (
                  <div className="flex flex-wrap gap-2">
                    {/* <Button
                      variant="outline"
                      onClick={() => handleRejectQuote(selectedQuote)}
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button> */}
                    <Button
                      variant="outline"
                      onClick={() => { setQuoteToModify(selectedQuote); setShowModifyDialog(true); }}
                      className="text-amber-600 border-amber-200 hover:bg-amber-50"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Request Changes
                    </Button>
                    <Button
                      onClick={() => handleApproveQuote(selectedQuote)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                  </div>
                )}
                {selectedQuote.status === 'pending' && !selectedQuote.sending_entity && (
                  <p className="text-sm text-slate-500 italic">Your quote request is being reviewed by our team.</p>
                )}




                
              </div>
              {<NotesRenderer notes={selectedQuote.notes} />
              // (() => {
//   const notes = selectedQuote.notes || '';
//   const markerMatch = notes.match(/\[Client Modification Request[^\]]*\]:\s*([\s\S]*)/);
//   const clientModification = markerMatch ? markerMatch[1].trim() : '';
//   const adminNotes = markerMatch ? notes.slice(0, markerMatch.index).trim() : notes.trim();
//   return (
//     <div className="space-y-3 pt-4 border-t">
//       {clientModification && (
//         <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
//           <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
//             <MessageSquare className="h-3.5 w-3.5" /> Client Modification Request
//           </p>
//           <p className="text-sm text-amber-800 whitespace-pre-line">{clientModification}</p>
//         </div>
//       )}
//       {adminNotes && (
//         <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
//           <p className="text-xs font-semibold text-slate-600 mb-1">Admin Notes</p>
//           <p className="text-sm text-slate-700 whitespace-pre-line">{adminNotes}</p>
//         </div>
//       )}
//       {/* ...action buttons (Reject / Request Changes / Approve) unchanged... */}
//     </div>
//   );
// })()
}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Modifications Dialog */}
      <Dialog open={showModifyDialog} onOpenChange={setShowModifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Quote Modifications</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Describe what changes you'd like to the quote. The admin team will review and send you an updated quote.
            </p>
            <div>
              <Label>Modification Request</Label>
              <Textarea
                placeholder="Please describe the changes you need..."
                value={modificationRequest}
                onChange={(e) => setModificationRequest(e.target.value)}
                className="mt-1"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModifyDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleRequestModifications(quoteToModify)}
              disabled={!modificationRequest || updateQuoteMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {updateQuoteMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}