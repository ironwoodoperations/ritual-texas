import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ArrowLeft, Plug, Plus, Instagram, Facebook, Music2, Share2,
  Image as ImageIcon, X, Edit2, Trash2, Calendar, ChevronDown, ChevronRight,
  Sparkles, AlertTriangle, CalendarClock, RefreshCw, Loader2, CheckCircle2, Send,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { buildCaptionPrompt, buildSchedulePrompt, buildImageMatchPrompt } from '@/lib/socialPrompts';
import { screenFields } from '@/lib/socialGuard';
import { ctTodayISO } from '@/lib/time';

// --- Constants ---
const CATEGORIES = ['hotel', 'restaurant', 'spa'];
const PLATFORMS = ['instagram', 'facebook', 'tiktok'];
const PILLARS = ['quiet', 'glow', 'release', 'together'];
const STATUSES = ['draft', 'approved', 'scheduled', 'published', 'failed'];
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
  approved: 'rgb(180,150,90)',
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

// Generation-status pill for campaigns (distinct from the draft/scheduled
// lifecycle status). Explains why a campaign may have 0 posts.
const GEN_COLORS = {
  draft: 'rgb(120,120,120)',
  pending: 'rgb(120,120,120)',
  generating: 'rgb(150,170,155)',
  complete: 'rgb(107,85,64)',
  failed: 'rgb(180,80,80)',
};

function GenBadge({ status }) {
  if (!status) return null;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full capitalize border"
      style={{ color: GEN_COLORS[status] || 'rgb(120,120,120)', borderColor: GEN_COLORS[status] || 'rgb(120,120,120)' }}
    >
      {status}
    </span>
  );
}

// Warning badge for captions that tripped the output filter. Flagged
// posts are still saved — the user sees exactly what was caught.
function FlaggedBadge({ terms }) {
  if (!terms || terms.length === 0) return null;
  return (
    <div
      className="flex items-center gap-1 text-xs rounded px-2 py-1"
      style={{ color: 'rgb(180,80,80)', background: 'rgba(180,80,80,0.08)' }}
    >
      <AlertTriangle className="w-3 h-3 shrink-0" />
      <span>Flagged: {terms.join(', ')}</span>
    </div>
  );
}

