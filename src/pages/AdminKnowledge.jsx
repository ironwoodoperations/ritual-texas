import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, ArrowLeft, Video, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = [
  { value: 'check_in', label: 'Check-in' },
  { value: 'check_out', label: 'Check-out' },
  { value: 'treatments', label: 'Treatments' },
  { value: 'property', label: 'Property' },
  { value: 'policies', label: 'Policies' },
  { value: 'what_to_bring', label: 'What to Bring' },
  { value: 'faq', label: 'FAQ' },
];

export default function AdminKnowledge() {
  const [user, setUser] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    category: 'faq',
    title: '',
    content: '',
    video_url: '',
    display_order: 0,
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
        base44.auth.redirectToLogin(createPageUrl('AdminKnowledge'));
      }
    };
    loadUser();
  }, []);

  const { data: knowledgeBase, isLoading } = useQuery({
    queryKey: ['admin-knowledge'],
    queryFn: () => base44.entities.KnowledgeBase.list('display_order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.KnowledgeBase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-knowledge']);
      queryClient.invalidateQueries(['knowledge-base']);
      setIsFormOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KnowledgeBase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-knowledge']);
      queryClient.invalidateQueries(['knowledge-base']);
      setIsFormOpen(false);
      setEditingItem(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KnowledgeBase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-knowledge']);
      queryClient.invalidateQueries(['knowledge-base']);
    },
  });

  const resetForm = () => {
    setFormData({
      category: 'faq',
      title: '',
      content: '',
      video_url: '',
      display_order: 0,
      is_active: true
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      category: item.category || 'faq',
      title: item.title || '',
      content: item.content || '',
      video_url: item.video_url || '',
      display_order: item.display_order || 0,
      is_active: item.is_active !== false
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const groupedItems = CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = knowledgeBase?.filter(item => item.category === cat.value) || [];
    return acc;
  }, {});

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
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Knowledge Base</h1>
              <p className="text-sm text-[rgb(45,45,45)]">Content for AI concierge & guest education</p>
            </div>
          </div>
          <Button 
            onClick={() => { resetForm(); setEditingItem(null); setIsFormOpen(true); }}
            className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)]"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Content
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-[rgb(235,225,213)] p-4 mb-6">
          <p className="text-sm text-[rgb(107,85,64)]">
            <strong>Tip:</strong> The AI concierge (Ask Ritual) uses this content to answer guest questions. 
            Keep information accurate, up-to-date, and written in a warm, helpful tone.
          </p>
        </div>

        {CATEGORIES.map(cat => (
          <div key={cat.value} className="mb-8">
            <h2 className="text-lg font-light text-[rgb(107,85,64)] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[rgb(150,170,155)]" />
              {cat.label}
              <Badge variant="outline" className="ml-2">{groupedItems[cat.value]?.length || 0}</Badge>
            </h2>

            {groupedItems[cat.value]?.length === 0 ? (
              <div className="bg-white border border-dashed border-[rgb(235,225,213)] p-6 text-center">
                <p className="text-sm text-[rgb(45,45,45)]">No content in this category</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groupedItems[cat.value].map(item => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white border border-[rgb(235,225,213)] p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-[rgb(107,85,64)]">{item.title}</h3>
                          {item.video_url && (
                            <Video className="w-4 h-4 text-[rgb(150,170,155)]" />
                          )}
                          {!item.is_active && (
                            <Badge variant="outline" className="text-red-500">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-[rgb(45,45,45)] line-clamp-2">{item.content}</p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ))}
      </main>

      {/* Form Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgb(248,246,242)]">
          <DialogHeader>
            <DialogTitle className="text-xl font-light text-[rgb(107,85,64)]">
              {editingItem ? 'Edit Content' : 'Add New Content'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
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
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="How to check in"
                required
              />
            </div>

            <div>
              <Label>Content *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                placeholder="Write the full content that the AI will use to answer questions..."
                rows={8}
                required
              />
              <p className="text-xs text-[rgb(45,45,45)] mt-1">
                Write in a warm, helpful tone. This content is used by the AI to answer guest questions.
              </p>
            </div>

            <div>
              <Label>Video URL (optional)</Label>
              <Input
                value={formData.video_url}
                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                placeholder="https://youtube.com/... or https://vimeo.com/..."
              />
              <p className="text-xs text-[rgb(45,45,45)] mt-1">
                Add a video for visual instructions (YouTube, Vimeo, etc.)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label>Active (AI will use this content)</Label>
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
                {editingItem ? 'Save Changes' : 'Create Content'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}