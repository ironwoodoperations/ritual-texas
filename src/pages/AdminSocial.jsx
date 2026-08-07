import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Plug, Plus, Instagram, Facebook, Music2, Share2,
  Image as ImageIcon, X, Edit2, Trash2, Calendar, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';

// --- Constants ---
const CATEGORIES = ['hotel', 'restaurant', 'spa'];
const PLATFORMS = ['instagram', 'facebook', 'tiktok'];
const PILLARS = ['quiet', 'glow', 'release', 'together'];
const STATUSES = ['draft', 'scheduled', 'published', 'failed'];
const DURATIONS = [7, 14, 30];

const PLATFORM_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
};

function PlatformIcon({ platform, className = 'w-4 h-4' }) {
  const Icon = PLATFORM_ICONS[platform] || Share2;
  return <Icon className={className} />;
}

// ⚠️ SCHEDULING — naive local wall-time string, format YYYY-MM-DDTHH:mm:ss.
// Take the datetime-local value verbatim; append ':00' if seconds are absent.
// NO toISOString(), NO new Date() re-serialization anywhere in this path.
function normalizeSchedule(val) {
  if (!val) return '';
  // datetime-local returns YYYY-MM-DDTHH:mm (16 chars) or with seconds.
  return val.length === 16 ? `${val}:00` : val;
}

const STATUS_COLORS = {
  draft: 'rgb(120,120,120)',
  scheduled: 'rgb(150,170,155)',
  published: 'rgb(107,85,64)',
  failed: 'rgb(180,80,80)',
};

function StatusBadge({ status }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full text-white capitalize"
      style={{ background: STATUS_COLORS[status] || 'rgb(120,120,120)' }}
    >
      {status || 'draft'}
    </span>
  );
}

