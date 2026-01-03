import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Upload, Trash2, Edit2, Image as ImageIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function AdminImages() {
  const [user, setUser] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({ current: 0, total: 0 });
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    placement_key: '',
    sort_order: 0,
    width: null,
    height: null,
    is_active: true,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') {
          window.location.href = createPageUrl('Home');
        }
      } catch (e) {
        window.location.href = createPageUrl('Home');
      }
    };
    checkAuth();
  }, []);

  const { data: images } = useQuery({
    queryKey: ['images'],
    queryFn: () => base44.entities.ImageAsset.list('sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ImageAsset.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['images']);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ImageAsset.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['images']);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ImageAsset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['images']);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      description: '',
      placement_key: '',
      sort_order: 0,
      width: null,
      height: null,
      is_active: true,
    });
    setShowUpload(false);
    setEditingImage(null);
  };

  const handleEdit = (image) => {
    setEditingImage(image);
    setFormData({
      name: image.name || '',
      url: image.url || '',
      description: image.description || '',
      placement_key: image.placement_key || '',
      sort_order: image.sort_order || 0,
      width: image.width || null,
      height: image.height || null,
      is_active: image.is_active ?? true,
    });
    setShowUpload(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, url: result.file_url });

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setFormData(prev => ({
          ...prev,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }));
      };
      img.src = result.file_url;
    } catch (error) {
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.url) {
      alert('Name and image URL are required');
      return;
    }

    if (editingImage) {
      updateMutation.mutate({ id: editingImage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setBulkUploadProgress({ current: 0, total: files.length });
    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setBulkUploadProgress({ current: i + 1, total: files.length });

      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        
        // Get dimensions
        const img = new Image();
        const dimensions = await new Promise((resolve) => {
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: null, height: null });
          img.src = result.file_url;
        });

        uploadedImages.push({
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: result.file_url,
          width: dimensions.width,
          height: dimensions.height,
          sort_order: i,
          is_active: true,
        });
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    // Bulk create all images
    if (uploadedImages.length > 0) {
      try {
        await base44.entities.ImageAsset.bulkCreate(uploadedImages);
        queryClient.invalidateQueries(['images']);
        setShowBulkUpload(false);
        setBulkUploadProgress({ current: 0, total: 0 });
      } catch (error) {
        alert('Failed to save images to database');
      }
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(107,85,64)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)] py-8 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              to={createPageUrl('AdminDashboard')}
              className="text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-extralight text-[rgb(107,85,64)]">Image Library</h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowBulkUpload(true)}
              variant="outline"
              className="text-[rgb(107,85,64)]"
            >
              Bulk Upload
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setShowUpload(true);
              }}
              className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>
          </div>
        </div>

        {/* Images Grid */}
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images?.map((image) => (
            <div key={image.id} className="bg-white border border-[rgb(235,225,213)] group">
              <div className="relative aspect-square overflow-hidden bg-[rgb(235,225,213)]">
                <img 
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                {!image.is_active && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1">
                    Inactive
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium text-[rgb(107,85,64)] mb-1 truncate">{image.name}</h3>
                {image.placement_key && (
                  <p className="text-xs text-[rgb(150,170,155)] mb-2">
                    Placed: {image.placement_key}
                  </p>
                )}
                {image.description && (
                  <p className="text-sm text-[rgb(45,45,45)] mb-3 line-clamp-2">
                    {image.description}
                  </p>
                )}
                {image.width && image.height && (
                  <p className="text-xs text-[rgb(45,45,45)] mb-3">
                    {image.width} × {image.height}px
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(image)}
                    className="flex-1"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Delete this image?')) {
                        deleteMutation.mutate(image.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {images?.length === 0 && (
            <div className="col-span-full text-center py-20">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-[rgb(198,182,165)]" />
              <p className="text-[rgb(107,85,64)]">No images yet. Upload your first one!</p>
            </div>
          )}
        </div>

        {/* Upload/Edit Dialog */}
        <Dialog open={showUpload} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl bg-[rgb(248,246,242)]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-light text-[rgb(107,85,64)]">
                {editingImage ? 'Edit Image' : 'Upload New Image'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* File Upload */}
              {!editingImage && (
                <div>
                  <Label>Upload Image</Label>
                  <div className="mt-2 border-2 border-dashed border-[rgb(235,225,213)] p-8 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                      id="image-upload"
                    />
                    <label 
                      htmlFor="image-upload"
                      className="cursor-pointer"
                    >
                      {uploading ? (
                        <div className="text-[rgb(107,85,64)]">Uploading...</div>
                      ) : formData.url ? (
                        <div>
                          <img 
                            src={formData.url} 
                            alt="Preview"
                            className="max-h-48 mx-auto mb-2"
                          />
                          <p className="text-sm text-[rgb(150,170,155)]">Click to change</p>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-[rgb(198,182,165)]" />
                          <p className="text-[rgb(107,85,64)]">Click to upload image</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Preview for editing */}
              {editingImage && formData.url && (
                <div>
                  <Label>Current Image</Label>
                  <img 
                    src={formData.url} 
                    alt={formData.name}
                    className="w-full max-h-64 object-contain mt-2 border border-[rgb(235,225,213)]"
                  />
                </div>
              )}

              {/* Name */}
              <div>
                <Label>Image Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Homepage Hero, Suite 1 Bathroom"
                  className="mt-2"
                />
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes about this image"
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Placement Key */}
              <div>
                <Label>Placement Key</Label>
                <Input
                  value={formData.placement_key}
                  onChange={(e) => setFormData({ ...formData, placement_key: e.target.value })}
                  placeholder="e.g., home.hero, packages.header (optional)"
                  className="mt-2"
                />
                <p className="text-xs text-[rgb(45,45,45)] mt-1">
                  Use a key to identify where this image should appear
                </p>
              </div>

              {/* Sort Order */}
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>

              {/* Dimensions (read-only) */}
              {(formData.width || formData.height) && (
                <div>
                  <Label>Dimensions</Label>
                  <p className="text-sm text-[rgb(45,45,45)] mt-2">
                    {formData.width} × {formData.height}px
                  </p>
                </div>
              )}

              {/* Active Status */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.url || createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
                >
                  {editingImage ? 'Update' : 'Upload'} Image
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={showBulkUpload} onOpenChange={(open) => !open && setShowBulkUpload(false)}>
          <DialogContent className="max-w-xl bg-[rgb(248,246,242)]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-light text-[rgb(107,85,64)]">
                Bulk Upload Images
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {bulkUploadProgress.total > 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 border-4 border-[rgb(235,225,213)] border-t-[rgb(150,170,155)] rounded-full animate-spin" />
                  <p className="text-[rgb(107,85,64)]">
                    Uploading {bulkUploadProgress.current} of {bulkUploadProgress.total}...
                  </p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-dashed border-[rgb(235,225,213)] p-12 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleBulkUpload}
                      className="hidden"
                      id="bulk-upload"
                    />
                    <label htmlFor="bulk-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-[rgb(198,182,165)]" />
                      <p className="text-[rgb(107,85,64)] mb-2">Click to select multiple images</p>
                      <p className="text-sm text-[rgb(45,45,45)]">
                        All images will be uploaded and saved automatically
                      </p>
                    </label>
                  </div>
                  <p className="text-xs text-[rgb(45,45,45)] text-center">
                    Images will be named based on their filename. You can edit details later.
                  </p>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}