import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, ArrowLeft, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ImageSelector from '@/components/ImageSelector';

export default function AdminPackages() {
  const [user, setUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    includes_room: false,
    room_nights: 1,
    room_type_description: '',
    included_treatments: [],
    price_from_usd: 0,
    price_unit: 'all inclusive',
    image_url: '',
    sort_order: 0,
    is_active: true
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') {
          window.location.href = createPageUrl('Home');
        }
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('AdminPackages'));
      }
    };
    loadUser();
  }, []);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => base44.entities.Package.list(),
  });

  const { data: treatments } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => base44.entities.Treatment.list(),
  });

  const { data: suites } = useQuery({
    queryKey: ['suites'],
    queryFn: () => base44.entities.Suite.list('sort_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return base44.entities.Package.create({ ...data, slug });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      queryClient.invalidateQueries(['packages']);
      setIsFormOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Package.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      queryClient.invalidateQueries(['packages']);
      setIsFormOpen(false);
      setEditingPackage(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Package.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      queryClient.invalidateQueries(['packages']);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      includes_room: false,
      room_nights: 1,
      room_type_description: '',
      included_treatments: [],
      price_from_usd: 0,
      price_unit: 'all inclusive',
      image_url: '',
      sort_order: 0,
      is_active: true
    });
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name || '',
      slug: pkg.slug || '',
      description: pkg.description || '',
      includes_room: pkg.includes_room || false,
      room_nights: pkg.room_nights || 1,
      room_type_description: pkg.room_type_description || '',
      included_treatments: pkg.included_treatments || [],
      price_from_usd: pkg.price_from_usd || 0,
      price_unit: pkg.price_unit || 'all inclusive',
      image_url: pkg.image_url || '',
      sort_order: pkg.sort_order || 0,
      is_active: pkg.is_active !== false
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleTreatment = (treatmentId) => {
    const current = formData.included_treatments || [];
    if (current.includes(treatmentId)) {
      setFormData({
        ...formData,
        included_treatments: current.filter(id => id !== treatmentId)
      });
    } else {
      setFormData({
        ...formData,
        included_treatments: [...current, treatmentId]
      });
    }
  };

  const getTreatmentName = (id) => {
    return treatments?.find(t => t.id === id)?.name || 'Treatment';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      {/* Header */}
      <header className="bg-white border-b border-[rgb(235,225,213)] px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('AdminDashboard')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Packages</h1>
              <p className="text-sm text-[rgb(45,45,45)]">Manage spa packages</p>
            </div>
          </div>
          <Button 
            onClick={() => { resetForm(); setEditingPackage(null); setIsFormOpen(true); }}
            className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)]"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Package
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages?.map(pkg => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[rgb(235,225,213)]"
            >
              <img 
                src={pkg.image_url || 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=80'}
                alt={pkg.name}
                className="w-full aspect-video object-cover"
              />
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-[rgb(107,85,64)]">{pkg.name}</h3>
                  <div className={`w-3 h-3 rounded-full ${pkg.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <p className="text-lg text-[rgb(107,85,64)] mb-2">
                  {pkg.price_from_usd ? `From $${pkg.price_from_usd}` : 'Custom pricing'}
                </p>
                <div className="text-sm text-[rgb(45,45,45)] space-y-1 mb-3">
                  {pkg.includes_room && (
                    <p className="text-[rgb(150,170,155)]">✓ Includes {pkg.room_nights || 1} night{pkg.room_nights > 1 ? 's' : ''}</p>
                  )}
                  <p>{pkg.included_treatments?.length || 0} treatments included</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(pkg)}
                    className="flex-1"
                  >
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteMutation.mutate(pkg.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {packages?.length === 0 && (
          <div className="text-center py-16 bg-white border border-[rgb(235,225,213)]">
            <p className="text-[rgb(45,45,45)]">No packages yet. Add your first package to get started.</p>
          </div>
        )}
      </main>

      {/* Package Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgb(248,246,242)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-[rgb(107,85,64)]">
              {editingPackage ? 'Edit Package' : 'Add New Package'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Package Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Restoration Weekend"
                required
              />
            </div>

            <div>
              <Label>Package Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="A complete renewal experience with room and treatments..."
                rows={4}
                required
              />
            </div>

            {/* Room Section */}
            <div className="border border-[rgb(235,225,213)] p-4 bg-white space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.includes_room}
                  onCheckedChange={(checked) => setFormData({...formData, includes_room: checked})}
                />
                <Label>This package includes a room stay</Label>
              </div>

              {formData.includes_room && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Number of Nights</Label>
                      <Input
                        type="number"
                        value={formData.room_nights}
                        onChange={(e) => setFormData({...formData, room_nights: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>
                    <div>
                      <Label>Room Type</Label>
                      <Input
                        value={formData.room_type_description}
                        onChange={(e) => setFormData({...formData, room_type_description: e.target.value})}
                        placeholder="Any suite, Suite 1-4 only, etc."
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <Label className="mb-3 block">Included Treatments</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-[rgb(235,225,213)] p-3 bg-white">
                {treatments?.map(treatment => (
                  <div 
                    key={treatment.id} 
                    className="flex items-center gap-3 p-2 hover:bg-[rgb(248,246,242)] cursor-pointer"
                    onClick={() => toggleTreatment(treatment.id)}
                  >
                    <Checkbox 
                      checked={formData.included_treatments?.includes(treatment.id)}
                      onCheckedChange={() => toggleTreatment(treatment.id)}
                    />
                    <span className="text-sm text-[rgb(45,45,45)]">{treatment.name}</span>
                    <span className="text-xs text-[rgb(107,85,64)] ml-auto">${treatment.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Starting Price (USD)</Label>
                <Input
                  type="number"
                  value={formData.price_from_usd}
                  onChange={(e) => setFormData({...formData, price_from_usd: parseFloat(e.target.value)})}
                  min="0"
                  placeholder="Leave blank for custom pricing"
                />
              </div>
              <div>
                <Label>Price Unit</Label>
                <Select 
                  value={formData.price_unit} 
                  onValueChange={(val) => setFormData({...formData, price_unit: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all inclusive">All Inclusive</SelectItem>
                    <SelectItem value="per person">Per Person</SelectItem>
                    <SelectItem value="per night">Per Night</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value)})}
                min="0"
              />
            </div>

            <ImageSelector
              label="Package Image"
              value={formData.image_url}
              onChange={(url) => setFormData({...formData, image_url: url})}
            />

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label>Active (visible on website)</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)]"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingPackage ? 'Save Changes' : 'Create Package'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}