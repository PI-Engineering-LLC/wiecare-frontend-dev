import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Edit2, FileBox, Trash2, Upload, File } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';

export default function AdminDocuments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { uploadFileToS3, isUploading } = useUpload();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'manual',
    coaster_name: '',
    client_id: '',
    file_storage_key: '',
    file_type: '',
    equipment_model: '',
    is_public: false,
    status: 'active'
  });

  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: () => api.getDs({ order: 'title',limit:500}),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['admin-clients-docs'],
    queryFn: () => api.updateClients({ order: 'company_name', limit: 200}),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createD(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents']});
      setShowDialog(false);
      resetForm();
      toast.success('Document uploaded successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateD(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents']});
      setShowDialog(false);
      resetForm();
      toast.success('Document updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteD(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents']});
      toast.success('Document deleted');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'manual',
      coaster_name: '',
      client_id: '',
      file_storage_key: '',
      file_type: '',
      equipment_model: '',
      is_public: false,
      status: 'active'
    });
    setSelectedDocument(null);
  };

  const handleEdit = (document) => {
    setSelectedDocument(document);
    setFormData({
      title: document.title || '',
      description: document.description || '',
      category: document.category || 'manual',
      coaster_name: document.coaster_name || '',
      client_id: document.client_id || '',
      file_storage_key: document.file_storage_key || '',
      file_type: document.file_type || '',
      equipment_model: document.equipment_model || '',
      is_public: document.is_public === true,
      status: document.status || 'active'
    });
    setShowDialog(true);
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      coaster_name: client?.coaster_name || prev.coaster_name,
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // // const result = await api.uploadFile({ file }); //returns {file_url}
      // const result = await api.getPresignedUploadUrl({ filename: file.name, contentType: file.type });
      // const { file_url , file_key } = result;
      // const s3Response =  await api.uploadFileToS3({ file_url: file_url, file: file });  
      // console.log('Upload successful! File stored securely in cloud bucket.');
      const file_key = await uploadFileToS3({client_id: formData?.client_id, file});
      
      setFormData(prev => ({
        ...prev,
        file_storage_key: file_key,
        file_type: file.type,
        file_size: file.size
      }));
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (selectedDocument) {
      await updateMutation.mutateAsync({ id: selectedDocument.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.equipment_model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'inspection_report', label: 'Inspection Report' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'warranty', label: 'Warranty' },
    { value: 'manual', label: 'Manual' },
    { value: 'other', label: 'Other' },
  ];

  const columns = [
    {
      header: 'Document',
      render: (row) => {
        const client = clients.find(c => c.id === row.client_id);
        return (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <File className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{row.title}</p>
              {client && <p className="text-sm text-blue-600 font-medium">{client.company_name}</p>}
              {row.coaster_name && <p className="text-xs text-slate-400">{row.coaster_name}</p>}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Category',
      render: (row) => (
        <Badge variant="outline" className="capitalize">{row.category?.replace(/_/g, ' ')}</Badge>
      )
    },
    {
      header: 'Equipment',
      render: (row) => row.equipment_model || '-'
    },
    {
      header: 'Access',
      render: (row) => (
        <Badge variant={row.is_public ? 'default' : 'secondary'} className="text-xs">
          {row.is_public ? 'Public' : 'Private'}
        </Badge>
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
        title="Documents"
        subtitle="Manage equipment drawings, manuals, and documentation"
        actions={
          <Button 
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        }
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search documents..."
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
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {documents.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileBox}
          title="No documents yet"
          description="Upload your first document"
          action={() => { resetForm(); setShowDialog(true); }}
          actionLabel="Upload Document"
        />
      ) : (
        <DataTable columns={columns} data={filteredDocuments} isLoading={isLoading} />
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDocument ? 'Edit Document' : 'Upload Document'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* File upload */}
              <div className="col-span-2">
                <Label>File *</Label>
                <div className="mt-1">
                  {formData.file_storage_key ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <File className="h-5 w-5 text-slate-600" />
                      <span className="text-sm truncate flex-1">File uploaded</span>
                      <Button variant="ghost" size="sm" onClick={() => setFormData({ ...formData, file_storage_key: '' })}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input type="file" onChange={handleFileUpload} className="hidden" id="doc-upload" disabled={uploading} />
                      <label htmlFor="doc-upload">
                        <div className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-[#1e3a5f] transition-colors">
                          <Upload className="h-5 w-5 text-slate-400" />
                          <span className="text-sm text-slate-500">
                            {uploading ? 'Uploading...' : 'Click to upload file'}
                          </span>
                        </div>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Client selector */}
              <div className="col-span-2">
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name} {c.coaster_name ? `— ${c.coaster_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Category */}
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Equipment model */}
              <div>
                <Label>Equipment Model</Label>
                <Input
                  value={formData.equipment_model}
                  onChange={(e) => setFormData({ ...formData, equipment_model: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., Model XYZ"
                />
              </div>

              {/* Description */}
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Public toggle */}
              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <Label>Also visible to all clients with same coaster</Label>
                  <p className="text-sm text-slate-500">If off, only this client can see it</p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(v) => setFormData({ ...formData, is_public: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.title || !formData.client_id || !formData.file_storage_key || uploading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : selectedDocument ? 'Update' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminOnly>
  );
}