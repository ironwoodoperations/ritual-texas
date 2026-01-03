import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, X, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ImageSelector({ value, onChange, label = "Image" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: images } = useQuery({
    queryKey: ['images'],
    queryFn: () => base44.entities.ImageAsset.filter({ is_active: true }, 'sort_order'),
  });

  const filteredImages = images?.filter(img => 
    img.name.toLowerCase().includes(search.toLowerCase()) ||
    img.placement_key?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedImage = images?.find(img => img.url === value);

  return (
    <div>
      <label className="text-sm text-[rgb(45,45,45)] block mb-2">{label}</label>
      
      <div className="flex gap-2">
        <div 
          onClick={() => setOpen(true)}
          className="flex-1 border border-[rgb(235,225,213)] p-2 cursor-pointer hover:border-[rgb(198,182,165)] transition-colors"
        >
          {value ? (
            <div className="flex items-center gap-3">
              <img src={value} alt="Selected" className="w-16 h-16 object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[rgb(107,85,64)] truncate">
                  {selectedImage?.name || 'Selected image'}
                </p>
                <p className="text-xs text-[rgb(45,45,45)] truncate">{value}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[rgb(198,182,165)] py-2">
              <ImageIcon className="w-5 h-5" />
              <span className="text-sm">Click to select image</span>
            </div>
          )}
        </div>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onChange('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-[rgb(248,246,242)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-[rgb(107,85,64)]">
              Select Image from Library
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Search images..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-[rgb(235,225,213)]"
            />

            <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredImages?.map((image) => (
                <div
                  key={image.id}
                  onClick={() => {
                    onChange(image.url);
                    setOpen(false);
                  }}
                  className={`cursor-pointer border-2 transition-all ${
                    value === image.url
                      ? 'border-[rgb(150,170,155)]'
                      : 'border-[rgb(235,225,213)] hover:border-[rgb(198,182,165)]'
                  }`}
                >
                  <div className="relative aspect-square bg-[rgb(235,225,213)]">
                    <img 
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                    {value === image.url && (
                      <div className="absolute top-2 right-2 bg-[rgb(150,170,155)] text-white p-1 rounded-full">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium text-[rgb(107,85,64)] truncate">
                      {image.name}
                    </p>
                    {image.placement_key && (
                      <p className="text-xs text-[rgb(150,170,155)] truncate">
                        {image.placement_key}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {filteredImages?.length === 0 && (
                <div className="col-span-3 text-center py-8 text-[rgb(45,45,45)]">
                  No images found
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}