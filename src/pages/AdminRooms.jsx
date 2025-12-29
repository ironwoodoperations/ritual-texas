import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Leaf, ArrowLeft, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function AdminRooms() {
  const [user, setUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    detailed_description: '',
    best_for: '',
    max_occupancy: 2,
    price_per_night: 0,
    amenities: [],
    images: [],
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
        base44.auth.redirectToLogin(createPageUrl('AdminRooms'));
      }
    };
    loadUser();
  }, []);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['admin-rooms'],
    queryFn: () => base44.entities.Room.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Room.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-rooms']);
      queryClient.invalidateQueries(['rooms']);
      setIsFormOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Room.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-rooms']);
      queryClient.invalidateQueries(['rooms']);
      setIsFormOpen(false);
      setEditingRoom(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Room.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-rooms']);
      queryClient.invalidateQueries(['rooms']);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      detailed_description: '',
      best_for: '',
      max_occupancy: 2,
      price_per_night: 0,
      amenities: [],
      images: [],
      is_available: true
    });
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name || '',
      description: room.description || '',
      detailed_description: room.detailed_description || '',
      best_for: room.best_for || '',
      max_occupancy: room.max_occupancy || 2,
      price_per_night: room.price_per_night || 0,
      amenities: room.amenities || [],
      images: room.images || [],
      is_available: room.is_available !== false
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAddAmenity = () => {
    setFormData({
      ...formData,
      amenities: [...formData.amenities, '']
    });
  };

  const handleAmenityChange = (index, value) => {
    const newAmenities = [...formData.amenities];
    newAmenities[index] = value;
    setFormData({ ...formData, amenities: newAmenities });
  };

  const handleRemoveAmenity = (index) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter((_, i) => i !== index)
    });
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
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Rooms & Suites</h1>
              <p className="text-sm text-[rgb(45,45,45)]">Manage room inventory</p>
            </div>
          </div>
          <Button 
            onClick={() => { resetForm(); setEditingRoom(null); setIsFormOpen(true); }}
            className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)]"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Room
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms?.map(room => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[rgb(235,225,213)]"
            >
              <img 
                src={room.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80'}
                alt={room.name}
                className="w-full aspect-video object-cover"
              />
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-[rgb(107,85,64)]">{room.name}</h3>
                    <p className="text-lg text-[rgb(107,85,64)]">${room.price_per_night}/night</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${room.is_available ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <p className="text-sm text-[rgb(45,45,45)] mb-3 line-clamp-2">{room.description}</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(room)}
                    className="flex-1"
                  >
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => deleteMutation.mutate(room.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {rooms?.length === 0 && (
          <div className="text-center py-16 bg-white border border-[rgb(235,225,213)]">
            <p className="text-[rgb(45,45,45)]">No rooms yet. Add your first room to get started.</p>
          </div>
        )}
      </main>

      {/* Room Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgb(248,246,242)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-[rgb(107,85,64)]">
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Room Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="The Garden Suite"
                  required
                />
              </div>
              <div>
                <Label>Price per Night *</Label>
                <Input
                  type="number"
                  value={formData.price_per_night}
                  onChange={(e) => setFormData({...formData, price_per_night: parseFloat(e.target.value)})}
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Short Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="A peaceful retreat overlooking the garden..."
                rows={2}
              />
            </div>

            <div>
              <Label>Detailed Description</Label>
              <Textarea
                value={formData.detailed_description}
                onChange={(e) => setFormData({...formData, detailed_description: e.target.value})}
                placeholder="Full description of the room, what's included..."
                rows={4}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Best For</Label>
                <Input
                  value={formData.best_for}
                  onChange={(e) => setFormData({...formData, best_for: e.target.value})}
                  placeholder="Couples, solo travelers..."
                />
              </div>
              <div>
                <Label>Max Occupancy</Label>
                <Input
                  type="number"
                  value={formData.max_occupancy}
                  onChange={(e) => setFormData({...formData, max_occupancy: parseInt(e.target.value)})}
                  min="1"
                  max="10"
                />
              </div>
            </div>

            <div>
              <Label>Image URLs (one per line)</Label>
              <Textarea
                value={formData.images?.join('\n')}
                onChange={(e) => setFormData({...formData, images: e.target.value.split('\n').filter(Boolean)})}
                placeholder="https://..."
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Amenities</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddAmenity}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {formData.amenities.map((amenity, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={amenity}
                      onChange={(e) => handleAmenityChange(i, e.target.value)}
                      placeholder="Sauna access, King bed..."
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveAmenity(i)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

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
                {editingRoom ? 'Save Changes' : 'Create Room'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}