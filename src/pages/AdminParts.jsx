import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Edit2, Package, Trash2, Upload, Sparkles } from 'lucide-react';
import { getItemsLookup, lookupItem } from '@/components/shared/ItemsLookup';
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
import ImportPartsDialog from '@/components/parts/ImportPartsDialog';
import { toast } from 'sonner';
import { useUpload } from '@/hooks/useUpload';
import { PublicImage } from '@/components/PublicImage';

export default function AdminParts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const { uploadFileToS3, isUploading } = useUpload();
  const [formData, setFormData] = useState({
    part_number: '',
    ez_number: '',
    name: '',
    description: '',
    category: 'general',
    unit_price: 0,
    stock_quantity: 0,
    min_stock_level: 5,
    image_storage_key: '',
    specifications: '',
    is_critical: false,
    status: 'active'
  });

  const [itemsLookup, setItemsLookup] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const lookupRef = useRef(null);

  const queryClient = useQueryClient();

  // Load the CSV lookup once
  useEffect(() => {
    getItemsLookup().then(lookup => {
      setItemsLookup(lookup);
      lookupRef.current = lookup;
    });
  }, []);

  // Auto-populate when part_number changes
  const handlePartNumberChange = (value) => {
    setFormData(prev => ({ ...prev, part_number: value }));
    if (!value.trim() || !lookupRef.current) return;
    const match = lookupItem(lookupRef.current, value.trim());
    if (match) {
      setFormData(prev => ({
        ...prev,
        part_number: value,
        name: match.name || prev.name,
        description: match.description || prev.description,
        unit_price: match.base_price > 0 ? match.base_price : prev.unit_price,
      }));
    }
  };

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ['admin-parts'],
    queryFn: () => api.getParts({ parms: { order:'name', limit: 500}}),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createParts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-parts']});
      setShowDialog(false);
      resetForm();
      toast.success('Part created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updatePart(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-parts']});
      setShowDialog(false);
      resetForm();
      toast.success('Part updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deletePart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-parts']});
      toast.success('Part deleted');
    },
  });

  const resetForm = () => {
    setFormData({
      part_number: '',
      ez_number: '',
      name: '',
      description: '',
      category: 'general',
      unit_price: 0,
      stock_quantity: 0,
      min_stock_level: 5,
      image_storage_key: '',
      specifications: '',
      is_critical: false,
      status: 'active'
    });
    setSelectedPart(null);
  };

  const handleEdit = (part) => {
    setSelectedPart(part);
    setFormData({
      part_number: part.part_number || '',
      ez_number: part.ez_number || '',
      name: part.name || '',
      description: part.description || '',
      category: part.category || 'general',
      unit_price: part.unit_price || 0,
      stock_quantity: part.stock_quantity || 0,
      min_stock_level: part.min_stock_level || 5,
      image_storage_key: part.image_storage_key || '',
      specifications: part.specifications || '',
      is_critical: part.is_critical || false,
      status: part.status || 'active'
    });
    setShowDialog(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const file_key = await uploadFileToS3({file, type:'parts'});      
      setFormData(prev => ({ ...prev, image_storage_key: file_key }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (selectedPart) {
      await updateMutation.mutateAsync({ id: selectedPart.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const filteredParts = parts.filter(part => {
    const matchesSearch = part.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.part_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || part.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['brakes', 'wheels', 'seats', 'safety', 'electronics', 'hydraulics', 'structural', 'accessories', 'general', 'critical'];

  const columns = [
    {
      header: 'Part',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
            {row.image_storage_key ? (
              <PublicImage docKey={row.image_storage_key} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            <p className="text-sm text-slate-500">{row.part_number}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      render: (row) => (
        <Badge variant="outline" className="capitalize">{row.category?.replace(/_/g, ' ')}</Badge>
      )
    },
    {
      header: 'Price',
      render: (row) => <span className="font-semibold">${row.unit_price?.toLocaleString()}</span>
    },
    {
      header: 'Stock',
      render: (row) => {
        const isLow = (row.stock_quantity || 0) < (row.min_stock_level || 5);
        return (
          <span className={`font-medium ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
            {row.stock_quantity || 0}
          </span>
        );
      }
    },
    {
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.is_critical && <Badge variant="destructive" className="text-xs">Critical</Badge>}
          <StatusBadge status={row.status} />
        </div>
      )
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
        title="Parts Catalog"
        subtitle="Manage spare parts inventory"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button 
              onClick={() => { resetForm(); setShowDialog(true); }}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Part
            </Button>
          </div>
        }
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search parts..."
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
                  <SelectItem key={cat} value={cat} className="capitalize">{cat.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {parts.length === 0 && !isLoading ? (
        <EmptyState
          icon={Package}
          title="No parts yet"
          description="Add your first part to the catalog"
          action={() => { resetForm(); setShowDialog(true); }}
          actionLabel="Add Part"
        />
      ) : (
        <DataTable columns={columns} data={filteredParts} isLoading={isLoading} />
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPart ? 'Edit Part' : 'Add New Part'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Part Number / Item ID *</Label>
                <div className="relative mt-1">
                  <Input
                    value={formData.part_number}
                    onChange={(e) => handlePartNumberChange(e.target.value)}
                    placeholder="e.g. 18360000"
                  />
                  {itemsLookup && lookupItem(itemsLookup, formData.part_number) && (
                    <Sparkles className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" title="Auto-filled from catalog" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">Enter Item ID or EZ Number to auto-fill</p>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>EZ Number</Label>
                <div className="relative mt-1">
                  <Input
                    value={formData.ez_number || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, ez_number: val }));
                      if (!val.trim() || !lookupRef.current) return;
                      const match = lookupItem(lookupRef.current, val.trim());
                      if (match) {
                        setFormData(prev => ({
                          ...prev,
                          ez_number: val,
                          part_number: prev.part_number || match.item_id,
                          name: match.name || prev.name,
                          description: match.description || prev.description,
                          unit_price: match.base_price > 0 ? match.base_price : prev.unit_price,
                        }));
                      }
                    }}
                    placeholder="e.g. 65055"
                  />
                  {itemsLookup && lookupItem(itemsLookup, formData.ez_number) && (
                    <Sparkles className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <div>
                <Label>Unit Price (€) *</Label>
                <Input
                  type="number"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Stock Quantity</Label>
                <Input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Min Stock Level</Label>
                <Input
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Image</Label>
                <div className="mt-1 flex items-center gap-4">
                  {formData.image_storage_key && (
                    <PublicImage docKey={formData.image_storage_key} alt="Part" className="w-20 h-20 object-cover rounded-lg" />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="part-image" disabled={uploading} />
                  <label htmlFor="part-image">
                    <Button variant="outline" size="sm" disabled={uploading} asChild>
                      <span className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Image'}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <Label>Specifications</Label>
                <Textarea
                  value={formData.specifications}
                  onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                  className="mt-1"
                  rows={2}
                  placeholder="Technical specifications..."
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <Label>Critical Part</Label>
                  <p className="text-sm text-slate-500">Mark as critical safety component</p>
                </div>
                <Switch
                  checked={formData.is_critical}
                  onCheckedChange={(v) => setFormData({ ...formData, is_critical: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.part_number || !formData.name}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : selectedPart ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
      <ImportPartsDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['admin-parts']})}
      />
    </AdminOnly>
  );
}