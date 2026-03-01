import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Trash2, Search, Tag, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function AdminMedia() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: mediaAssets, isLoading } = useQuery({
    queryKey: ['mediaAssets'],
    queryFn: () => base44.entities.MediaAsset.filter({ is_active: true }, '-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MediaAsset.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mediaAssets']);
    },
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.MediaAsset.create({
          title: file.name,
          type: file.type.startsWith('video/') ? 'video' : 'photo',
          url: file_url,
          tags: [],
          is_active: true,
        });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    queryClient.invalidateQueries(['mediaAssets']);
  };

  const filteredMedia = mediaAssets?.filter(media =>
    media.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    media.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ padding: '18px', minHeight: '100vh', background: 'rgb(248, 246, 242)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-[rgb(107,85,64)]">Media Library</CardTitle>
            <p className="text-sm text-[rgb(45,45,45)] mt-2">
              Upload and store photos/videos here. The public Spa Treatments page is intentionally image-free for speed and clarity.
              Tag media (spa, suites, courtyard, sauna, pool, yoga, soundbath) so it's easy to reuse later.
            </p>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-[rgb(235,225,213)] rounded-lg p-8 text-center bg-[rgb(248,246,242)] hover:bg-white transition-colors">
              <Upload className="w-12 h-12 mx-auto mb-4 text-[rgb(150,170,155)]" />
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="text-[rgb(107,85,64)] font-medium">
                  Drop files here or click to upload
                </span>
                <p className="text-sm text-[rgb(45,45,45)] mt-2">
                  Supports images and videos
                </p>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-[rgb(107,85,64)]">Saved Media</CardTitle>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[rgb(107,85,64)]" />
                <Input
                  placeholder="Search by title or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-[rgb(107,85,64)]">Loading media...</div>
            ) : filteredMedia?.length === 0 ? (
              <div className="text-center py-12 text-[rgb(107,85,64)]">
                {searchTerm ? 'No media found matching your search.' : 'No media uploaded yet. Upload your first file above.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredMedia?.map((media) => (
                  <div key={media.id} className="group relative">
                    <div className="aspect-square rounded-lg overflow-hidden bg-[rgb(235,225,213)] border border-[rgb(198,182,165)]">
                      {media.type === 'photo' ? (
                        <img
                          src={media.url}
                          alt={media.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={media.url}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-[rgb(107,85,64)] truncate">
                        {media.title}
                      </p>
                      {media.tags && media.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {media.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[rgb(150,170,155)] text-white text-xs rounded"
                            >
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        if (confirm('Delete this media file?')) {
                          deleteMutation.mutate(media.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}