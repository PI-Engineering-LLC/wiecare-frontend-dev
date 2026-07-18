import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, FileText, AlertCircle, CreditCard, Download } from 'lucide-react';
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
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { useClient } from '@/lib/ClientContext';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { usePrivateDocument } from '@/hooks/usePrivateDocument';

export default function Invoices() {
  const {user} = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [searchParams] = useSearchParams();
  const { handleSecureView, currentlyLoadingKey } = usePrivateDocument();
  
  
  const queryClient = useQueryClient();
  const { activeClientId, switchClient } = useClient()
  const location = useLocation()
    const navigate = useNavigate();
  // useEffect(() => {
    
  //   const responseCode = searchParams.get('responseCode');
  //   const message = searchParams.get('responseMessage');
  //   const transactionId = searchParams.get('transactionId');
  //     const params = new URLSearchParams(window.location.search);
  //     console.log(searchParams)
  //     console.log(params)
  //     if (responseCode === '200') {
  //       toast.success('Payment recorded successfully!!!');
  //       // console.log('Payment Successful:', { transactionId, message });
  //     }else if (responseCode) {
  //       console.error('Payment Failed:', message);
  //     toast.success('Payment Error occured!!');
  //     }
  //     if (params.get('action') === 'invoices') {toast.success('Payment recorded successfully'); console.log('Payment recorded successfully')};;
  //     if (params.get('action') === 'retry') {toast.error('Error occured'); console.log('Error occured')}
  //     if (params.get('action') === 'cancel') {toast.success('Payment cancelled'); console.log('Payment cancelled')}
  //   }, [searchParams]);
  useEffect(() => {
    
    const fixedUrl = location.search.replace(/\?/g, '&');
    const params = new URLSearchParams(fixedUrl);
    //     const params = new URLSearchParams(window.location.search);

    const responseCode = params.get('responseCode');
    const message = params.get('responseMessage');
    const transactionId = params.get('transactionId');
      
     
      if (responseCode === '200') {
        toast.success('Payment processed. You will receive a confirmation shortly');
        // console.log('Payment Successful:', { transactionId, message });
      }else if (responseCode) {
        console.error('Payment Failed:', message);
      toast.success('Payment Error occured!!');
      }
      const action = params.get('action')
      if (params.get('action') === 'invoices' && responseCode === '200') {toast.success('Payment processed. You will receive a confirmation shortly'); console.log('Payment recorded successfully')};;
      if (params.get('action') === 'retry') {toast.error('Error occured'); console.log('Error occured')}
      if (params.get('action') === 'cancel') {toast.success('Payment cancelled'); console.log('Payment cancelled')}
      console.log(location.search, params, responseCode, message, transactionId, action )
      if (location.search) {
        navigate(location.pathname, { replace: true });
      }
    }, [location, navigate]);

  const { data: paymentsData = {}, isLoading:isPaymentsLoading } = useQuery({
      queryKey: ['payments'],
      queryFn: () => api.getPayments({ client_id: activeClientId , order:'-created_at', limit:200}),
      enabled: !!activeClientId,
    });
    const allPayments = paymentsData?.payments ?? []

    const invoicePayments = selectedInvoice 
  ? allPayments.filter(p => p.invoice_id === selectedInvoice.id) 
  : [];

  /**const invoicePayments = useMemo(() => {
  return allPayments.filter(p => p.invoice_id === selectedInvoice?.id);
}, [allPayments, selectedInvoice?.id]);  */

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', activeClientId],
    queryFn: () => api.getInvoices({ client_id: activeClientId , order:'-created_at', limit: 50 }),
    enabled: !!activeClientId,
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices']});
      setShowPaymentDialog(false);
      setPaymentAmount('');
      toast.success('Payment recorded successfully');
    },
  });

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount); 
    const newAmountPaid = (selectedInvoice.amount_paid || 0) + amount;
    const newBalance = selectedInvoice.total_amount - newAmountPaid;
    
    const paymentHistory = [...(selectedInvoice.payment_history || []), {
      date: formatInTimeZone(new Date(),'UTC', 'yyyy-MM-dd'),
      amount,
      method: 'online',
      reference: `PAY-${Date.now()}`
    }];

    await updateInvoiceMutation.mutateAsync({
      id: selectedInvoice.id,
      data: {
        amount_paid: newAmountPaid,
        balance_due: newBalance,
        payment_history: paymentHistory,
        status: newBalance <= 0 ? 'paid' : 'partial'
      }
    });
  };

  const createPaymentSessionMutation = useMutation({
    mutationFn: (data) => api.createPaymentSession(data),
    onSuccess: (data) => {
      if(data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    },
    onError: (err) => {
      console.error(err);
      alert('Failed to start payment');
      }
      
  });
  const handlePaymentRequest = async () => {
    if (!selectedInvoice ) return;
    
    const amount = parseFloat(paymentAmount);
    const paymentInformation = await createPaymentSessionMutation.mutateAsync({ invoiceId: selectedInvoice.id });
  
  };
  

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  

  const totalInvoices = invoices.length;
  const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.balance_due || (inv.total_amount - (inv.amount_paid || 0) || 0)), 0);
  const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'partial');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  const columns = [
    {
      header: 'Invoice #',
      render: (row) => (
        <span className="font-medium text-slate-900">{row.invoice_number || `INV-${row.id?.slice(-6)}`}</span>
      )
    },
    {
      header: 'Title',
      render: (row) => (
        <p className="font-medium text-slate-900 truncate max-w-xs">{row.title}</p>
      )
    },
    {
      header: 'Amount',
      render: (row) => (
        <span className="font-semibold">${row.total_amount?.toLocaleString() || '-'}</span>
      )
    },
    {
      header: 'Balance',
      render: (row) => {
        const balance = row.balance_due ?? (row.total_amount - (row.amount_paid || 0));
        return (
          <span className={`font-semibold ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            ${balance?.toLocaleString() || '0'}
          </span>
        );
      }
    },
    {
      header: 'Due Date',
      render: (row) => row.due_date ? formatInTimeZone(new Date(row.due_date),'UTC', 'MMM d, yyyy') : '-'
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: '',
      render: (row) => (
        <div className="flex items-center gap-2">
          { row.pdf_storage_key && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-700 hover:text-green-800 hover:bg-green-50 text-xs"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await handleSecureView(e, row.pdf_storage_key, true)
          
                          } catch (error) {
                            if (error.message === "FILE_MISSING_IN_STORAGE") {
                              try {
                                await updateInvoiceMutation.mutateAsync({ id: row.id, data: { pdf_storage_key: null } });
                                const existingDoc = await api.getDs({ invoice_id: row.id });
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
          
                        }
          
                        }
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        {currentlyLoadingKey === row.pdf_storage_key? 'Authorizing Access...' :'Invoice'}
                        
                      </Button>
                    )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); setSelectedInvoice(row); }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="View and pay your invoices"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Invoices" value={totalInvoices} icon={FileText} />
        <StatsCard 
          title="Total Amount Due" 
          value={`$${totalDue.toLocaleString()}`} 
          icon={CreditCard} 
          variant={overdueInvoices.length > 0 ? 'danger' : 'primary'} 
        />
        <StatsCard title="Pending" value={pendingInvoices.length} icon={AlertCircle} variant="warning" />
        <StatsCard title="Overdue" value={overdueInvoices.length} icon={AlertCircle} variant="danger" />
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search invoices..."
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
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      {invoices.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Your invoices will appear here"
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredInvoices}
          isLoading={isLoading}
          emptyMessage="No invoices match your search"
          onRowClick={setSelectedInvoice}
        />
      )}

      {/* Invoice Details Dialog */}
      <Dialog open={!!selectedInvoice && !showPaymentDialog} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Invoice Number</p>
                  <p className="font-semibold">{selectedInvoice.invoice_number || `INV-${selectedInvoice.id?.slice(-6)}`}</p>
                </div>
                <StatusBadge status={selectedInvoice.status} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Issue Date</p>
                  <p className="font-medium">
                    {selectedInvoice.issue_date 
                      ? formatInTimeZone(new Date(selectedInvoice.issue_date),'UTC', 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Due Date</p>
                  <p className="font-medium">
                    {selectedInvoice.due_date 
                      ? formatInTimeZone(new Date(selectedInvoice.due_date),'UTC', 'MMM d, yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Items</p>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2 font-medium">Line</th>
                          <th className="text-left p-2 font-medium">Item #</th>
                          <th className="text-left p-2 font-medium">Description</th>
                          <th className="text-right p-2 font-medium">Qty</th>
                          <th className="text-left p-2 font-medium">Unit</th>
                          <th className="text-right p-2 font-medium">Unit Price</th>
                          <th className="text-right p-2 font-medium">Amount</th>
                          <th className="text-left p-2 font-medium">EZ #</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{item.line || idx + 1}</td>
                            <td className="p-2">{item.item_number || '-'}</td>
                            <td className="p-2">{item.description || '-'}</td>
                            <td className="p-2 text-right">{item.quantity || '-'}</td>
                            <td className="p-2">{item.unit || '-'}</td>
                            <td className="p-2 text-right">${item.unit_price?.toLocaleString() || '-'}</td>
                            <td className="p-2 text-right font-medium">${(item.amount || item.total)?.toLocaleString() || '-'}</td>
                            <td className="p-2">{item.ez_number || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/** View uploaded pdf if existing */}
              {selectedInvoice?.pdf_storage_key && (
                <div className={`p-4 rounded-lg border ${selectedInvoice.pdf_storage_key ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"> 
                      <FileText className={`h-4 w-4 ${selectedInvoice.pdf_storage_key ? 'text-green-600' : 'text-amber-500'}`} />
                  </div>
                  <div>
                        <p className={`text-sm font-medium ${selectedInvoice.pdf_storage_key? 'text-green-800' : 'text-amber-800'}`}>
                          Invoice
                        </p>
                        <p className={`text-xs ${selectedInvoice.pdf_storage_key? 'text-green-600' : 'text-amber-600'}`}>
                          {selectedInvoice.pdf_storage_key? 'Invoice pdf attached' : 'no pdf attached'}
                        </p>
                      </div>
                  <Button 
                        size="sm"
                        className="bg-green-700 hover:bg-green-800"
                         onClick={async (e) => {
                      try {
                        const result = await handleSecureView(e, selectedInvoice.pdf_storage_key, true)
                      } catch (error) {
                        if (error.message === "FILE_MISSING_IN_STORAGE") {
                          try {
                            await updateInvoiceMutation.mutateAsync({ id: selectedInvoice.id, data: { pdf_storage_key: null } });
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
                    <Download className="h-3 w-3 mr-1" /> {currentlyLoadingKey === selectedInvoice.pdf_storage_key ? 'Authorizing Access...' : 'Download'}
                    </Button>
                </div>
                </div>
              )
              }

              {/* Payment History */}
              {/* {selectedInvoice.payment_history && selectedInvoice.payment_history.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Payment History</p>
                  <div className="space-y-2">
                    {selectedInvoice.payment_history.map((payment, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <div>
                          <p className="font-medium text-emerald-800">{payment.reference}</p>
                          <p className="text-sm text-emerald-600">{formatInTimeZone(new Date(payment.date),'UTC', 'MMM d, yyyy')}</p>
                        </div>
                        <p className="font-semibold text-emerald-700">${payment.amountPaid?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )} */}
              {selectedInvoice && invoicePayments.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Payment History</p>
                  <div className="space-y-2">
                    {invoicePayments.payment_history.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <div>
                          <p className="font-medium text-emerald-800">{payment.reference}</p>
                          <p className="text-sm text-emerald-600">{payment.paid_at 
                ? formatInTimeZone(new Date(payment.paid_at),'UTC', 'MMM d, yyyy'): '-'}</p>
                        </div>
                        <p className="font-semibold text-emerald-700">${payment.amount?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Subtotal</p>
                  <p className="font-medium">${selectedInvoice.subtotal?.toLocaleString() || '0.00'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Sales Tax</p>
                  <p className="font-medium">${(selectedInvoice.sales_tax || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Packing</p>
                  <p className="font-medium">${(selectedInvoice.packing || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Export Declaration</p>
                  <p className="font-medium">${(selectedInvoice.export_declaration || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Customs Fees</p>
                  <p className="font-medium">${(selectedInvoice.customs_fees || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Freight</p>
                  <p className="font-medium">${(selectedInvoice.freight || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="font-semibold text-slate-900">Total</p>
                  <p className="font-bold text-slate-900">${selectedInvoice.total_amount?.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Paid</p>
                  <p className="font-medium text-emerald-600">${(selectedInvoice.amount_paid || 0).toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="font-semibold text-slate-900">Balance Due</p>
                  <p className="text-xl font-bold text-slate-900">
                    ${(selectedInvoice.balance_due ?? (selectedInvoice.total_amount - (selectedInvoice.amount_paid || 0)))?.toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedInvoice.status !== 'paid' && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowPaymentDialog(true)}
                    className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Make Payment
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Balance Due</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${(selectedInvoice.balance_due ?? (selectedInvoice.total_amount - (selectedInvoice.amount_paid || 0)))?.toLocaleString()}
                </p>
              </div>

              {selectedInvoice && selectedInvoice.sending_entity === 'Wiegand Sports Gmbh' && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900 space-y-1">
                  <p className="font-semibold text-blue-800">Payment Instructions</p>
                  {selectedInvoice.notes ? (
                    <>
                    <p>Please pay by wire transfer. Contact us if you need banking details.</p>
                    <p className="whitespace-pre-line">{selectedInvoice.notes}</p>
                    </>
                    
                  ) : selectedInvoice.pdf_url ? (
                    <p>Please refer to the <a href={selectedInvoice.pdf_url} target="_blank" rel="noopener noreferrer" className="underline font-medium">invoice PDF</a> for payment instructions.</p>
                  ) : (
                    <p>Please pay by wire transfer. Contact us if you need banking details.</p>
                  )}
                </div>
              )}
             
             {/* {selectedInvoice && selectedInvoice.sending_entity !== 'Wiegand Sports Gmbh' && (<div>
                <Label>Payment Amount</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1"
                />
              </div>)} */}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            {/* <Button 
              onClick={handlePayment}
              disabled={!paymentAmount || updateInvoiceMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {updateInvoiceMutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </Button> */}
            {selectedInvoice && selectedInvoice.sending_entity !== 'Wiegand Sports Gmbh' && (<Button 
              onClick={handlePaymentRequest}
              disabled={ createPaymentSessionMutation.isPending}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {createPaymentSessionMutation.isPending ? 'Redirecting...' : 'Confirm Payment'}
            </Button>)}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}