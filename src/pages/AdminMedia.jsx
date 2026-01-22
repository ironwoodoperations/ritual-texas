import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, Image, Video, Trash2, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminMedia() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newMedia, setNewMedia] = useState({
    title: '',
    type: 'photo',
    url: '',
    tags: '',
    notes: ''
  });
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: mediaAssets, isLoading } = useQuery({
    queryKey: ['mediaAssets'],
    queryFn: () => base44.entities.MediaAsset.filter({ is_active: true }, '-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MediaAsset.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaAssets'] });
      setUploadDialogOpen(false);
      setNewMedia({ title: '', type: 'photo', url: '', tags: '', notes: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaAsset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mediaAssets'] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewMedia(prev => ({ ...prev, url: file_url }));
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = () => {
    const tags = newMedia.tags.split(',').map(t => t.trim()).filter(Boolean);
    createMutation.mutate({
      ...newMedia,
      tags,
    });
  };

  const filteredMedia = mediaAssets?.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-[rgb(107,85,64)]">Media Library</h1>
            <p className="text-[rgb(45,45,45)] mt-2">
              Upload and manage all images and videos for the site
            </p>
          </div>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)]">
                <Upload className="w-4 h-4 mr-2" />
                Upload Media
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload New Media</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Upload File</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="w-full"
                  />
                  {uploading && <p className="text-sm text-[rgb(150,170,155)] mt-2">Uploading...</p>}
                  {newMedia.url && (
                    <p className="text-xs text-green-600 mt-2 break-all">✓ File uploaded</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    value={newMedia.title}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Spa Room Interior"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={newMedia.type} onValueChange={(value) => setNewMedia(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tags (comma-separated)</label>
                  <Input
                    value={newMedia.tags}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="spa, massage, interior"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <Textarea
                    value={newMedia.notes}
                    onChange={(e) => setNewMedia(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Internal notes..."
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={!newMedia.url || !newMedia.title || createMutation.isPending}
                  className="w-full bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)]"
                >
                  Save Media
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(107,85,64)]" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or tags..."
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="photo">Photos</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Media Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <p className="text-[rgb(107,85,64)]">Loading media...</p>
          </div>
        ) : filteredMedia?.length === 0 ? (
          <div className="text-center py-20">
            <Upload className="w-16 h-16 mx-auto text-[rgb(198,182,165)] mb-4" />
            <p className="text-[rgb(107,85,64)] text-lg">No media found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedia?.map((media) => (
              <Card key={media.id} className="overflow-hidden">
                <div className="relative aspect-video bg-[rgb(235,225,213)]">
                  {media.type === 'photo' ? (
                    <img src={media.url} alt={media.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Video className="w-12 h-12 text-[rgb(107,85,64)]" />
                    </div>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(media.id)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg font-light flex items-center gap-2">
                    {media.type === 'photo' ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    {media.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {media.tags && media.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {media.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {media.notes && (
                    <p className="text-sm text-[rgb(45,45,45)] line-clamp-2">{media.notes}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-[rgb(235,225,213)]">
                    <input
                      type="text"
                      value={media.url}
                      readOnly
                      onClick={(e) => e.target.select()}
                      className="w-full text-xs p-2 bg-[rgb(248,246,242)] border border-[rgb(235,225,213)] rounded"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}