// PARSING — required for every InvokeLLM response.
// response_json_schema may return an already-parsed object OR a string.
// Always strip code fences before JSON.parse. Callers wrap this in
// try/catch so a parse failure fails only that batch, never the whole run.
function parseLLM(raw) {
  if (raw && typeof raw === 'object') return raw;
  const clean = String(raw).replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// Derive lightweight tags for an ImageAsset (used by ai_vision matching).
function imageTags(img) {
  return [img.placement_key, img.description, img.name]
    .filter(Boolean)
    .map((s) => String(s));
}

// Add N days to a "YYYY-MM-DD" date string using pure UTC calendar math.
// This is NOT in the scheduling path — it only computes a prompt date
// range. No toISOString(), no timezone conversion, no local rollover.
function addDaysISO(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export default function AdminSocial() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  const [showConnections, setShowConnections] = useState(false);
  const [showSinglePost, setShowSinglePost] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);

  const [editingPost, setEditingPost] = useState(null);
  const [expandedCampaign, setExpandedCampaign] = useState(null);

  // Campaign edit / delete
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignInitialStep, setCampaignInitialStep] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null); // campaign pending deletion
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Content Queue filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Smart Schedule (bulk) state
  const [scheduling, setScheduling] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState(null); // [{ post, scheduled_for, reasoning }]
  const [scheduleError, setScheduleError] = useState(null);

  // Zernio publish/sync state
  const [publishingId, setPublishingId] = useState(null); // post id currently being scheduled
  const [publishErrors, setPublishErrors] = useState({}); // postId -> inline error message
  const [bulkPublish, setBulkPublish] = useState(null); // { done, total } while running
  const [bulkReport, setBulkReport] = useState(null); // { ok, failures: [{id, msg}] }
  const [syncing, setSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState(null);

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

  const { data: images } = useQuery({
    queryKey: ['images'],
    queryFn: () => base44.entities.ImageAsset.list('sort_order'),
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

  // Drafts among the currently filtered posts — the Smart Schedule target.
  const schedulableDrafts = filteredPosts.filter((p) => p.status === 'draft');

  // Build a Smart Schedule preview via a single InvokeLLM call.
  // Nothing is written until the user confirms.
  const runSmartSchedule = async () => {
    if (schedulableDrafts.length === 0) return;
    setScheduling(true);
    setScheduleError(null);
    try {
      // Range: today through +30 days, as local Chicago wall-clock dates.
      const start = schedulableDrafts
        .map((p) => p.scheduledFor)
        .filter(Boolean)
        .sort()[0]?.slice(0, 10);
      const startDate = start || ctTodayISO();
      const endDate = addDaysISO(startDate, 30);

      const { prompt } = buildSchedulePrompt({
        posts: schedulableDrafts.map((p) => ({
          category: p.category,
          platform: p.platform,
          pillar: p.pillar,
        })),
        startDate,
        endDate,
      });

      const raw = await base44.integrations.Core.InvokeLLM({ prompt });
      let parsed;
      try {
        parsed = parseLLM(raw);
      } catch (e) {
        throw new Error('Could not parse the schedule response.');
      }
      const rows = Array.isArray(parsed) ? parsed : [];
      const preview = rows
        .map((r) => {
          const post = schedulableDrafts[r.post_index];
          if (!post) return null;
          // Store the AI's local Chicago wall-clock time verbatim.
          return { post, scheduled_for: r.scheduled_for, reasoning: r.reasoning || '' };
        })
        .filter(Boolean);
      setSchedulePreview(preview);
    } catch (err) {
      setScheduleError(String(err?.message || err));
    } finally {
      setScheduling(false);
    }
  };

  const confirmSmartSchedule = async () => {
    if (!schedulePreview) return;
    setScheduling(true);
    try {
      for (const row of schedulePreview) {
        // ⚠️ No toISOString / new Date. The value is already a naive local
        // wall-time string (YYYY-MM-DDTHH:mm:ss). Store it verbatim.
        const scheduledFor = normalizeSchedule(row.scheduled_for);
        await base44.entities.SocialPost.update(row.post.id, {
          scheduledFor,
          scheduleReasoning: row.reasoning,
          timezone: 'America/Chicago',
          status: 'approved',
        });
      }
      queryClient.invalidateQueries(['socialPosts']);
      setSchedulePreview(null);
    } catch (err) {
      setScheduleError(String(err?.message || err));
    } finally {
      setScheduling(false);
    }
  };

  // --- Zernio publish leg ---

  // Approve a draft (UI-only status change; no API call). A post must be
  // 'approved' before it can be scheduled — enforced here and in the function.
  const approvePost = async (post) => {
    await base44.entities.SocialPost.update(post.id, { status: 'approved' });
    queryClient.invalidateQueries(['socialPosts']);
  };

  // Schedule one approved post through Zernio. Returns { ok, msg }.
  const publishPost = async (post) => {
    setPublishingId(post.id);
    setPublishErrors((prev) => {
      const next = { ...prev };
      delete next[post.id];
      return next;
    });
    try {
      await base44.functions.invoke('zernioPublishPost', { postId: post.id });
      queryClient.invalidateQueries(['socialPosts']);
      return { ok: true };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Publish failed';
      setPublishErrors((prev) => ({ ...prev, [post.id]: msg }));
      // Reflect any server-side status change (e.g. 'failed').
      queryClient.invalidateQueries(['socialPosts']);
      return { ok: false, msg };
    } finally {
      setPublishingId(null);
    }
  };

  // Retry a failed post: re-approve, then publish again.
  const retryPost = async (post) => {
    setPublishingId(post.id);
    try {
      await base44.entities.SocialPost.update(post.id, { status: 'approved', failureReason: null });
    } catch {
      // fall through to publish attempt regardless
    }
    await publishPost(post);
  };

  // Bulk-schedule every approved post in the current filter, SEQUENTIALLY.
  // One failure does not abort the rest; failures are collected and reported.
  const scheduleAllApproved = async () => {
    const targets = filteredPosts.filter((p) => p.status === 'approved');
    if (targets.length === 0) return;
    setBulkReport(null);
    setBulkPublish({ done: 0, total: targets.length });
    const failures = [];
    for (let i = 0; i < targets.length; i += 1) {
      setBulkPublish({ done: i + 1, total: targets.length });
      const r = await publishPost(targets[i]); // sequential — await each
      if (!r.ok) failures.push({ id: targets[i].id, msg: r.msg });
    }
    setBulkPublish(null);
    setBulkReport({ ok: targets.length - failures.length, failures });
    queryClient.invalidateQueries(['socialPosts']);
  };

  const runSyncStatus = async () => {
    setSyncing(true);
    setSyncReport(null);
    try {
      const resp = await base44.functions.invoke('zernioSyncStatus', {});
      setSyncReport(resp.data);
      queryClient.invalidateQueries(['socialPosts']);
    } catch (err) {
      setSyncReport({ error: err?.response?.data?.message || err?.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  const approvedCount = filteredPosts.filter((p) => p.status === 'approved').length;

  // --- Campaign lifecycle ---

  const openNewCampaign = () => {
    setEditingCampaign(null);
    setCampaignInitialStep(1);
    setShowCampaign(true);
  };

  const openEditCampaign = (campaign, step = 1) => {
    setEditingCampaign(campaign);
    setCampaignInitialStep(step);
    setShowCampaign(true);
  };

  const closeCampaignModal = () => {
    setShowCampaign(false);
    setEditingCampaign(null);
    setCampaignInitialStep(1);
  };

  // Live posts (at Zernio) can never be deleted from here.
  const isLivePost = (p) => p.status === 'scheduled' || p.status === 'published';

  // Delete the campaign and every one of its posts. Guarded by the dialog,
  // which blocks this path when any live posts exist.
  const deleteCampaignAndPosts = async (campaign) => {
    setDeleteBusy(true);
    try {
      const cPosts = postsByCampaign(campaign.id);
      for (const p of cPosts) {
        await base44.entities.SocialPost.delete(p.id);
      }
      await base44.entities.SocialCampaign.delete(campaign.id);
      queryClient.invalidateQueries(['socialPosts']);
      queryClient.invalidateQueries(['socialCampaigns']);
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  // Delete the campaign but keep its posts — detach them first so none are
  // silently orphaned.
  const deleteCampaignKeepPosts = async (campaign) => {
    setDeleteBusy(true);
    try {
      const cPosts = postsByCampaign(campaign.id);
      for (const p of cPosts) {
        await base44.entities.SocialPost.update(p.id, { campaignId: null, campaignTitle: null });
      }
      await base44.entities.SocialCampaign.delete(campaign.id);
      queryClient.invalidateQueries(['socialPosts']);
      queryClient.invalidateQueries(['socialCampaigns']);
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  // Delete a campaign that has no posts.
  const deleteCampaignOnly = async (campaign) => {
    setDeleteBusy(true);
    try {
      await base44.entities.SocialCampaign.delete(campaign.id);
      queryClient.invalidateQueries(['socialCampaigns']);
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
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
          <div className="flex items-center gap-2">
            <Button
              onClick={runSyncStatus}
              variant="outline"
              disabled={syncing}
              className="text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Status'}
            </Button>
            <Button
              onClick={() => setShowConnections(true)}
              variant="outline"
              className="text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
            >
              <Plug className="w-4 h-4 mr-2" />
              Connections
            </Button>
          </div>
        </div>

        {syncReport && (
          <div className="mb-2 text-sm rounded p-2 bg-white border border-[rgb(235,225,213)] text-[rgb(45,45,45)]">
            {syncReport.error ? (
              <span style={{ color: 'rgb(180,80,80)' }}>Sync failed: {syncReport.error}</span>
            ) : (
              <span>
                Synced {syncReport.checked ?? 0} scheduled post(s): {syncReport.published ?? 0} published,{' '}
                {syncReport.failed ?? 0} failed, {syncReport.partial ?? 0} partial,{' '}
                {syncReport.unchanged ?? 0} unchanged{syncReport.errors ? `, ${syncReport.errors} errors` : ''}.
              </span>
            )}
          </div>
        )}

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
            onClick={openNewCampaign}
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
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(campaigns || []).map((c) => {
                    const isOpen = expandedCampaign === c.id;
                    const cPosts = postsByCampaign(c.id);
                    const postTotal = c.postCount ?? cPosts.length;
                    // Resume is available for a stalled campaign with no posts.
                    const canGenerate = postTotal === 0
                      && c.generationStatus !== 'complete'
                      && c.generationStatus !== 'generating';
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
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <StatusBadge status={c.status} />
                              <GenBadge status={c.generationStatus} />
                            </div>
                          </td>
                          <td className="px-4 py-3">{c.startDate || '—'}</td>
                          <td className="px-4 py-3">{postTotal}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {canGenerate && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
                                  onClick={() => openEditCampaign(c, 4)}
                                >
                                  <Sparkles className="w-3 h-3 mr-1" /> Generate Posts
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
                                onClick={() => openEditCampaign(c, 1)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => setDeleteTarget(c)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-[rgb(248,246,242)]">
                            <td colSpan={9} className="px-4 py-3">
                              {c.generationStatus === 'failed' && c.lastError && (
                                <div
                                  className="mb-3 text-sm rounded p-2 flex items-start gap-2"
                                  style={{ color: 'rgb(180,80,80)', background: 'rgba(180,80,80,0.08)' }}
                                >
                                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                  <span>Generation failed: {c.lastError}</span>
                                </div>
                              )}
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
                      <td colSpan={9} className="px-4 py-12 text-center text-[rgb(120,120,120)]">
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
            {/* Filters + Smart Schedule */}
            <div className="flex gap-3 mb-4 items-end">
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
              <div className="ml-auto flex gap-2">
                <Button
                  onClick={runSmartSchedule}
                  disabled={scheduling || schedulableDrafts.length === 0}
                  title={schedulableDrafts.length === 0 ? 'No draft posts to schedule' : undefined}
                  variant="outline"
                  className="text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
                >
                  <CalendarClock className="w-4 h-4 mr-2" />
                  {scheduling && !schedulePreview ? 'Planning…' : `Smart Schedule (${schedulableDrafts.length})`}
                </Button>
                <Button
                  onClick={scheduleAllApproved}
                  disabled={!!bulkPublish || approvedCount === 0}
                  title={approvedCount === 0 ? 'No approved posts to schedule' : undefined}
                  className="bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {bulkPublish
                    ? `Scheduling ${bulkPublish.done} of ${bulkPublish.total}…`
                    : `Schedule All Approved (${approvedCount})`}
                </Button>
              </div>
            </div>

            {scheduleError && (
              <div className="mb-4 text-sm rounded p-3" style={{ color: 'rgb(180,80,80)', background: 'rgba(180,80,80,0.08)' }}>
                {scheduleError}
              </div>
            )}

            {bulkReport && (
              <div className="mb-4 text-sm rounded p-3 bg-white border border-[rgb(235,225,213)] text-[rgb(45,45,45)]">
                <div>
                  Scheduled {bulkReport.ok} post(s).
                  {bulkReport.failures.length > 0 && ` ${bulkReport.failures.length} failed:`}
                </div>
                {bulkReport.failures.length > 0 && (
                  <ul className="mt-1 list-disc pl-5" style={{ color: 'rgb(180,80,80)' }}>
                    {bulkReport.failures.map((f) => (
                      <li key={f.id}>{f.msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Smart Schedule preview — nothing is written until confirmed */}
            {schedulePreview && (
              <div className="mb-6 bg-white border border-[rgb(235,225,213)] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[rgb(107,85,64)] font-medium">
                    Proposed schedule ({schedulePreview.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSchedulePreview(null)} disabled={scheduling}>
                      Cancel
                    </Button>
                    <Button
                      onClick={confirmSmartSchedule}
                      disabled={scheduling}
                      className="bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
                    >
                      {scheduling ? 'Saving…' : 'Confirm & Approve'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {schedulePreview.map((row, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm border-b border-[rgb(235,225,213)] pb-2">
                      <PlatformIcon platform={row.post.platform} className="w-4 h-4 mt-0.5 text-[rgb(107,85,64)]" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[rgb(45,45,45)] truncate">
                          {row.post.content || row.post.topic || '(no content)'}
                        </div>
                        {row.reasoning && (
                          <div className="text-xs text-[rgb(120,120,120)]">{row.reasoning}</div>
                        )}
                      </div>
                      <div className="text-[rgb(107,85,64)] font-medium whitespace-nowrap">
                        {String(row.scheduled_for || '').replace('T', ' ').slice(0, 16)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    {p.flagged && p.flaggedTerms?.length > 0 && (
                      <div className="mb-3">
                        <FlaggedBadge terms={p.flaggedTerms} />
                      </div>
                    )}
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
                    {/* Inline publish error / persisted failure reason — stays
                        on the card (not a disappearing toast). */}
                    {(publishErrors[p.id] || (p.status === 'failed' && p.failureReason)) && (
                      <div
                        className="mb-2 text-xs rounded p-2"
                        style={{ color: 'rgb(180,80,80)', background: 'rgba(180,80,80,0.08)' }}
                      >
                        {publishErrors[p.id] || p.failureReason}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {p.status === 'draft' && (
                        <Button
                          size="sm"
                          className="flex-1 bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
                          onClick={() => approvePost(p)}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                        </Button>
                      )}
                      {p.status === 'approved' && (
                        <Button
                          size="sm"
                          className="flex-1 bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white"
                          disabled={publishingId === p.id}
                          onClick={() => publishPost(p)}
                        >
                          {publishingId === p.id
                            ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            : <Send className="w-3 h-3 mr-1" />}
                          {publishingId === p.id ? 'Scheduling…' : 'Schedule'}
                        </Button>
                      )}
                      {p.status === 'failed' && (
                        <Button
                          size="sm"
                          className="flex-1 bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white"
                          disabled={publishingId === p.id}
                          onClick={() => retryPost(p)}
                        >
                          {publishingId === p.id
                            ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            : <RefreshCw className="w-3 h-3 mr-1" />}
                          {publishingId === p.id ? 'Retrying…' : 'Retry'}
                        </Button>
                      )}
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
        onClose={closeCampaignModal}
        editingCampaign={editingCampaign}
        initialStep={campaignInitialStep}
        treatments={treatments || []}
        images={images || []}
      />

      <DeleteCampaignDialog
        campaign={deleteTarget}
        posts={deleteTarget ? postsByCampaign(deleteTarget.id) : []}
        busy={deleteBusy}
        isLivePost={isLivePost}
        onCancel={() => setDeleteTarget(null)}
        onDeleteOnly={deleteCampaignOnly}
        onDeleteWithPosts={deleteCampaignAndPosts}
        onDeleteKeepPosts={deleteCampaignKeepPosts}
      />
    </div>
  );
}

// ============================================================
// DELETE CAMPAIGN DIALOG
// ============================================================
function DeleteCampaignDialog({
  campaign, posts, busy, isLivePost,
  onCancel, onDeleteOnly, onDeleteWithPosts, onDeleteKeepPosts,
}) {
  const open = !!campaign;
  const count = posts.length;
  const liveCount = posts.filter(isLivePost).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md bg-[rgb(248,246,242)]">
        <DialogHeader>
          <DialogTitle className="text-xl font-light text-[rgb(107,85,64)]">
            Delete “{campaign?.title}”?
          </DialogTitle>
        </DialogHeader>

        {count === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-[rgb(45,45,45)]">
              This campaign has no posts. This will permanently delete the campaign.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} disabled={busy} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => onDeleteOnly(campaign)}
                disabled={busy}
                className="flex-1 bg-[rgb(180,80,80)] hover:bg-[rgb(150,60,60)] text-white"
              >
                {busy ? 'Deleting…' : 'Delete Campaign'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[rgb(45,45,45)]">
              This campaign has {count} post{count === 1 ? '' : 's'}. What should happen to them?
            </p>

            {liveCount > 0 && (
              <div
                className="text-sm rounded p-2 flex items-start gap-2"
                style={{ color: 'rgb(180,80,80)', background: 'rgba(180,80,80,0.08)' }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {liveCount} post{liveCount === 1 ? ' is' : 's are'} already scheduled or published and
                  cannot be deleted. Cancel them in the Content Queue first.
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={() => onDeleteWithPosts(campaign)}
                disabled={busy || liveCount > 0}
                title={liveCount > 0 ? 'Cannot delete live posts' : undefined}
                className="w-full bg-[rgb(180,80,80)] hover:bg-[rgb(150,60,60)] text-white"
              >
                Delete campaign and its posts
              </Button>
              <Button
                onClick={() => onDeleteKeepPosts(campaign)}
                disabled={busy}
                variant="outline"
                className="w-full text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
              >
                Delete campaign only, keep posts
              </Button>
              <Button
                onClick={onCancel}
                disabled={busy}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
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

  // Live connection status, read from Ironwood rather than inferred from the
  // inputs below. `status` stays null until a read resolves — a not-yet-known
  // zero must never render the same as a real zero, which is how the old
  // badge came to claim three connections against zero authorized accounts.
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const resp = await base44.functions.invoke('zernioListAccounts', {});
      setStatus(resp.data);
    } catch (err) {
      setStatus(null);
      // Deliberately NOT falling back to err.message: on a network or SDK
      // failure that is raw text which never passed through the function,
      // and it can name the vendor. The function's own messages are safe.
      setStatusError(err?.response?.data?.message || 'Could not load connection status.');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setProfileId(settings?.zernioProfileId || '');
      setFacebook(settings?.facebookAccountId || '');
      setInstagram(settings?.instagramAccountId || '');
      setTiktok(settings?.tiktokAccountId || '');
    }
  }, [open, settings]);

  // Separate from the field seeding above: that effect also re-runs whenever
  // `settings` changes (i.e. after every Save), and a save must not trigger
  // another vendor round-trip. Live read on open, plus manual Refresh — no
  // polling, no interval, no focus listener.
  useEffect(() => {
    if (open) loadStatus();
  }, [open, loadStatus]);

  const persist = (patch) => {
    if (settings?.id) {
      updateSettings.mutate({ id: settings.id, data: { ...settings, ...patch } });
    } else {
      createSettings.mutate(patch);
    }
  };

  // Presence in accounts[] is the only connection signal there is — the
  // vendor exposes no per-account status field, so a revoked account is
  // indistinguishable from one that was never connected.
  const accountFor = (platform) =>
    (status?.accounts || []).find((a) => a.platform === platform) || null;
  const statusKnown = !!status && !statusLoading;

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
            <div className="flex items-center justify-between mb-3 gap-2">
              <Label className="text-[rgb(45,45,45)]">Connected Platforms</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadStatus}
                  disabled={statusLoading}
                  className="h-7 px-2 text-xs text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${statusLoading ? 'animate-spin' : ''}`} />
                  Refresh status
                </Button>
                {statusLoading ? (
                  <span className="text-xs text-[rgb(120,120,120)]">Checking…</span>
                ) : statusError ? (
                  <span className="text-xs text-right" style={{ color: 'rgb(180,80,80)' }}>
                    {statusError}
                  </span>
                ) : (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white whitespace-nowrap"
                    style={{ background: 'rgb(150,170,155)' }}
                  >
                    {status?.connectedCount ?? 0} of {PLATFORMS.length} connected
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <PlatformRow
                platform="facebook" label="Facebook" value={facebook}
                onChange={setFacebook}
                onSave={() => persist({ facebookAccountId: facebook })}
                account={accountFor('facebook')} statusKnown={statusKnown}
              />
              <PlatformRow
                platform="instagram" label="Instagram" value={instagram}
                onChange={setInstagram}
                onSave={() => persist({ instagramAccountId: instagram })}
                account={accountFor('instagram')} statusKnown={statusKnown}
              />
              <PlatformRow
                platform="tiktok" label="TikTok" value={tiktok}
                onChange={setTiktok}
                onSave={() => persist({ tiktokAccountId: tiktok })}
                account={accountFor('tiktok')} statusKnown={statusKnown}
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

function PlatformRow({ platform, label, value, onChange, onSave, account, statusKnown }) {
  const handle = account?.username
    ? `@${account.username}`
    : account?.name || account?.displayName || '';

  return (
    <div>
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
      <div className="pl-[7.5rem] mt-1 text-xs">
        {!statusKnown ? (
          <span className="text-[rgb(120,120,120)]">Checking…</span>
        ) : account ? (
          <span className="inline-flex items-center gap-1" style={{ color: 'rgb(150,170,155)' }}>
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            Connected{handle ? ` · ${handle}` : ''}
          </span>
        ) : (
          <span className="text-[rgb(120,120,120)]">Not connected</span>
        )}
      </div>
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
  platform: '', // chosen first; empty = no platform selected yet
  pillar: 'quiet',
  topic: '',
  content: '',
  hashtags: '',
  scheduledFor: '',
};

// Platforms that cannot publish a text-only post.
const PHOTO_REQUIRED_PLATFORMS = ['instagram', 'tiktok'];

function SinglePostModal({ open, onClose, editingPost, treatments, createPost, updatePost }) {
  const [form, setForm] = useState(emptyPost);
  const [scheduleInput, setScheduleInput] = useState('');
  const [uploading, setUploading] = useState(false);

  // AI caption generation
  const [generating, setGenerating] = useState(false);
  const [variants, setVariants] = useState([]); // [{ content, hashtags, angle, screen }]
  const [genError, setGenError] = useState(null);
  // Inline photo-requirement error surfaced when a save is blocked.
  const [photoError, setPhotoError] = useState(null);

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
      setVariants([]);
      setGenError(null);
      setPhotoError(null);
    }
  }, [open, editingPost]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  // Choosing/changing the platform clears a stale photo-requirement error;
  // the section's derived text re-surfaces the requirement if still unmet.
  const setPlatform = (v) => {
    setForm((prev) => ({ ...prev, platform: v }));
    setPhotoError(null);
  };

  // Photo-section state derived from the selected platform.
  const platformChosen = !!form.platform;
  const platformLabel = form.platform
    ? form.platform.charAt(0).toUpperCase() + form.platform.slice(1)
    : '';
  const photoRequired = PHOTO_REQUIRED_PLATFORMS.includes(form.platform);
  const photoHeading = !platformChosen
    ? 'Photo'
    : photoRequired
      ? `Photo — required for ${platformLabel}`
      : 'Photo (optional)';
  const photoEmptyText = !platformChosen
    ? 'Choose a platform first'
    : photoRequired
      ? `${platformLabel} posts need at least one photo.`
      : 'No photo yet — optional for Facebook.';

  const handleGenerate = async () => {
    // Generation depends on platform (it shapes caption length/format),
    // not on a photo — the image is never sent to the LLM.
    if (!form.platform) return;
    setGenerating(true);
    setGenError(null);
    setVariants([]);
    try {
      // Subject matter: the chosen treatment, else all treatments for spa.
      let subject = [];
      if (form.sourceTreatmentId) {
        const t = treatments.find((x) => x.id === form.sourceTreatmentId);
        if (t) subject = [t];
      } else if (form.category === 'spa') {
        subject = treatments;
      }

      const { prompt, response_json_schema } = buildCaptionPrompt({
        category: form.category,
        pillar: form.pillar,
        platform: form.platform,
        topics: form.topic,
        treatments: subject,
        count: 3,
      });

      const raw = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema });
      let parsed;
      try {
        parsed = parseLLM(raw);
      } catch (e) {
        throw new Error('Could not parse the generated captions.');
      }
      const list = (parsed?.posts || []).map((p) => ({
        content: p.content || '',
        hashtags: p.hashtags || '',
        angle: p.angle || '',
        // Run the output filter on the caption AND its hashtags.
        screen: screenFields(p.content || '', p.hashtags || ''),
      }));
      setVariants(list);
    } catch (err) {
      setGenError(String(err?.message || err));
    } finally {
      setGenerating(false);
    }
  };

  const applyVariant = (v) => {
    set({ content: v.content, hashtags: v.hashtags });
  };

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, result.file_url] }));
      }
      setPhotoError(null); // requirement now satisfied
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
    // Instagram/TikTok cannot publish a text-only post — block the save
    // (Facebook with no image saves normally).
    if (PHOTO_REQUIRED_PLATFORMS.includes(form.platform) && form.imageUrls.length === 0) {
      setPhotoError(`${platformLabel} requires a photo. Add one, or switch to Facebook.`);
      return;
    }
    // ⚠️ Store scheduledFor as a naive local wall-time string. No toISOString().
    const scheduledFor = normalizeSchedule(scheduleInput);
    // Screen the final caption AND hashtags so any prohibited terms surface.
    const screen = screenFields(form.content || '', form.hashtags || '');
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
      flagged: screen.flagged,
      flaggedTerms: screen.terms,
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
          {/* 1. Platform (chosen first — shapes the photo requirement) */}
          <div>
            <Label className="text-[rgb(45,45,45)]">Platform</Label>
            <Select value={form.platform} onValueChange={setPlatform}>
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue placeholder="Choose a platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Photo (adapts to the selected platform) */}
          <div className={platformChosen ? '' : 'opacity-60'}>
            <Label className="text-[rgb(45,45,45)]">{photoHeading}</Label>
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotos}
                disabled={uploading || !platformChosen}
                className="hidden"
                id="social-photo-upload"
              />
              <label htmlFor="social-photo-upload">
                <Button
                  asChild
                  variant={photoRequired ? 'default' : 'outline'}
                  disabled={uploading || !platformChosen}
                  className={photoRequired
                    ? 'bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white cursor-pointer'
                    : 'text-[rgb(107,85,64)] border-[rgb(235,225,213)] cursor-pointer'}
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
                  {photoEmptyText}
                </p>
              )}

              {photoError && (
                <div
                  className="mt-2 text-sm rounded p-2"
                  style={{ color: 'rgb(180,80,80)', background: 'rgba(180,80,80,0.08)' }}
                >
                  {photoError}
                </div>
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

          {/* 3. Category */}
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

          {/* 4. Treatment (optional) */}
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

          {/* AI CAPTION GENERATION */}
          <div>
            <div title={!platformChosen ? 'Choose a platform first' : undefined} className="inline-block">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={!platformChosen || generating}
                className="bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? 'Generating…' : 'Generate Caption'}
              </Button>
            </div>

            {genError && (
              <div className="mt-2 text-sm rounded p-2" style={{ color: 'rgb(180,80,80)', background: 'rgba(180,80,80,0.08)' }}>
                {genError}
              </div>
            )}

            {variants.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-[rgb(120,120,120)]">
                  Pick a variant to fill the fields below — you can still edit it.
                </p>
                {variants.map((v, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => applyVariant(v)}
                    className="w-full text-left bg-white border border-[rgb(235,225,213)] rounded-lg p-3 hover:border-[rgb(150,170,155)] transition-colors"
                  >
                    {v.angle && (
                      <div className="text-xs text-[rgb(150,170,155)] mb-1 capitalize">{v.angle}</div>
                    )}
                    <div className="text-sm text-[rgb(45,45,45)] whitespace-pre-wrap">{v.content}</div>
                    {v.hashtags && (
                      <div className="text-xs text-[rgb(120,120,120)] mt-1">{v.hashtags}</div>
                    )}
                    {v.screen.flagged && (
                      <div className="mt-2">
                        <FlaggedBadge terms={v.screen.terms} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

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
  topics: '',
  imageStrategy: 'none', // none | fixed | folder | ai_vision
  fixedImageId: '',
  folder: '',
};

const BATCH_SIZE = 7;

function CampaignModal({ open, onClose, editingCampaign, initialStep = 1, treatments, images }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyCampaign);
  const [campaignId, setCampaignId] = useState(null);
  const [saving, setSaving] = useState(false);
  // Generation progress: { running, done, total, error, complete }
  const [gen, setGen] = useState({ running: false, done: 0, total: 0, error: null, complete: false });

  const isEditing = !!editingCampaign;
  // Once posts exist (generation complete), only title & goal are editable.
  const locked = isEditing && editingCampaign.generationStatus === 'complete';

  useEffect(() => {
    if (open) {
      if (editingCampaign) {
        const c = editingCampaign;
        setForm({
          title: c.title || '',
          goal: c.goal || '',
          durationDays: c.durationDays || 7,
          startDate: c.startDate || '',
          category: c.category || 'hotel',
          platforms: c.platforms || [],
          pillars: c.pillars || [...PILLARS],
          topics: c.topics || '',
          imageStrategy: c.imageStrategy || 'none',
          fixedImageId: c.fixedImageId || '',
          folder: c.folder || '',
        });
        setCampaignId(c.id);
        setStep(initialStep);
        const existing = c.postCount || 0;
        setGen({
          running: false,
          done: existing,
          total: c.durationDays || 7,
          error: c.generationStatus === 'failed' ? (c.lastError || 'Generation failed') : null,
          complete: c.generationStatus === 'complete',
        });
      } else {
        setForm(emptyCampaign);
        setCampaignId(null);
        setStep(initialStep);
        setGen({ running: false, done: 0, total: 0, error: null, complete: false });
      }
    }
  }, [open, editingCampaign, initialStep]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  // Known SocialCampaign fields to persist (update merges, so unknown
  // client-only fields aren't sent).
  const campaignPayload = () => ({
    title: form.title,
    goal: form.goal,
    durationDays: form.durationDays,
    startDate: form.startDate,
    category: form.category,
    platforms: form.platforms,
    pillars: form.pillars,
    topics: form.topics,
    imageStrategy: form.imageStrategy,
  });

  // Save edits to an existing campaign. When locked, only title & goal
  // may change.
  const saveEdits = async () => {
    if (!campaignId) return;
    setSaving(true);
    try {
      const payload = locked ? { title: form.title, goal: form.goal } : campaignPayload();
      await base44.entities.SocialCampaign.update(campaignId, payload);
      queryClient.invalidateQueries(['socialCampaigns']);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Distinct folders (ImageAsset.placement_key) for the folder strategy.
  const folders = Array.from(
    new Set((images || []).map((img) => img.placement_key).filter(Boolean)),
  );

  // Resolve image urls for a post at a given global index, per strategy.
  const resolveImageUrls = (globalIndex, aiMatchedId) => {
    if (form.imageStrategy === 'fixed' && form.fixedImageId) {
      const img = (images || []).find((x) => x.id === form.fixedImageId);
      return img ? [img.url] : [];
    }
    if (form.imageStrategy === 'folder' && form.folder) {
      const pool = (images || []).filter((x) => (x.placement_key || '') === form.folder);
      if (pool.length === 0) return [];
      const img = pool[globalIndex % pool.length];
      return img ? [img.url] : [];
    }
    if (form.imageStrategy === 'ai_vision' && aiMatchedId) {
      const img = (images || []).find((x) => x.id === aiMatchedId);
      return img ? [img.url] : [];
    }
    return [];
  };

  // Ensure the campaign record exists; return its id. When resuming an
  // existing campaign, persist any edits to its fields before generating.
  const ensureCampaign = async () => {
    if (campaignId) {
      await base44.entities.SocialCampaign.update(campaignId, campaignPayload());
      return campaignId;
    }
    const created = await base44.entities.SocialCampaign.create({
      ...campaignPayload(),
      status: 'draft',
      postCount: 0,
      generationStatus: 'draft',
    });
    setCampaignId(created.id);
    return created.id;
  };

  // Batched, client-side generation loop. Resumes from `startFrom`.
  const generatePosts = async (startFrom = 0) => {
    const total = form.durationDays; // one post per campaign day
    const cid = await ensureCampaign();
    await base44.entities.SocialCampaign.update(cid, { generationStatus: 'generating', lastError: null });
    setGen({ running: true, done: startFrom, total, error: null, complete: false });

    // ai_vision candidate map — capped at 100, keyed by id for validation.
    const candidates =
      form.imageStrategy === 'ai_vision'
        ? (images || []).slice(0, 100).map((img) => ({
            id: img.id,
            filename: img.name || '',
            tags: imageTags(img),
          }))
        : [];
    const validIds = new Set(candidates.map((c) => c.id));

    let done = startFrom;
    while (done < total) {
      const batchCount = Math.min(BATCH_SIZE, total - done);
      try {
        // Representative platform/pillar for the batch prompt; assignment
        // below cycles across the campaign's full platform/pillar mix.
        const platform = form.platforms[0] || 'instagram';
        const pillar = form.pillars[0] || 'quiet';
        const subject = form.category === 'spa' ? treatments : [];

        const { prompt, response_json_schema } = buildCaptionPrompt({
          category: form.category,
          pillar,
          platform,
          topics: form.topics,
          treatments: subject,
          count: batchCount,
        });

        const raw = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema });
        let parsed;
        try {
          parsed = parseLLM(raw);
        } catch (e) {
          throw new Error(`Failed to parse batch at post ${done + 1}.`);
        }
        const genPosts = parsed?.posts || [];

        // ai_vision image matching — one call per batch. Failure here is
        // recorded but does NOT fail the run; posts save with imageUrls: [].
        let imageMap = {};
        if (form.imageStrategy === 'ai_vision' && candidates.length > 0 && genPosts.length > 0) {
          try {
            const { prompt: matchPrompt } = buildImageMatchPrompt({
              captions: genPosts.map((p) => p.content || ''),
              candidates,
            });
            const matchRaw = await base44.integrations.Core.InvokeLLM({ prompt: matchPrompt });
            const matchArr = parseLLM(matchRaw);
            (Array.isArray(matchArr) ? matchArr : []).forEach((item) => {
              // VALIDATE every returned id against the candidate map.
              if (item && validIds.has(item.image_id)) {
                imageMap[item.caption_index] = item.image_id;
              }
            });
          } catch (e) {
            await base44.entities.SocialCampaign.update(cid, {
              lastError: `Image matching failed: ${String(e?.message || e)}`,
            });
          }
        }

        // Write the batch.
        for (let i = 0; i < genPosts.length; i++) {
          const gp = genPosts[i];
          const globalIndex = done + i;
          const screen = screenFields(gp.content || '', gp.hashtags || '');
          const imageUrls = resolveImageUrls(globalIndex, imageMap[i]);
          await base44.entities.SocialPost.create({
            campaignId: cid,
            category: gp.category || form.category,
            pillar: gp.pillar || form.pillars[globalIndex % (form.pillars.length || 1)] || 'quiet',
            platform: form.platforms[globalIndex % (form.platforms.length || 1)] || 'instagram',
            content: gp.content || '',
            hashtags: gp.hashtags || '',
            angle: gp.angle || '',
            imageHint: gp.imageHint || '',
            imageUrls,
            status: 'draft',
            generatedBy: 'ai',
            timezone: 'America/Chicago',
            flagged: screen.flagged,
            flaggedTerms: screen.terms,
          });
        }

        done += batchCount;
        setGen((s) => ({ ...s, done }));
      } catch (err) {
        // Stop, keep everything already written, mark the campaign failed.
        await base44.entities.SocialCampaign.update(cid, {
          generationStatus: 'failed',
          lastError: String(err?.message || err),
          postCount: done,
        });
        queryClient.invalidateQueries(['socialPosts']);
        queryClient.invalidateQueries(['socialCampaigns']);
        setGen({ running: false, done, total, error: String(err?.message || err), complete: false });
        return;
      }
    }

    await base44.entities.SocialCampaign.update(cid, {
      generationStatus: 'complete',
      postCount: total,
    });
    queryClient.invalidateQueries(['socialPosts']);
    queryClient.invalidateQueries(['socialCampaigns']);
    setGen({ running: false, done: total, total, error: null, complete: true });
  };

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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-[rgb(248,246,242)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light text-[rgb(107,85,64)]">
            {isEditing ? 'Edit Campaign' : 'New Campaign'}
          </DialogTitle>
        </DialogHeader>

        {locked && (
          <div className="text-sm rounded p-2 bg-white border border-[rgb(235,225,213)] text-[rgb(120,120,120)]">
            Posts already generated. Delete the campaign to change these — only title and goal are editable.
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4].map((s) => (
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
                    disabled={locked}
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
                disabled={locked}
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
              <Select value={form.category} onValueChange={(v) => set({ category: v })} disabled={locked}>
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
                  <label key={p} className={`flex items-center gap-2 ${locked ? 'opacity-60' : 'cursor-pointer'}`}>
                    <Checkbox
                      checked={form.platforms.includes(p)}
                      onCheckedChange={() => togglePlatform(p)}
                      disabled={locked}
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
                  <label key={p} className={`flex items-center gap-2 ${locked ? 'opacity-60' : 'cursor-pointer'}`}>
                    <Checkbox
                      checked={form.pillars.includes(p)}
                      onCheckedChange={() => togglePillar(p)}
                      disabled={locked}
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

        {/* Step 4 — Generate */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <Label className="text-[rgb(45,45,45)]">Topics / keywords</Label>
              <Textarea
                value={form.topics}
                onChange={(e) => set({ topics: e.target.value })}
                placeholder="What should these posts cover? (from Whitney)"
                className="mt-2 bg-white"
                rows={3}
                disabled={locked || gen.running}
              />
            </div>

            <div>
              <Label className="text-[rgb(45,45,45)]">Image strategy</Label>
              <RadioGroup
                value={form.imageStrategy}
                onValueChange={(v) => set({ imageStrategy: v })}
                className="mt-2 space-y-2"
                disabled={locked || gen.running}
              >
                {[
                  { v: 'none', label: 'No images' },
                  { v: 'fixed', label: 'One fixed image for all posts' },
                  { v: 'folder', label: 'Rotate through a folder' },
                  { v: 'ai_vision', label: 'AI matches images to captions' },
                ].map((opt) => (
                  <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value={opt.v} id={`img-${opt.v}`} />
                    <span className="text-sm text-[rgb(45,45,45)]">{opt.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {form.imageStrategy === 'fixed' && (
              <div>
                <Label className="text-[rgb(45,45,45)]">Image</Label>
                <Select value={form.fixedImageId} onValueChange={(v) => set({ fixedImageId: v })} disabled={locked || gen.running}>
                  <SelectTrigger className="mt-2 bg-white"><SelectValue placeholder="Choose an image" /></SelectTrigger>
                  <SelectContent>
                    {(images || []).map((img) => (
                      <SelectItem key={img.id} value={img.id}>{img.name || img.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.imageStrategy === 'folder' && (
              <div>
                <Label className="text-[rgb(45,45,45)]">Folder</Label>
                <Select value={form.folder} onValueChange={(v) => set({ folder: v })} disabled={locked || gen.running}>
                  <SelectTrigger className="mt-2 bg-white"><SelectValue placeholder="Choose a folder" /></SelectTrigger>
                  <SelectContent>
                    {folders.length === 0 && <SelectItem value="none" disabled>No folders found</SelectItem>}
                    {folders.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Warn (don't block): Instagram/TikTok can't publish text-only
                posts, so image strategy 'none' yields unpublishable drafts. */}
            {form.imageStrategy === 'none' &&
              form.platforms.some((p) => PHOTO_REQUIRED_PLATFORMS.includes(p)) && (
                <div
                  className="flex items-start gap-2 text-sm rounded p-2"
                  style={{ color: 'rgb(180,80,80)', background: 'rgba(180,80,80,0.08)' }}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Instagram and TikTok require photos. Posts for those platforms will
                    not be publishable with image strategy set to None.
                  </span>
                </div>
              )}

            {/* Progress / status */}
            {(gen.running || gen.done > 0 || gen.error || gen.complete) && (
              <div className="space-y-2">
                <Progress value={gen.total ? (gen.done / gen.total) * 100 : 0} />
                <p className="text-sm text-[rgb(120,120,120)]">
                  {gen.error
                    ? `Stopped after ${gen.done} of ${gen.total}.`
                    : gen.complete
                      ? `Generated ${gen.done} of ${gen.total}.`
                      : `Generating ${gen.done} of ${gen.total}…`}
                </p>
                {gen.error && (
                  <div className="text-sm rounded p-2" style={{ color: 'rgb(180,80,80)', background: 'rgba(180,80,80,0.08)' }}>
                    {gen.error}
                  </div>
                )}
                {gen.complete && (
                  <p className="text-sm text-[rgb(150,170,155)]">
                    Posts are in the Content Queue as drafts. Review flagged captions before scheduling.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <div className="flex gap-3 pt-4">
          {step > 1 && step < 4 && !gen.running && (
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
              onClick={() => setStep(4)}
              disabled={form.platforms.length === 0}
              className="flex-1 bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white"
            >
              Continue to Generate
            </Button>
          )}
          {step === 4 && !gen.complete && !locked && (
            <Button
              onClick={() => generatePosts(gen.error ? gen.done : 0)}
              disabled={gen.running || form.platforms.length === 0}
              className="flex-1 bg-[rgb(150,170,155)] hover:bg-[rgb(130,150,135)] text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {gen.running ? 'Generating…' : gen.error ? `Retry (${gen.total - gen.done} left)` : 'Generate Posts'}
            </Button>
          )}
          {/* Edit mode: persist field changes without generating. */}
          {isEditing && !gen.running && (
            <Button
              onClick={saveEdits}
              disabled={saving}
              variant="outline"
              className="flex-1 text-[rgb(107,85,64)] border-[rgb(235,225,213)]"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          )}
          {step === 4 && gen.complete && !isEditing && (
            <Button
              onClick={onClose}
              className="flex-1 bg-[rgb(107,85,64)] hover:bg-[rgb(85,65,45)] text-white"
            >
              Done
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