import React, { useState, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Edit2, FileText, Send, Trash2, DollarSign, Upload, Loader2, Download } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import StatsCard from '@/components/shared/StatsCard';
import EmptyState from '@/components/shared/EmptyState';
import WiegandSportsForm from '@/components/invoices/WiegandSportsForm';
import WiegandServicesForm from '@/components/invoices/WiegandServicesForm';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';
import { usePrivateDocument } from '@/hooks/usePrivateDocument';

const SPORTS_EMPTY_ITEM = () => ({ line: 1, item_number: '', ez_number: '', description: '', quantity: 1, unit_price: 0, amount: 0 });
const SERVICES_EMPTY_ITEM = () => ({ line: 1, item_number: '', ez_number: '', description: '', quantity: 1, unit: 'each', unit_price: 0, amount: 0 });

const DEFAULT_FORM = (entity = 'Wiegand Sports Gmbh') => ({
  sending_entity: entity,
  client_id: '',
  order_id: '',
  title: '',
  invoice_number: '',
  issue_date: format(new Date(), 'yyyy-MM-dd'),
  due_date: format(new Date(), 'yyyy-MM-dd'),
  po_number: '',
  tax_code: '',
  tax_rate: 19,
  sales_tax: 0,
  packing: 0,
  export_declaration: 0,
  customs_fees: 0,
  freight: 0,
  credit: 0,
  notes: '',
  status: 'draft',
  items: [entity === 'Wiegand Sports Gmbh' ? SPORTS_EMPTY_ITEM() : SERVICES_EMPTY_ITEM()],
});

