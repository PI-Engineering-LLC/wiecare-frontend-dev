import React, { useState } from 'react';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminOnly from '@/components/AdminOnly';
import { Plus, Search, Edit2, BookOpen, Trash2, Upload, Play } from 'lucide-react';
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
import { PublicImage } from '@/components/PublicImage';

export default function AdminCourses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { uploadFileToS3, isUploading } = useUpload();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'operations',
    thumbnail_storage_key: '',
    video_storage_key: '',
    duration_minutes: 30,
    difficulty_level: 'beginner',
    is_mandatory: false,
    order_index: 0,
    status: 'draft'
  });

  const queryClient = useQueryClient();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => api.getCourses({order:'order_index', limit: 200}),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses']});
      setShowDialog(false);
      resetForm();
      toast.success('Course created successfully');
    },
  });

  const updateMutation = useMutation({
    // @ts-ignore
    mutationFn: ({ id, data }) => api.updateCourse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses']});
      setShowDialog(false);
      resetForm();
      toast.success('Course updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses']});
      toast.success('Course deleted');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'operations',
      thumbnail_storage_key: '',
      video_storage_key: '',
      duration_minutes: 30,
      difficulty_level: 'beginner',
      is_mandatory: false,
      order_index: 0,
      status: 'draft'
    });
    setSelectedCourse(null);
  };

  const handleEdit = (course) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title || '',
      description: course.description || '',
      category: course.category || 'operations',
      thumbnail_storage_key: course.thumbnail_storage_key || '',
      video_storage_key: course.video_storage_key || '',
      duration_minutes: course.duration_minutes || 30,
      difficulty_level: course.difficulty_level || 'beginner',
      is_mandatory: course.is_mandatory || false,
      order_index: course.order_index || 0,
      status: course.status || 'draft'
    });
    setShowDialog(true);
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    //Frontend validation
    if (type === 'thumbnail' && !file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    setUploading(true);
    try {
      
      if (type === 'thumbnail') {
        const file_key = await uploadFileToS3({file, type, isPrivate: false});
        setFormData(prev => ({ ...prev, thumbnail_storage_key: file_key }));
      } else {
        const file_key = await uploadFileToS3({file, type});
        setFormData(prev => ({ ...prev, video_storage_key: file_key }));
      }
      toast.success(`${type === 'thumbnail' ? 'Thumbnail' : 'Video'} uploaded`);
    } catch (error) {
      toast.error('Failed to upload file');
      setUploading(false);
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (selectedCourse) {
      await updateMutation.mutateAsync({ id: selectedCourse.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };
   const handleThumbnailError = async (courseId, error) => {
      console.log(`Retrieving theumbnail for ${courseId} failed:`, error);
      if (error.status === 404) {
        console.log("Confirmed 404: File does not exist");
    
      await updateMutation.mutateAsync({
        id: courseId,
        data: { thumbnail_storage_key: null }
      });
      toast.error("Thumbnail not found")
    }
    };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['safety', 'operations', 'maintenance', 'business', 'technical'];

  const difficultyColors = {
    beginner: 'bg-emerald-100 text-emerald-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced: 'bg-rose-100 text-rose-700'
  };

  const columns = [
    {
      header: 'Course',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-16 h-10 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
            {row.thumbnail_storage_key ? (
              <PublicImage docKey={row.thumbnail_storage_key} alt={row.title} className="w-full h-full object-cover" onError={(err) => {
                handleThumbnailError(row.id,err)
              }
              } />
            ) : (
              <BookOpen className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="capitalize text-xs">{row.category}</Badge>
              <Badge className={`${difficultyColors[row.difficulty_level]} text-xs`}>
                {row.difficulty_level}
              </Badge>
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Duration',
      render: (row) => <span>{row.duration_minutes || 0} min</span>
    },
    {
      header: 'Mandatory',
      render: (row) => row.is_mandatory ? (
        <Badge variant="destructive" className="text-xs">Yes</Badge>
      ) : (
        <span className="text-slate-400">No</span>
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
        title="Wie-University Courses"
        subtitle="Manage course content"
        actions={
          <Button 
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </Button>
        }
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search courses..."
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
                  <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {courses.length === 0 && !isLoading ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Create your first course"
          action={() => { resetForm(); setShowDialog(true); }}
          actionLabel="Add Course"
        />
      ) : (
        <DataTable columns={columns} data={filteredCourses} isLoading={isLoading} />
      )}

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowDialog(open); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCourse ? 'Edit Course' : 'Add Course'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Difficulty</Label>
                <Select value={formData.difficulty_level} onValueChange={(v) => setFormData({ ...formData, difficulty_level: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
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
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Thumbnail</Label>
                <div className="mt-1 flex items-center gap-4">
                  {formData.thumbnail_storage_key && (
                    <PublicImage docKey={formData.thumbnail_storage_key} alt="Thumbnail" className="w-24 h-16 object-cover rounded-lg" />
                  )}
                  <label
                    htmlFor="thumbnail-upload"
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium shadow-sm hover:bg-accent cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Thumbnail
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'thumbnail')} className="hidden" id="thumbnail-upload" disabled={uploading} />
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <Label>Video</Label>
                <div className="mt-1 flex items-center gap-4">
                  {formData.video_storage_key && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                      <Play className="h-4 w-4" />
                      Video ready
                    </div>
                  )}
                  <label
                    htmlFor="video-upload"
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium shadow-sm hover:bg-accent cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload Video'}
                    <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} className="hidden" id="video-upload" disabled={uploading} />
                  </label>
                </div>
                <Input
                  value={formData.video_storage_key}
                  onChange={(e) => setFormData({ ...formData, video_storage_key: e.target.value })}
                  className="mt-2"
                  placeholder="Or paste YouTube / Vimeo / direct video URL"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <div>
                  <Label>Mandatory Course</Label>
                  <p className="text-sm text-slate-500">Required for all users</p>
                </div>
                <Switch
                  checked={formData.is_mandatory}
                  onCheckedChange={(v) => setFormData({ ...formData, is_mandatory: v })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.title}
              className="bg-[#1e3a5f] hover:bg-[#2d5a8a]"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : selectedCourse ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminOnly>
  );
}