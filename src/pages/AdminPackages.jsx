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
    description: '',
    detailed_description: '',
    package_type: 'spa_only',
    room_id: '',
    room_name: '',
    number_of_nights: 0,
    included_treatments: [],
    sequence_type: 'flexible',
    schedule_notes: '',
    total_price: 0,
    savings: 0,
    image_url: '',
    is_available: true
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
    queryFn: () => base44.entities.SpaPackage.list(),
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
    mutationFn: (data) => base44.entities.SpaPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      queryClient.invalidateQueries(['packages']);
      setIsFormOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SpaPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      queryClient.invalidateQueries(['packages']);
      setIsFormOpen(false);
      setEditingPackage(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SpaPackage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      queryClient.invalidateQueries(['packages']);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      detailed_description: '',
      package_type: 'spa_only',
      room_id: '',
      room_name: '',
      number_of_nights: 0,
      included_treatments: [],
      sequence_type: 'flexible',
      schedule_notes: '',
      total_price: 0,
      savings: 0,
      image_url: '',
      is_available: true
    });
  };

  const handleEdit = (pkg) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name || '',
      description: pkg.description || '',
      detailed_description: pkg.detailed_description || '',
      package_type: pkg.package_type || 'spa_only',
      room_id: pkg.room_id || '',
      room_name: pkg.room_name || '',
      number_of_nights: pkg.number_of_nights || 0,
      included_treatments: pkg.included_treatments || [],
      sequence_type: pkg.sequence_type || 'flexible',
      schedule_notes: pkg.schedule_notes || '',
      total_price: pkg.total_price || 0,
      savings: pkg.savings || 0,
      image_url: pkg.image_url || '',
      is_available: pkg.is_available !== false
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
              <p className="text-sm text-[rgb(45,45,45)]">Manage spa packages & room+spa bundles</p>
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
                  <div className="flex-1">
                    <p className="text-xs text-[rgb(150,170,155)] mb-1">
                      {pkg.package_type === 'room_and_spa' ? '🏨 Room + Spa Bundle' : '💆 Spa Only'}
                    </p>
                    <h3 className="font-medium text-[rgb(107,85,64)]">{pkg.name}</h3>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${pkg.is_available ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <p className="text-lg text-[rgb(107,85,64)] mb-2">${pkg.total_price}</p>
                {pkg.savings > 0 && (
                  <p className="text-sm text-[rgb(150,170,155)]">Save ${pkg.savings}</p>
                )}
                <div className="text-sm text-[rgb(45,45,45)] mt-2 mb-3">
                  {pkg.package_type === 'room_and_spa' && pkg.room_name && (
                    <p className="mb-1 font-medium">{pkg.room_name} • {pkg.number_of_nights} nights</p>
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
              <Label>Package Type *</Label>
              <Select 
                value={formData.package_type} 
                onValueChange={(val) => setFormData({...formData, package_type: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spa_only">Spa Treatments Only</SelectItem>
                  <SelectItem value="room_and_spa">Room + Spa Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.package_type === 'room_and_spa' && (
              <>
                <div>
                  <Label>Select Room/Suite *</Label>
                  <Select 
                    value={formData.room_id} 
                    onValueChange={(val) => {
                      const suite = suites?.find(s => s.id === val);
                      setFormData({
                        ...formData, 
                        room_id: val,
                        room_name: suite?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suites?.map(suite => (
                        <SelectItem key={suite.id} value={suite.id}>
                          {suite.name} - ${suite.price_per_night}/night
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Number of Nights *</Label>
                  <Input
                    type="number"
                    value={formData.number_of_nights}
                    onChange={(e) => setFormData({...formData, number_of_nights: parseInt(e.target.value) || 0})}
                    min="1"
                    placeholder="2"
                  />
                </div>
              </>
            )}

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
              <Label>Short Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="A complete renewal experience..."
                rows={2}
              />
            </div>

            <div>
              <Label>Detailed Description</Label>
              <Textarea
                value={formData.detailed_description}
                onChange={(e) => setFormData({...formData, detailed_description: e.target.value})}
                placeholder="Full description of the package experience..."
                rows={4}
              />
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
                <Label>Sequence Type</Label>
                <Select 
                  value={formData.sequence_type} 
                  onValueChange={(val) => setFormData({...formData, sequence_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible (guest chooses)</SelectItem>
                    <SelectItem value="fixed">Fixed (pre-scheduled)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule Notes</Label>
                <Input
                  value={formData.schedule_notes}
                  onChange={(e) => setFormData({...formData, schedule_notes: e.target.value})}
                  placeholder="Spread across 2 days..."
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Total Price *</Label>
                <Input
                  type="number"
                  value={formData.total_price}
                  onChange={(e) => setFormData({...formData, total_price: parseFloat(e.target.value)})}
                  min="0"
                  required
                />
              </div>
              <div>
                <Label>Savings (vs individual)</Label>
                <Input
                  type="number"
                  value={formData.savings}
                  onChange={(e) => setFormData({...formData, savings: parseFloat(e.target.value)})}
                  min="0"
                />
              </div>
            </div>

            <ImageSelector
              label="Package Image"
              value={formData.image_url}
              onChange={(url) => setFormData({...formData, image_url: url})}
            />

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({...formData, is_available: checked})}
              />
              <Label>Available for booking</Label>
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