export default function AdminInvoices() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { uploadFileToS3, isUploading } = useUpload();
  const { handleSecureView, currentlyLoadingKey } = usePrivateDocument();
  const [formData, setFormData] = useState(DEFAULT_FORM());
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'wire',
    reference: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: () => api.getInvoices({ order:'-created_at', limit:200}),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.getClients({ order:'company_name', limit:200}),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders-for-invoice'],
    queryFn: () => api.getOrders({ order:'-created_at', limit:500}),
  });

  const { data: subOrders = [] } = useQuery({
    queryKey: ['sub-orders-for-invoice'],
    queryFn: () => api.getSubOrders({ order:'-created_at', limit:500}),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const invoice = await api.createInvoice(data);
      if (data.order_id) {
        await api.updateInvoice(data.order_id, { status: 'invoiced' });
        queryClient.invalidateQueries({ queryKey: ['admin-orders']});
      }
      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices']});
      setShowDialog(false);
      resetForm();
      toast.success('Invoice created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices']});
      setShowDialog(false);
      resetForm();
      toast.success('Invoice updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices']});
      toast.success('Invoice deleted');
    },
  });

  const resetForm = () => {
    setFormData(DEFAULT_FORM());
    setSelectedInvoice(null);
    setPdfFile(null);
  };

  const isInvoiceOverdue = (invoice) => {
    if (['paid', 'cancelled'].includes(invoice.status)) return false;
    if (!invoice.issue_date) return false;
    const daysSinceIssue = differenceInDays(new Date(), new Date(invoice.issue_date));
    return daysSinceIssue > 60;
  };

  const handleEntityChange = (entity) => {
    setFormData({
      ...DEFAULT_FORM(entity),
      client_id: formData.client_id,
      issue_date: formData.issue_date,
      due_date: formData.due_date,
      invoice_number: formData.invoice_number,
    });
  };

  const handleOrderSelect = (orderId) => {
    setFormData(prev => {
      const newData = { ...prev, order_id: orderId };
      if (orderId) {
        // Check master orders first, then sub-orders
        let selectedOrder = orders.find(o => o.id === orderId);
        if (!selectedOrder) {
          selectedOrder = subOrders.find(o => o.id === orderId);
        }
        if (selectedOrder) {
          newData.client_id = selectedOrder.client_id;
          newData.title = selectedOrder.title || selectedOrder.sub_order_number || '';
          newData.items = selectedOrder.items || [];
        }
      }
      return newData;
    });
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setPdfFile(null);
    setFormData({
      sending_entity: invoice.sending_entity || 'Wiegand Sports Gmbh',
      client_id: invoice.client_id || '',
      title: invoice.title || '',
      invoice_number: invoice.invoice_number || '',
      issue_date: invoice.issue_date || format(new Date(), 'yyyy-MM-dd'),
      due_date: invoice.due_date || format(new Date(), 'yyyy-MM-dd'),
      po_number: invoice.po_number || '',
      order_id: invoice.order_id || '',
      tax_code: invoice.tax_code || '',
      tax_rate: invoice.tax_rate || 19,
      sales_tax: invoice.sales_tax || 0,
      packing: invoice.packing || 0,
      export_declaration: invoice.export_declaration || 0,
      customs_fees: invoice.customs_fees || 0,
      freight: invoice.freight || 0,
      credit: invoice.credit || 0,
      notes: invoice.notes || '',
      status: invoice.status || 'draft',
      items: invoice.items?.length > 0 ? invoice.items : [SPORTS_EMPTY_ITEM()],
    });
    setShowDialog(true);
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const credit = parseFloat(formData.credit) || 0;
    if (formData.sending_entity === 'Wiegand Sports Gmbh') {
      const vatAmount = subtotal * ((parseFloat(formData.tax_rate) || 0) / 100);
      return { subtotal, total_amount: subtotal + vatAmount - credit, sales_tax: 0 };
    } else {
      const extras = ['sales_tax', 'packing', 'export_declaration', 'customs_fees', 'freight']
        .reduce((s, k) => s + (parseFloat(formData[k]) || 0), 0);
      return { subtotal, total_amount: subtotal + extras - credit, sales_tax: parseFloat(formData.sales_tax) || 0 };
    }
  };

  const handleSubmit = async () => {
    try{
    const client = clients.find(c => c.id === formData.client_id);
    const { subtotal, total_amount, sales_tax } = calculateTotals();

    let pdf_storage_key = selectedInvoice?.pdf_storage_key || undefined;
    console.log("pdfFile",pdfFile)
    if (pdfFile) {
      console.log("pdfFile2",pdfFile)
      setUploadingPdf(true);
      const file_key = await uploadFileToS3({client_id: client?.id, file: pdfFile, type:'invoice'});
      pdf_storage_key = file_key;
      setUploadingPdf(false);
    }

    const invoiceData = {
      ...formData,
      client_name: client?.company_name || '',
      coaster_name: client?.coaster_name || '',
      subtotal,
      sales_tax,
      credit: parseFloat(formData.credit) || 0,
      total_amount,
      balance_due: total_amount,
      amount_paid: selectedInvoice?.amount_paid || 0,
      currency: 'USD',
      ...(pdf_storage_key ? { pdf_storage_key } : {}),
    };

    let savedInvoice;
    if (selectedInvoice) {
      savedInvoice = await updateMutation.mutateAsync({ id: selectedInvoice.id, data: invoiceData });
      // If a new PDF was uploaded, update/create the Document record
      if (pdfFile && pdf_storage_key && client) {
        const existingDocs = await api.getDs({ invoice_id: selectedInvoice.id });
        if (existingDocs.length > 0) {
          await api.updateD(existingDocs[0].id, { file_storage_key: pdf_storage_key, title: `Invoice ${invoiceData.invoice_number || selectedInvoice.id} – ${invoiceData.title}` });
        } else {
          await api.createD({
            title: `Invoice ${invoiceData.invoice_number || selectedInvoice.id} – ${invoiceData.title}`,
            category: 'invoice',
            file_storage_key: pdf_storage_key,
            file_type: pdfFile.type,
            file_size: pdfFile.size,
            coaster_name: client.coaster_name || '',
            client_id: client.id,
            invoice_id: selectedInvoice.id,
            is_public: false,
            status: 'active',
          });
        }
      }
    } else {
      savedInvoice = await createMutation.mutateAsync(invoiceData);
      // If PDF uploaded on create, save Document record
      if (pdfFile && pdf_storage_key && client && savedInvoice?.id) {
        await api.createD({
          title: `Invoice ${invoiceData.invoice_number || savedInvoice.id} – ${invoiceData.title}`,
          category: 'invoice',
          file_storage_key: pdf_storage_key,
          file_type: pdfFile.type,
          file_size: pdfFile.size,
          coaster_name: client.coaster_name || '',
          client_id: client.id,
          invoice_id: savedInvoice.id,
          is_public: false,
          status: 'active',
        });
      }
    }}catch(error){
      console.log(error)
      toast.error('Failed to upload file');
      setUploadingPdf(false);
    }
  };

  const handleSend = async (invoice) => {
    await updateMutation.mutateAsync({ id: invoice.id, data: { status: 'sent' } });
    
    // Update linked order status to invoiced
    if (invoice.order_id) {
      await api.updateOrder(invoice.order_id, { status: 'invoiced' });
      queryClient.invalidateQueries({ queryKey: ['admin-orders']});
    }

    toast.success('Invoice sent');
  };

  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({ amount: invoice.balance_due || invoice.total_amount || '', method: 'wire', reference: '', date: format(new Date(), 'yyyy-MM-dd') });
    setShowPaymentDialog(true);
  };

  const submitPayment = async () => {
    const amount = parseFloat(paymentData.amount);
    const newTotalPaid = (selectedInvoice.amount_paid || 0) + amount;
    const balanceDue = (selectedInvoice.total_amount || 0) - newTotalPaid;
    const paymentHistory = [...(selectedInvoice.payment_history || []), {
      date: paymentData.date,
      amount,
      method: paymentData.method,
      reference: paymentData.reference
    }];
    const newStatus = balanceDue <= 0 ? 'paid' : newTotalPaid > 0 ? 'partial' : selectedInvoice.status;
    await updateMutation.mutateAsync({ id: selectedInvoice.id, data: { amount_paid: newTotalPaid, balance_due: balanceDue, payment_history: paymentHistory, status: newStatus } });
    setShowPaymentDialog(false);
    toast.success('Payment recorded');
  };

  const invoicesWithOverdueCheck = invoices.map(inv => {
    if (isInvoiceOverdue(inv) && inv.status !== 'overdue') {
      return { ...inv, status: 'overdue' };
    }
    return inv;
  });

  const filteredInvoices = invoicesWithOverdueCheck.filter(inv => {
    const matchSearch = inv.title?.toLowerCase().includes(searchTerm.toLowerCase()) || inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const totalPending = invoices.filter(i => ['pending', 'sent', 'partial'].includes(i.status)).reduce((s, i) => s + Number(i.balance_due || i.total_amount || 0), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.balance_due || i.total_amount || 0), 0);

  const columns = [
    { header: 'Invoice #', render: (row) => <span className="font-medium">{row.invoice_number || `INV-${row.id?.slice(-6)}`}</span> },
    { header: 'Entity', render: (row) => <span className="text-xs text-slate-500">{row.sending_entity || '—'}</span> },
    { header: 'Client', render: (row) => <span className="font-medium">{row.client_name || '-'}</span> },
    { header: 'Amount', render: (row) => <span className="font-semibold">${row.total_amount?.toLocaleString() || '0'}</span> },
    { header: 'Balance', render: (row) => <span className={`font-semibold ${(row.balance_due || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>${(row.balance_due || 0).toLocaleString()}</span> },
    { header: 'Date', render: (row) => row.issue_date ? format(new Date(row.issue_date), 'MMM d, yyyy') : '-' },
    { header: 'Due', render: (row)  => row.due_date ? format(new Date(row.due_date), 'MMM d, yyyy') : '-' },
    { header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}><Edit2 className="h-4 w-4" /></Button>
          {row.status === 'draft' && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSend(row); }}><Send className="h-4 w-4 text-blue-600" /></Button>}
          {!['paid', 'cancelled'].includes(row.status) && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRecordPayment(row); }}><DollarSign className="h-4 w-4 text-emerald-600" /></Button>}
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(row.id); }}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
        </div>
      )
    },
  ];

  return (
    <AdminOnly>
      <div className="space-y-6">
        <PageHeader
          title="Invoices"
          subtitle="Create and manage invoices"
          actions={
            <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-[#1e3a5f] hover:bg-[#2d5a8a]">
              <Plus className="h-4 w-4 mr-2" /> Create Invoice
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard title="Total Paid" value={`$${totalRevenue.toLocaleString()}`} variant="success" />
          <StatsCard title="Pending" value={`$${totalPending.toLocaleString()}`} variant="warning" />
          <StatsCard title="Overdue" value={`$${totalOverdue.toLocaleString()}`} variant="danger" />
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {invoices.length === 0 && !isLoading ? (
          <EmptyState icon={FileText} title="No invoices yet" description="Create your first invoice" action={() => { resetForm(); setShowDialog(true); }} actionLabel="Create Invoice" />
        ) : (
          <DataTable columns={columns} data={filteredInvoices} isLoading={isLoading} />
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
          <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedInvoice ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-5">
              {/* Sending Entity Selector */}
              <div className="flex gap-3">
                <Label className="self-center shrink-0 font-semibold">Sending Entity:</Label>
                {['Wiegand Sports GmbH', 'Wiegand Services LLC'].map(entity => (
                  <button
                    key={entity}
                    type="button"
                    onClick={() => handleEntityChange(entity)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.sending_entity === entity
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-[#1e3a5f]'
                    }`}
                  >
                    {entity}
                  </button>
                ))}
              </div>

              {/* Client selector (shared) — for Sports entity, bill-to is inside the form */}
              {formData.sending_entity === 'Wiegand Sports Gmbh' && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Client *</Label>
                    <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Link to Order (optional)</Label>
                    <Select value={formData.order_id || ''} onValueChange={handleOrderSelect}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select order" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No order</SelectItem>
                        {formData.client_id && (
                          <>
                            {orders
                              .filter(o => o.client_id === formData.client_id && !o.is_split)
                              .map(o => <SelectItem key={o.id} value={o.id}>{o.order_number || o.title} — ${o.total_amount?.toLocaleString()}</SelectItem>)
                            }
                            {subOrders.filter(s => s.client_id === formData.client_id).length > 0 && (
                              <>
                                {orders
                                  .filter(o => o.client_id === formData.client_id && o.is_split).length > 0 && (
                                  <div className="py-1 px-2 text-xs font-semibold text-slate-500">Sub-Orders</div>
                                )}
                                {subOrders
                                  .filter(s => s.client_id === formData.client_id)
                                  .map(s => <SelectItem key={s.id} value={s.id}>{s.sub_order_number} ({s.supplier_entity}) — ${s.total_amount?.toLocaleString()}</SelectItem>)
                                }
                              </>
                            )}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {!formData.client_id && <p className="text-xs text-slate-500 mt-1">Select a client first</p>}
                  </div>
                </div>
              )}

              {/* Entity-specific form */}
              {formData.sending_entity === 'Wiegand Sports Gmbh' ? (
                <WiegandSportsForm formData={formData} setFormData={setFormData} clients={clients} />
              ) : (
                <WiegandServicesForm formData={formData} setFormData={setFormData} clients={clients} />
              )}

              {/* PDF Upload */}
              <div className="border-t pt-4">
                <Label>Invoice PDF (optional)</Label>
                <input type="file" accept=".pdf" ref={pdfInputRef} className="hidden" onChange={(e) => setPdfFile(e.target.files[0] || null)} />
                {selectedInvoice?.pdf_storage_key && !pdfFile ? (
                  <div className="mt-1 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-700 flex-1">PDF already uploaded</span>
                    <Button variant="ghost" size="sm" asChild className="text-xs"><a href={"#view"}
                      onClick={async (e) => {
                        try {
                          const result = await handleSecureView(e, selectedInvoice.pdf_storage_key)
                        } catch (error) {
                          if (error.message === "FILE_MISSING_IN_STORAGE") {
                            try {
                              await updateMutation.mutateAsync({ id: selectedInvoice.id, data: { pdf_storage_key: null } });
                              const existingDoc = await api.getDs({ invoice_id: selectedInvoice.id });
                              if (existingDoc.length > 0) {
                                await api.updateD(existingDoc.id, { status: 'archived' })
                              }
                            } catch (error) {
                              toast.error('Error occured');
                            }

                            toast.error('File Not Found');
                          } else {
                            toast.error('Failed to download, please try again!');
                          }
                        }

                      }}>
                      <Download className="h-3 w-3 mr-1" /> {currentlyLoadingKey === selectedInvoice.pdf_storage_key? 'Authorizing Access...' :'View'}</a></Button>
                    <Button variant="ghost" size="sm" onClick={() => pdfInputRef.current?.click()} className="text-xs">Replace</Button>
                  </div>
                ) : pdfFile ? (
                  <div className="mt-1 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700 flex-1 truncate">{pdfFile.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => pdfInputRef.current?.click()} className="text-xs">Change</Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full mt-1 border-dashed" onClick={() => pdfInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />Upload Invoice PDF
                  </Button>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.client_id || !formData.title || createMutation.isPending || updateMutation.isPending || uploadingPdf}
                className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
              >
                {uploadingPdf ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading PDF...</> : createMutation.isPending || updateMutation.isPending ? 'Saving...' : selectedInvoice ? 'Update Invoice' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Amount *</Label>
                <Input type="number" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} className="mt-1" placeholder="0.00" />
              </div>
              <div>
                <Label>Method *</Label>
                <Select value={paymentData.method} onValueChange={(v) => setPaymentData({ ...paymentData, method: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ach">ACH / Bank Transfer</SelectItem>
                    <SelectItem value="authorize_net_card">Authorize.net (Card)</SelectItem>
                    <SelectItem value="authorize_net_debit">Authorize.net (Debit)</SelectItem>
                    <SelectItem value="phone">Phone Payment</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Date</Label>
                <Input type="date" value={paymentData.date} onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Reference</Label>
                <Input value={paymentData.reference} onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })} className="mt-1" placeholder="Transaction ID, check number..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
              <Button onClick={submitPayment} disabled={!paymentData.amount || updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">Record Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminOnly>
  );
}