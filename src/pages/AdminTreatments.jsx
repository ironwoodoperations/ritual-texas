import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, ArrowLeft, Clock, Eye, EyeOff, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import ImageSelector from '@/components/ImageSelector';

const CATEGORIES = [
  { value: 'massage', label: 'Massage' },
  { value: 'facial', label: 'Facial' },
  { value: 'body', label: 'Body Work' },
  { value: 'ritual', label: 'Rituals' },
  { value: 'wellness', label: 'Wellness' },
];

export default function AdminTreatments() {
  const [user, setUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    category: 'massage',
    what_it_is: '',
    how_it_feels: '',
    why_choose: '',
    what_to_expect_after: '',
    not_for: '',
    duration_minutes: 60,
    price: 0,
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
        base44.auth.redirectToLogin(createPageUrl('AdminTreatments'));
      }
    };
    loadUser();
  }, []);

  const { data: treatments, isLoading } = useQuery({
    queryKey: ['admin-treatments'],
    queryFn: async () => {
      const all = await base44.entities.Treatment.list();
      return all.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Treatment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-treatments']);
      queryClient.invalidateQueries(['treatments']);
      setIsFormOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Treatment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-treatments']);
      queryClient.invalidateQueries(['treatments']);
      setIsFormOpen(false);
      setEditingTreatment(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Treatment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-treatments']);
      queryClient.invalidateQueries(['treatments']);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'massage',
      what_it_is: '',
      how_it_feels: '',
      why_choose: '',
      what_to_expect_after: '',
      not_for: '',
      duration_minutes: 60,
      price: 0,
      is_available: true
    });
  };

  const handleEdit = (treatment) => {
    setEditingTreatment(treatment);
    setFormData({
      name: treatment.name || '',
      category: treatment.category || 'massage',
      what_it_is: treatment.what_it_is || '',
      how_it_feels: treatment.how_it_feels || '',
      why_choose: treatment.why_choose || '',
      what_to_expect_after: treatment.what_to_expect_after || '',
      not_for: treatment.not_for || '',
      duration_minutes: treatment.duration_minutes || 60,
      price: treatment.price || 0,
      is_available: treatment.is_available !== false
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTreatment) {
      updateMutation.mutate({ id: editingTreatment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.index === destination.index) return;

    const reorderedTreatments = Array.from(treatments);
    const [movedTreatment] = reorderedTreatments.splice(source.index, 1);
    reorderedTreatments.splice(destination.index, 0, movedTreatment);

    reorderedTreatments.forEach((treatment, idx) => {
      updateMutation.mutate({ id: treatment.id, data: { ...treatment, sort_order: idx } });
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
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Treatments</h1>
              <p className="text-sm text-[rgb(45,45,45)]">Manage spa treatments</p>
            </div>
          </div>
          <Button 
            onClick={() => { resetForm(); setEditingTreatment(null); setIsFormOpen(true); }}
            className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)]"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Treatment
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="treatments" type="TREATMENT">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {treatments?.map((treatment, index) => (
                  <Draggable key={treatment.id} draggableId={treatment.id} index={index}>
                    {(provided, snapshot) => (
                      <motion.div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`bg-white border border-[rgb(235,225,213)] p-4 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div {...provided.dragHandleProps} className="mt-1 cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-5 h-5 text-[rgb(198,182,165)]" />
                            </div>
                            <div>
                              <Badge className="mb-2 bg-[rgb(235,225,213)] text-[rgb(107,85,64)]">
                                {CATEGORIES.find(c => c.value === treatment.category)?.label}
                              </Badge>
                              <h3 className="font-medium text-[rgb(107,85,64)]">{treatment.name}</h3>
                            </div>
                          </div>
                          <button
                            onClick={() => updateMutation.mutate({ id: treatment.id, data: { ...treatment, is_available: !treatment.is_available } })}
                            className="p-1 hover:bg-[rgb(235,225,213)] rounded transition-colors"
                            title={treatment.is_available ? 'Hide from site' : 'Show on site'}
                          >
                            {treatment.is_available ? (
                              <Eye className="w-5 h-5 text-[rgb(150,170,155)]" />
                            ) : (
                              <EyeOff className="w-5 h-5 text-[rgb(198,182,165)]" />
                            )}
                          </button>
                        </div>
              <div className="flex items-center gap-4 text-sm text-[rgb(45,45,45)] mb-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {treatment.duration_minutes} min
                </span>
                <span>${treatment.price}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEdit(treatment)}
                  className="flex-1"
                >
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => deleteMutation.mutate(treatment.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              </motion.div>
              )}
              </Draggable>
              ))}
              {provided.placeholder}
              </div>
              )}
              </Droppable>
              </DragDropContext>

        {treatments?.length === 0 && (
          <div className="text-center py-16 bg-white border border-[rgb(235,225,213)]">
            <p className="text-[rgb(45,45,45)]">No treatments yet. Add your first treatment to get started.</p>
          </div>
        )}
      </main>

      {/* Treatment Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgb(248,246,242)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-[rgb(107,85,64)]">
              {editingTreatment ? 'Edit Treatment' : 'Add New Treatment'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Treatment Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Swedish Massage"
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(val) => setFormData({...formData, category: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes) *</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                  min="15"
                  required
                />
              </div>
              <div>
                <Label>Price *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                  min="0"
                  required
                />
              </div>
            </div>

            <div>
              <Label>What It Is (plain explanation)</Label>
              <Textarea
                value={formData.what_it_is}
                onChange={(e) => setFormData({...formData, what_it_is: e.target.value})}
                placeholder="A classic full-body massage using long, flowing strokes..."
                rows={3}
              />
            </div>

            <div>
              <Label>How It Feels</Label>
              <Textarea
                value={formData.how_it_feels}
                onChange={(e) => setFormData({...formData, how_it_feels: e.target.value})}
                placeholder="Deeply relaxing, like tension melting away..."
                rows={2}
              />
            </div>

            <div>
              <Label>Why Choose This</Label>
              <Textarea
                value={formData.why_choose}
                onChange={(e) => setFormData({...formData, why_choose: e.target.value})}
                placeholder="Perfect for first-time spa guests or those seeking gentle relaxation..."
                rows={2}
              />
            </div>

            <div>
              <Label>What to Expect After</Label>
              <Textarea
                value={formData.what_to_expect_after}
                onChange={(e) => setFormData({...formData, what_to_expect_after: e.target.value})}
                placeholder="You may feel drowsy and deeply relaxed. We recommend resting after..."
                rows={2}
              />
            </div>

            <div>
              <Label>Not Recommended For</Label>
              <Textarea
                value={formData.not_for}
                onChange={(e) => setFormData({...formData, not_for: e.target.value})}
                placeholder="Those with certain medical conditions..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({...formData, is_available: checked})}
              />
              <Label>Show on website</Label>
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
                {editingTreatment ? 'Save Changes' : 'Create Treatment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}