export default function AdminSocial() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  const [showConnections, setShowConnections] = useState(false);
  const [showSinglePost, setShowSinglePost] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);

  const [editingPost, setEditingPost] = useState(null);
  const [expandedCampaign, setExpandedCampaign] = useState(null);

  // Content Queue filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  // --- Data ---
  const { data: posts } = useQuery({
    queryKey: ['socialPosts'],
    queryFn: () => base44.entities.SocialPost.list('-created_date'),
  });

  const { data: campaigns } = useQuery({
    queryKey: ['socialCampaigns'],
    queryFn: () => base44.entities.SocialCampaign.list('-created_date'),
  });

  const { data: settingsList } = useQuery({
    queryKey: ['socialSettings'],
    queryFn: () => base44.entities.SocialSettings.list(),
  });
  const settings = settingsList?.[0] || null;

  const { data: treatments } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => base44.entities.Treatment.list(),
  });

  // --- Mutations ---
  const createPost = useMutation({
    mutationFn: (data) => base44.entities.SocialPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['socialPosts']);
      setShowSinglePost(false);
    },
  });

  const updatePost = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SocialPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['socialPosts']);
      setShowSinglePost(false);
      setEditingPost(null);
    },
  });

  const deletePost = useMutation({
    mutationFn: (id) => base44.entities.SocialPost.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['socialPosts']),
  });

  const createCampaign = useMutation({
    mutationFn: (data) => base44.entities.SocialCampaign.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['socialCampaigns']);
      setShowCampaign(false);
    },
  });

  const createSettings = useMutation({
    mutationFn: (data) => base44.entities.SocialSettings.create(data),
    onSuccess: () => queryClient.invalidateQueries(['socialSettings']),
  });

  const updateSettings = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SocialSettings.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['socialSettings']),
  });

  // --- Derived ---
  const filteredPosts = (posts || []).filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    return true;
  });

  const postsByCampaign = (campaignId) =>
    (posts || []).filter((p) => p.campaignId === campaignId);

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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Link
              to={createPageUrl('AdminDashboard')}
              className="text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-extralight text-[rgb(107,85,64)]">Social Media</h1>
              <p className="text-sm text-[rgb(120,120,120)]">Manage campaigns, content, and analytics</p>
            </div>
          </div>
          <Button
            onClick={() => setShowConnections(true)}
            variant="outline"
            className="text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
          >
            <Plug className="w-4 h-4 mr-2" />
            Connections
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mb-4">
          <Button
            onClick={() => { setEditingPost(null); setShowSinglePost(true); }}
            className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            Single Post
          </Button>
          <Button
            onClick={() => setShowCampaign(true)}
            className="bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Campaign
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-[rgb(235,225,213)]">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="content">Content Queue</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* --- CAMPAIGNS TAB --- */}
          <TabsContent value="campaigns" className="mt-6">
            <div className="bg-white border border-[rgb(235,225,213)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgb(235,225,213)] text-left text-[rgb(120,120,120)]">
                    <th className="px-4 py-3 font-medium w-8"></th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Duration</th>
                    <th className="px-4 py-3 font-medium">Platforms</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Start</th>
                    <th className="px-4 py-3 font-medium">Posts</th>
                  </tr>
                </thead>
                <tbody>
                  {(campaigns || []).map((c) => {
                    const isOpen = expandedCampaign === c.id;
                    const cPosts = postsByCampaign(c.id);
                    return (
                      <React.Fragment key={c.id}>
                        <tr
                          onClick={() => setExpandedCampaign(isOpen ? null : c.id)}
                          className="border-b border-[rgb(235,225,213)] cursor-pointer hover:bg-[rgb(248,246,242)] text-[rgb(45,45,45)]"
                        >
                          <td className="px-4 py-3 text-[rgb(120,120,120)]">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </td>
                          <td className="px-4 py-3 font-medium text-[rgb(107,85,64)]">{c.title}</td>
                          <td className="px-4 py-3 capitalize">{c.category || '—'}</td>
                          <td className="px-4 py-3">{c.durationDays ? `${c.durationDays} days` : '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-[rgb(107,85,64)]">
                              {(c.platforms || []).map((p) => (
                                <PlatformIcon key={p} platform={p} className="w-4 h-4" />
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-3">{c.startDate || '—'}</td>
                          <td className="px-4 py-3">{c.postCount ?? cPosts.length}</td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-[rgb(248,246,242)]">
                            <td colSpan={8} className="px-4 py-3">
                              {cPosts.length === 0 ? (
                                <p className="text-sm text-[rgb(120,120,120)] py-2">No posts in this campaign yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {cPosts.map((p) => (
                                    <div key={p.id} className="flex items-center gap-3 bg-white border border-[rgb(235,225,213)] rounded p-2">
                                      {p.imageUrls?.[0] && (
                                        <img src={p.imageUrls[0]} alt="" className="w-10 h-10 object-cover rounded" />
                                      )}
                                      <PlatformIcon platform={p.platform} className="w-4 h-4 text-[rgb(107,85,64)]" />
                                      <span className="flex-1 text-sm text-[rgb(45,45,45)] truncate">
                                        {p.content || p.topic || '(no content)'}
                                      </span>
                                      <StatusBadge status={p.status} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {(campaigns || []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-[rgb(120,120,120)]">
                        No campaigns yet. Create one to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* --- CONTENT QUEUE TAB --- */}
          <TabsContent value="content" className="mt-6">
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <div>
                <Label className="text-xs text-[rgb(120,120,120)]">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-[rgb(120,120,120)]">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map((p) => (
                <div key={p.id} className="bg-white border border-[rgb(235,225,213)] rounded-lg overflow-hidden">
                  <div className="aspect-video bg-[rgb(235,225,213)] overflow-hidden">
                    {p.imageUrls?.[0] ? (
                      <img src={p.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-[rgb(198,182,165)]" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-[rgb(45,45,45)] line-clamp-2 mb-3 min-h-[2.5rem]">
                      {p.content || p.topic || '(no content yet)'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {p.category && (
                        <Badge variant="outline" className="capitalize border-[rgb(235,225,213)] text-[rgb(107,85,64)]">
                          {p.category}
                        </Badge>
                      )}
                      {p.pillar && (
                        <Badge variant="outline" className="capitalize border-[rgb(235,225,213)] text-[rgb(150,170,155)]">
                          {p.pillar}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mb-3 text-xs text-[rgb(120,120,120)]">
                      <div className="flex items-center gap-1.5">
                        <PlatformIcon platform={p.platform} className="w-4 h-4 text-[rgb(107,85,64)]" />
                        {p.scheduledFor && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {p.scheduledFor.replace('T', ' ').slice(0, 16)}
                          </span>
                        )}
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => { setEditingPost(p); setShowSinglePost(true); }}
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => { if (confirm('Delete this post?')) deletePost.mutate(p.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredPosts.length === 0 && (
                <div className="col-span-full text-center py-16 text-[rgb(120,120,120)]">
                  No posts match these filters.
                </div>
              )}
            </div>
          </TabsContent>

          {/* --- ANALYTICS TAB --- */}
          <TabsContent value="analytics" className="mt-6">
            <div className="bg-white border border-[rgb(235,225,213)] rounded-lg py-20 text-center text-[rgb(120,120,120)]">
              Analytics available once posts publish.
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* --- MODALS --- */}
      <ConnectionsModal
        open={showConnections}
        onClose={() => setShowConnections(false)}
        settings={settings}
        createSettings={createSettings}
        updateSettings={updateSettings}
      />

      <SinglePostModal
        open={showSinglePost}
        onClose={() => { setShowSinglePost(false); setEditingPost(null); }}
        editingPost={editingPost}
        treatments={treatments || []}
        createPost={createPost}
        updatePost={updatePost}
      />

      <CampaignModal
        open={showCampaign}
        onClose={() => setShowCampaign(false)}
        createCampaign={createCampaign}
      />
    </div>
  );
}

// ============================================================
// CONNECTIONS MODAL
// ============================================================
function ConnectionsModal({ open, onClose, settings, createSettings, updateSettings }) {
  const [profileId, setProfileId] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');

  useEffect(() => {
    if (open) {
      setProfileId(settings?.zernioProfileId || '');
      setFacebook(settings?.facebookAccountId || '');
      setInstagram(settings?.instagramAccountId || '');
      setTiktok(settings?.tiktokAccountId || '');
    }
  }, [open, settings]);

  const persist = (patch) => {
    if (settings?.id) {
      updateSettings.mutate({ id: settings.id, data: { ...settings, ...patch } });
    } else {
      createSettings.mutate(patch);
    }
  };

  const filledCount = [facebook, instagram, tiktok].filter((v) => v && v.trim()).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-[rgb(248,246,242)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light text-[rgb(107,85,64)]">
            Ironwood Connection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <p className="text-sm text-[rgb(120,120,120)]">
            One Ironwood profile per client. All scheduled posts are routed through Ironwood.
          </p>

          {/* Profile ID */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Ironwood Profile ID</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                placeholder="prof_..."
                className="bg-white"
              />
              <Button
                onClick={() => persist({ zernioProfileId: profileId })}
                className="bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white"
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-[rgb(120,120,120)] mt-1">
              Find this in your Ironwood dashboard → Profiles → select the profile for this client.
            </p>
          </div>

          {/* Connected Platforms */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-[rgb(45,45,45)]">Connected Platforms</Label>
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ background: 'rgb(150,170,155)' }}
              >
                {filledCount} of 3 connected
              </span>
            </div>

            <div className="space-y-3">
              <PlatformRow
                platform="facebook" label="Facebook" value={facebook}
                onChange={setFacebook}
                onSave={() => persist({ facebookAccountId: facebook })}
              />
              <PlatformRow
                platform="instagram" label="Instagram" value={instagram}
                onChange={setInstagram}
                onSave={() => persist({ instagramAccountId: instagram })}
              />
              <PlatformRow
                platform="tiktok" label="TikTok" value={tiktok}
                onChange={setTiktok}
                onSave={() => persist({ tiktokAccountId: tiktok })}
              />
            </div>

            <p className="text-xs text-[rgb(120,120,120)] mt-3">
              Connect each platform inside Ironwood first, then paste the account ID here.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlatformRow({ platform, label, value, onChange, onSave }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 w-28 text-[rgb(107,85,64)]">
        <PlatformIcon platform={platform} className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Account ID"
        className="bg-white flex-1"
      />
      <Button
        onClick={onSave}
        variant="outline"
        className="text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
      >
        Save
      </Button>
    </div>
  );
}

// ============================================================
// SINGLE POST MODAL
// ============================================================
const emptyPost = {
  imageUrls: [],
  category: 'hotel',
  sourceTreatmentId: '',
  platform: 'instagram',
  pillar: 'quiet',
  topic: '',
  content: '',
  hashtags: '',
  scheduledFor: '',
};

function SinglePostModal({ open, onClose, editingPost, treatments, createPost, updatePost }) {
  const [form, setForm] = useState(emptyPost);
  const [scheduleInput, setScheduleInput] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingPost) {
        setForm({
          imageUrls: editingPost.imageUrls || [],
          category: editingPost.category || 'hotel',
          sourceTreatmentId: editingPost.sourceTreatmentId || '',
          platform: editingPost.platform || 'instagram',
          pillar: editingPost.pillar || 'quiet',
          topic: editingPost.topic || '',
          content: editingPost.content || '',
          hashtags: editingPost.hashtags || '',
          scheduledFor: editingPost.scheduledFor || '',
        });
        // datetime-local wants YYYY-MM-DDTHH:mm
        setScheduleInput(editingPost.scheduledFor ? editingPost.scheduledFor.slice(0, 16) : '');
      } else {
        setForm(emptyPost);
        setScheduleInput('');
      }
    }
  }, [open, editingPost]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, result.file_url] }));
      }
    } catch (err) {
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (idx) => {
    setForm((prev) => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }));
  };

  const handleSave = () => {
    // ⚠️ Store scheduledFor as a naive local wall-time string. No toISOString().
    const scheduledFor = normalizeSchedule(scheduleInput);
    const data = {
      imageUrls: form.imageUrls,
      category: form.category,
      sourceTreatmentId: form.sourceTreatmentId || null,
      platform: form.platform,
      pillar: form.pillar,
      topic: form.topic,
      content: form.content,
      hashtags: form.hashtags,
      scheduledFor,
      timezone: 'America/Chicago',
      status: 'draft',
      generatedBy: 'manual',
    };
    if (editingPost) {
      updatePost.mutate({ id: editingPost.id, data });
    } else {
      createPost.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-[rgb(248,246,242)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light text-[rgb(107,85,64)]">
            {editingPost ? 'Edit Post' : 'New Single Post'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* 1. Photo (first — order matters) */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Photo</Label>
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotos}
                disabled={uploading}
                className="hidden"
                id="social-photo-upload"
              />
              <label htmlFor="social-photo-upload">
                <Button
                  asChild
                  variant="outline"
                  disabled={uploading}
                  className="text-[rgb(107,85,64)] border-[rgb(235,225,213)] cursor-pointer"
                >
                  <span>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading…' : 'Add Photo'}
                  </span>
                </Button>
              </label>

              {uploading && (
                <div className="inline-flex items-center gap-2 ml-3 text-sm text-[rgb(120,120,120)]">
                  <div className="w-4 h-4 border-2 border-[rgb(235,225,213)] border-t-[rgb(150,170,155)] rounded-full animate-spin" />
                  Uploading…
                </div>
              )}

              {form.imageUrls.length === 0 && !uploading && (
                <p className="text-sm text-[rgb(120,120,120)] mt-2">
                  No photo yet — required to generate caption
                </p>
              )}

              {form.imageUrls.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {form.imageUrls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded border border-[rgb(235,225,213)]" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 bg-white border border-[rgb(235,225,213)] rounded-full p-0.5 text-red-600 shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Category */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Category</Label>
            <Select value={form.category} onValueChange={(v) => set({ category: v })}>
              <SelectTrigger className="mt-2 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Treatment (optional) */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Treatment (optional)</Label>
            <Select
              value={form.sourceTreatmentId || 'none'}
              onValueChange={(v) => set({ sourceTreatmentId: v === 'none' ? '' : v })}
            >
              <SelectTrigger className="mt-2 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(no treatment — standalone post)</SelectItem>
                {treatments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Platform */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Platform</Label>
            <Select value={form.platform} onValueChange={(v) => set({ platform: v })}>
              <SelectTrigger className="mt-2 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Pillar */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Pillar</Label>
            <Select value={form.pillar} onValueChange={(v) => set({ pillar: v })}>
              <SelectTrigger className="mt-2 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PILLARS.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 6. Topic */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Topic</Label>
            <Textarea
              value={form.topic}
              onChange={(e) => set({ topic: e.target.value })}
              placeholder="What should this post be about?"
              className="mt-2 bg-white"
              rows={2}
            />
          </div>

          {/* AI CAPTION GENERATION — commit 2 */}

          {/* 7. Content */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Content</Label>
            <Textarea
              value={form.content}
              onChange={(e) => set({ content: e.target.value })}
              placeholder="Write the caption…"
              className="mt-2 bg-white"
              rows={4}
            />
          </div>

          {/* 8. Hashtags */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Hashtags</Label>
            <Input
              value={form.hashtags}
              onChange={(e) => set({ hashtags: e.target.value })}
              placeholder="#ritual #spa #texas"
              className="mt-2 bg-white"
            />
          </div>

          {/* 9. Schedule */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Schedule</Label>
            <Input
              type="datetime-local"
              value={scheduleInput}
              onChange={(e) => setScheduleInput(e.target.value)}
              className="mt-2 bg-white"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createPost.isPending || updatePost.isPending}
              className="flex-1 bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
            >
              {editingPost ? 'Update Post' : 'Save Post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// NEW CAMPAIGN MODAL — 3 steps
// ============================================================
const emptyCampaign = {
  title: '',
  goal: '',
  durationDays: 7,
  startDate: '',
  category: 'hotel',
  platforms: [],
  pillars: [...PILLARS],
};

function CampaignModal({ open, onClose, createCampaign }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyCampaign);

  useEffect(() => {
    if (open) {
      setStep(1);
      setForm(emptyCampaign);
    }
  }, [open]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const togglePlatform = (p) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter((x) => x !== p)
        : [...prev.platforms, p],
    }));
  };

  const togglePillar = (p) => {
    setForm((prev) => ({
      ...prev,
      pillars: prev.pillars.includes(p)
        ? prev.pillars.filter((x) => x !== p)
        : [...prev.pillars, p],
    }));
  };

  const handleSave = () => {
    // No post generation this commit — only the campaign record.
    createCampaign.mutate({
      title: form.title,
      goal: form.goal,
      durationDays: form.durationDays,
      startDate: form.startDate,
      category: form.category,
      platforms: form.platforms,
      pillars: form.pillars,
      status: 'draft',
      postCount: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-[rgb(248,246,242)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light text-[rgb(107,85,64)]">
            New Campaign
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 h-1.5 rounded-full"
              style={{ background: s <= step ? 'rgb(107,85,64)' : 'rgb(235,225,213)' }}
            />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label className="text-[rgb(45,45,45)]">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Campaign title"
                className="mt-2 bg-white"
              />
            </div>
            <div>
              <Label className="text-[rgb(45,45,45)]">Goal</Label>
              <Textarea
                value={form.goal}
                onChange={(e) => set({ goal: e.target.value })}
                placeholder="What is this campaign trying to achieve?"
                className="mt-2 bg-white"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-[rgb(45,45,45)]">Duration</Label>
              <div className="flex gap-2 mt-2">
                {DURATIONS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={form.durationDays === d ? 'default' : 'outline'}
                    onClick={() => set({ durationDays: d })}
                    className={form.durationDays === d
                      ? 'bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white'
                      : 'text-[rgb(107,85,64)] border-[rgb(235,225,213)]'}
                  >
                    {d} days
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[rgb(45,45,45)]">Start Date</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
                className="mt-2 bg-white"
              />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <Label className="text-[rgb(45,45,45)]">Category</Label>
              <Select value={form.category} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger className="mt-2 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[rgb(45,45,45)]">Platforms</Label>
              <div className="space-y-2 mt-2">
                {PLATFORMS.map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.platforms.includes(p)}
                      onCheckedChange={() => togglePlatform(p)}
                    />
                    <PlatformIcon platform={p} className="w-4 h-4 text-[rgb(107,85,64)]" />
                    <span className="text-sm capitalize text-[rgb(45,45,45)]">{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-[rgb(45,45,45)]">Pillar Mix</Label>
              <div className="space-y-2 mt-2">
                {PILLARS.map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.pillars.includes(p)}
                      onCheckedChange={() => togglePillar(p)}
                    />
                    <span className="text-sm capitalize text-[rgb(45,45,45)]">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="space-y-3 text-sm text-[rgb(45,45,45)]">
            <SummaryRow label="Title" value={form.title || '—'} />
            <SummaryRow label="Goal" value={form.goal || '—'} />
            <SummaryRow label="Duration" value={`${form.durationDays} days`} />
            <SummaryRow label="Start Date" value={form.startDate || '—'} />
            <SummaryRow label="Category" value={form.category} />
            <SummaryRow label="Platforms" value={form.platforms.join(', ') || '—'} />
            <SummaryRow label="Pillar Mix" value={form.pillars.join(', ') || '—'} />
          </div>
        )}

        {/* Nav */}
        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !form.title}
              className="flex-1 bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white"
            >
              Next
            </Button>
          )}
          {step === 3 && (
            <Button
              onClick={handleSave}
              disabled={createCampaign.isPending}
              className="flex-1 bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
            >
              Create Campaign
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[rgb(235,225,213)] pb-2">
      <span className="text-[rgb(120,120,120)]">{label}</span>
      <span className="text-right capitalize">{value}</span>
    </div>
  );
}