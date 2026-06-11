import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FileBox, File, FileText, Download, ExternalLink, FolderOpen, Upload } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { useClient } from '@/lib/ClientContext';
import { useUpload } from '@/hooks/useUpload';
import { usePrivateDocument } from '@/hooks/usePrivateDocument';
import { useAuth } from '@/lib/AuthContext';
import { usePlatformRole } from '@/hooks/usePlatfromRole';

export default function Documents() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const { uploadFileToS3, isUploading } = useUpload();
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: 'manual',
    coaster_name: '',
    equipment_model: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { activeClientId, setActiveClientId } = useClient()
  const isInternalAdmin = usePlatformRole('super_admin') || usePlatformRole('platform_admin');

  const createDocumentMutation = useMutation({
    mutationFn: (data) => api.createD(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowUploadDialog(false);
      setUploadData({
        title: '',
        description: '',
        category: 'manual',
        coaster_name: '',
        equipment_model: ''
      });
      setSelectedFile(null);
      toast.success('Document uploaded successfully');
    },
  });

  const { data: client } = useQuery({
    queryKey: ['client', activeClientId],
    queryFn: () => api.getClient(activeClientId),
    enabled: !!activeClientId,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', activeClientId],
    queryFn: async () => {
      const docs = await api.getDs({
        client_id: activeClientId,
        status: 'active',
        order: '-title',
        limit: 200
      });
      return docs;
    },
    enabled: !!user,
  });


  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.equipment_model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: 'inspection_report', label: 'Inspection Reports' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'warranty', label: 'Warranty' },
    { value: 'manual', label: 'Manuals' },
    { value: 'other', label: 'Other' },
  ];

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <FileText className="h-8 w-8 text-rose-500" />;
    if (fileType?.includes('image')) return <File className="h-8 w-8 text-blue-500" />;
    return <File className="h-8 w-8 text-slate-400" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const manuals = filteredDocuments.filter(d => d.category === 'manual');
  const invoiceDocs = filteredDocuments.filter(d => d.category === 'invoice');
  const inspectionDocs = filteredDocuments.filter(d => d.category === 'inspection_report');
  const warrantyDocs = filteredDocuments.filter(d => d.category === 'warranty');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadData.title) {
        setUploadData({ ...uploadData, title: file.name });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const file_key = await uploadFileToS3({ client_id: activeClientId, file: selectedFile, type: uploadData.category })
      await createDocumentMutation.mutateAsync({
        ...uploadData,
        coaster_name: client?.coaster_name || uploadData.coaster_name,
        file_storage_key: file_key,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        client_id: activeClientId,
        is_public: false,
        status: 'active'
      });
    } catch (error) {
      console.log(error)
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Access equipment drawings, manuals, and documentation"
        actions={
          <Button
            onClick={() => setShowUploadDialog(true)}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        }
      />

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search documents, equipment models..."
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
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Tabs defaultValue="all">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="all" className="flex-shrink-0">All ({filteredDocuments.length})</TabsTrigger>
          <TabsTrigger value="inspection" className="flex-shrink-0">🔍 Inspection Reports ({inspectionDocs.length})</TabsTrigger>
          <TabsTrigger value="invoices" className="flex-shrink-0">🧾 Invoices ({invoiceDocs.length})</TabsTrigger>
          <TabsTrigger value="warranty" className="flex-shrink-0">🛡️ Warranty ({warrantyDocs.length})</TabsTrigger>
          <TabsTrigger value="manuals" className="flex-shrink-0">📖 Manuals ({manuals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DocumentGrid documents={filteredDocuments} getFileIcon={getFileIcon} formatFileSize={formatFileSize} />
        </TabsContent>
        <TabsContent value="inspection" className="mt-4">
          <DocumentGrid documents={inspectionDocs} getFileIcon={getFileIcon} formatFileSize={formatFileSize} />
        </TabsContent>
        <TabsContent value="invoices" className="mt-4">
          <DocumentGrid documents={invoiceDocs} getFileIcon={getFileIcon} formatFileSize={formatFileSize} />
        </TabsContent>
        <TabsContent value="warranty" className="mt-4">
          <DocumentGrid documents={warrantyDocs} getFileIcon={getFileIcon} formatFileSize={formatFileSize} />
        </TabsContent>
        <TabsContent value="manuals" className="mt-4">
          <DocumentGrid documents={manuals} getFileIcon={getFileIcon} formatFileSize={formatFileSize} />
        </TabsContent>
      </Tabs>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>File</Label>
              <Input
                type="file"
                onChange={handleFileSelect}
                className="mt-1"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              {selectedFile && (
                <p className="text-sm text-slate-500 mt-1">{selectedFile.name}</p>
              )}
            </div>

            <div>
              <Label>Title</Label>
              <Input
                placeholder="Document title"
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={uploadData.category}
                onValueChange={(value) => setUploadData({ ...uploadData, category: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Equipment Model (Optional)</Label>
              <Input
                placeholder="e.g., Model X-2000"
                value={uploadData.equipment_model}
                onChange={(e) => setUploadData({ ...uploadData, equipment_model: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Brief description of the document..."
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !uploadData.title || uploading}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DocumentGrid({ documents, getFileIcon, formatFileSize }) {
  const { handleSecureView, currentlyLoadingKey } = usePrivateDocument();
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No documents found"
        description="Try adjusting your search or filters"
      />
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map(doc => (
        <Card key={doc.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-100 rounded-lg flex-shrink-0">
                {getFileIcon(doc.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-900 truncate">{doc.title}</h3>
                {doc.coaster_name && (
                  <p className="text-sm font-medium text-blue-600 mt-0.5">{doc.coaster_name}</p>
                )}
                {doc.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{doc.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Badge variant="outline" className="capitalize text-xs">
                    {doc.category?.replace(/_/g, ' ')}
                  </Badge>
                  {doc.equipment_model && (
                    <Badge variant="secondary" className="text-xs">
                      {doc.equipment_model}
                    </Badge>
                  )}
                  {doc.file_size && (
                    <span className="text-xs text-slate-400">{formatFileSize(doc.file_size)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                asChild
              >

                <a
                  href={"#view"}

                  onClick={(e) => handleSecureView(e, doc.file_storage_key)}

                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {currentlyLoadingKey === doc.file_storage_key ? 'Authorizing Access...' : 'View'}
                </a>
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-[#1e3a5f] hover:bg-[#2d5a8a]"
                asChild
              >
                <a href={"#view"}
                  onClick={(e) => handleSecureView(e, doc.file_storage_key, true)}>
                  <Download className="h-4 w-4 mr-2" />
                  {currentlyLoadingKey === doc.file_storage_key ? 'Authorizing Access...' : 'Download'}
                </a>

              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}