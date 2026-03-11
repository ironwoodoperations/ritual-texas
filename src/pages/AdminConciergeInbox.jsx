import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, MessageSquare, Package, CheckCircle, Clock, Mail, Plus, X, Save, CalendarCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
import { motion } from 'framer-motion';

function buildReplyEmail(inq) {
  const guestName = inq.full_name || inq.guest_name || inq.name || '';
  const pkg = inq.package_title || inq.package_name || '';
  const checkin = inq.preferred_checkin || '';
  const checkout = inq.preferred_checkout || '';
  const guests = inq.guests || '';
  const originalMsg = inq.message || '';

  const subject = encodeURIComponent(`Re: ${pkg ? pkg + ' Inquiry' : 'Package Inquiry'} — Hotel RITUAL`);
  const body = encodeURIComponent(
    `Hi ${guestName},\n\nThank you for your interest${pkg ? ` in the ${pkg}` : ''}!\n\n` +
    `[Your reply here]\n\n` +
    `—\n\nHotel RITUAL\n(903) 810-6695\n\n` +
    `────────────────────\nOriginal Inquiry:\n${pkg ? `Package: ${pkg}\n` : ''}` +
    `${checkin ? `Check-in: ${checkin}\n` : ''}` +
    `${checkout ? `Check-out: ${checkout}\n` : ''}` +
    `${guests ? `Guests: ${guests}\n` : ''}` +
    `${originalMsg ? `\nMessage: ${originalMsg}` : ''}`
  );
  return `mailto:${inq.email || inq.guest_email || ''}?subject=${subject}&body=${body}`;
}

function CreateIntakeModal({ inq, onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const guestName = inq.full_name || inq.guest_name || inq.name || '';
  const email = inq.email || inq.guest_email || '';
  const phone = inq.phone || inq.guest_phone || '';
  const pkg = inq.package_title || inq.package_name || '';
  const checkin = inq.preferred_checkin || '';
  const checkout = inq.preferred_checkout || '';

  const defaultNotes = [
    pkg ? `Package Inquiry: ${pkg}` : '',
    inq.message ? `Guest message: ${inq.message}` : '',
  ].filter(Boolean).join('\n\n');

  const [notes, setNotes] = useState(defaultNotes);

  async function create() {
    setSaving(true);
    await base44.entities.HotelTreatmentIntake.create({
      guestName,
      email,
      phone,
      checkInDate: checkin,
      checkOutDate: checkout,
      numberOfGuests: inq.guests || 1,
      bookingStatus: 'new_inquiry',
      verificationStatus: 'pending',
      preferredContactMethod: 'email',
      internalNotes: notes,
      treatmentsRequested: pkg ? `Interested in: ${pkg}` : '',
    });
    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(235,225,213)]">
          <h2 className="text-sm font-medium text-[rgb(107,85,64)]">Create Intake from Inquiry</h2>
          <button onClick={onClose} className="p-1 hover:bg-[rgb(248,246,242)] rounded"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-[rgb(248,246,242)] rounded-xl p-3 text-sm space-y-1">
            <p className="font-medium text-[rgb(45,45,45)]">{guestName}</p>
            {email && <p className="text-xs text-[rgb(107,85,64)]">{email}</p>}
            {phone && <p className="text-xs text-[rgb(107,85,64)]">{phone}</p>}
            {pkg && <p className="text-xs text-[rgb(150,150,150)]">Package: {pkg}</p>}
            {checkin && <p className="text-xs text-[rgb(150,150,150)]">Check-in: {checkin}{checkout ? ` → ${checkout}` : ''}</p>}
          </div>
          <div>
            <label className="text-xs text-[rgb(150,150,150)] mb-1 block">Internal Notes (pre-filled from inquiry)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={5}
              className="w-full border border-[rgb(235,225,213)] rounded-xl px-3 py-2 text-sm text-[rgb(45,45,45)] bg-white focus:outline-none focus:border-[rgb(198,182,165)] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-[rgb(235,225,213)] text-sm text-[rgb(45,45,45)] hover:bg-[rgb(248,246,242)]">Cancel</button>
            <button onClick={create} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[rgb(107,85,64)] text-white text-sm hover:opacity-90 disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Creating…' : 'Create Intake'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminConciergeInbox() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('messages');
  const [intakeModal, setIntakeModal] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') window.location.href = createPageUrl('Home');
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('AdminConciergeInbox'));
      }
    };
    loadUser();
  }, []);

  const { data: contactLeads = [] } = useQuery({
    queryKey: ['contact-leads'],
    queryFn: () => base44.entities.RestaurantContactLeads.list('-created_date', 100),
  });

  const { data: packageInquiries = [] } = useQuery({
    queryKey: ['pkg-inquiries-inbox'],
    queryFn: () => base44.entities.PackageInquiry.list('-created_date', 100),
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RestaurantContactLeads.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['contact-leads']),
  });

  const updatePkgMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PackageInquiry.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['pkg-inquiries-inbox']),
  });

  const deletePkgMutation = useMutation({
    mutationFn: (id) => base44.entities.PackageInquiry.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['pkg-inquiries-inbox']),
  });

  const newContacts = contactLeads.filter(l => l.status === 'new');
  const newPackageInquiries = packageInquiries.filter(i => i.status === 'new');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(248,246,242)]">
        <div className="animate-spin w-8 h-8 border-2 border-[rgb(150,170,155)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs = [
    { id: 'messages', label: 'Guest Messages', count: newContacts.length },
    { id: 'packages', label: 'Package Inquiries', count: newPackageInquiries.length },
  ];

  return (
    <div className="h-screen flex flex-col bg-[rgb(248,246,242)] overflow-hidden">
      {intakeModal && (
        <CreateIntakeModal
          inq={intakeModal}
          onClose={() => setIntakeModal(null)}
          onCreated={() => queryClient.invalidateQueries(['pkg-inquiries-inbox'])}
        />
      )}
      {/* Sticky Header */}
      <header className="bg-white border-b border-[rgb(235,225,213)] px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl('AdminDashboard')} className="p-2 hover:bg-[rgb(235,225,213)] rounded">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-light text-[rgb(107,85,64)]">Concierge Inbox</h1>
            <p className="text-xs text-[rgb(150,150,150)]">{newContacts.length + newPackageInquiries.length} unread</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mt-3 border-b border-[rgb(235,225,213)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[rgb(107,85,64)] text-[rgb(107,85,64)]'
                  : 'border-transparent text-[rgb(150,150,150)] hover:text-[rgb(107,85,64)]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="text-[10px] bg-[rgb(107,85,64)] text-white px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-3">

          {activeTab === 'messages' && (
            <>
              {contactLeads.length === 0 && (
                <p className="text-sm text-[rgb(150,150,150)] py-10 text-center">No messages yet.</p>
              )}
              {contactLeads.map((lead, i) => (
                <motion.div key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`bg-white border rounded-xl p-4 ${lead.status === 'new' ? 'border-[rgb(107,85,64)]' : 'border-[rgb(235,225,213)]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0 text-[rgb(150,170,155)]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-medium text-[rgb(107,85,64)]">{lead.name}</span>
                          {lead.status === 'new' && (
                            <span className="text-[10px] bg-[rgb(107,85,64)] text-white px-2 py-0.5 rounded-full">NEW</span>
                          )}
                          <span className="text-xs text-[rgb(150,150,150)]">{fmtDate(lead.created_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {lead.email && <a href={`mailto:${lead.email}`} className="text-xs text-[rgb(107,85,64)] hover:underline">{lead.email}</a>}
                          {lead.phone && <a href={`sms:${lead.phone}`} className="text-xs text-[rgb(107,85,64)] hover:underline">{lead.phone}</a>}
                        </div>
                        <p className="text-sm text-[rgb(45,45,45)] leading-relaxed">{lead.message}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateContactMutation.mutate({ id: lead.id, data: { status: lead.status === 'new' ? 'replied' : 'new' } })}
                      className="flex-shrink-0 p-1.5 hover:bg-[rgb(235,225,213)] rounded transition-colors"
                      title={lead.status === 'new' ? 'Mark as replied' : 'Mark as new'}
                    >
                      {lead.status === 'new'
                        ? <Clock className="w-4 h-4 text-[rgb(150,150,150)]" />
                        : <CheckCircle className="w-4 h-4 text-[rgb(150,170,155)]" />
                      }
                    </button>
                  </div>
                </motion.div>
              ))}
            </>
          )}

          {activeTab === 'packages' && (
            <>
              {packageInquiries.length === 0 && (
                <p className="text-sm text-[rgb(150,150,150)] py-10 text-center">No inquiries yet.</p>
              )}
              {packageInquiries.map((inq, i) => (
                <motion.div key={inq.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`bg-white border rounded-xl p-4 ${inq.status === 'new' ? 'border-[rgb(107,85,64)]' : 'border-[rgb(235,225,213)]'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Package className="w-5 h-5 mt-0.5 flex-shrink-0 text-[rgb(196,155,145)]" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-medium text-[rgb(107,85,64)]">{inq.full_name || inq.guest_name || inq.name}</span>
                          {inq.status === 'new' && (
                            <span className="text-[10px] bg-[rgb(107,85,64)] text-white px-2 py-0.5 rounded-full">NEW</span>
                          )}
                          <span className="text-xs text-[rgb(150,150,150)]">{inq.created_date ? format(new Date(inq.created_date), 'MMM d, h:mm a') : ''}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {(inq.email || inq.guest_email) && <a href={`mailto:${inq.email || inq.guest_email}`} className="text-xs text-[rgb(107,85,64)] hover:underline">{inq.email || inq.guest_email}</a>}
                          {(inq.phone || inq.guest_phone) && (() => {
            const phone = inq.phone || inq.guest_phone;
            const pkg = inq.package_title || inq.package_name || '';
            const msgParts = [
              `Hi ${inq.full_name || inq.guest_name || ''}!`,
              pkg ? `Regarding your inquiry about: ${pkg}` : '',
              inq.message ? `\n\nYour message: "${inq.message}"` : '',
              '\n\n— Hotel RITUAL'
            ].filter(Boolean).join(' ');
            const smsHref = `sms:${phone}&body=${encodeURIComponent(msgParts)}`;
            return <a href={smsHref} className="text-xs text-[rgb(107,85,64)] hover:underline">{phone}</a>;
          })()}
                        </div>
                        {(inq.package_title || inq.package_name) && (
                          <p className="text-xs font-medium text-[rgb(196,155,145)] mb-1">Package: {inq.package_title || inq.package_name}</p>
                        )}
                        {(inq.preferred_checkin || inq.preferred_checkout) && (
                          <p className="text-xs text-[rgb(150,150,150)] mb-1">
                            {inq.preferred_checkin && `Check-in: ${inq.preferred_checkin}`}
                            {inq.preferred_checkin && inq.preferred_checkout && ' → '}
                            {inq.preferred_checkout && `Check-out: ${inq.preferred_checkout}`}
                            {inq.guests && ` · ${inq.guests} guest${inq.guests > 1 ? 's' : ''}`}
                          </p>
                        )}
                        {inq.message && (
                          <div className="bg-[rgb(248,246,242)] rounded-lg px-3 py-2 mt-2">
                            <p className="text-xs text-[rgb(150,150,150)] mb-0.5 font-medium">Guest Message</p>
                            <p className="text-sm text-[rgb(45,45,45)] leading-relaxed">{inq.message}</p>
                          </div>
                        )}
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          <a
                            href={buildReplyEmail(inq)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(107,85,64)] text-white text-xs hover:opacity-90 transition-opacity"
                          >
                            <Mail className="w-3 h-3" /> Reply via Email
                          </a>
                          <button
                            onClick={() => setIntakeModal(inq)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgb(150,170,155)] text-[rgb(150,170,155)] text-xs hover:bg-[rgb(240,245,241)] transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Create Intake
                          </button>
                          {inq.status !== 'completed_booked' && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Mark as booked and remove from inbox?')) {
                                  await deletePkgMutation.mutateAsync(inq.id);
                                }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgb(150,170,155)] bg-[rgb(150,170,155)] text-white text-xs hover:opacity-90 transition-opacity"
                            >
                              <CalendarCheck className="w-3 h-3" /> Completed — Booked
                            </button>
                          )}
                          {inq.status !== 'completed_not_booked' && (
                            <button
                              onClick={async () => {
                                // Save to MarketingCRM then delete
                                const existing = await base44.entities.MarketingCRM.filter({ source_ref_id: inq.id });
                                if (existing.length === 0) {
                                  await base44.entities.MarketingCRM.create({
                                    full_name: inq.full_name || inq.guest_name || '',
                                    email: inq.email || inq.guest_email || '',
                                    phone: inq.phone || inq.guest_phone || '',
                                    source: 'package_inquiry',
                                    source_ref_id: inq.id,
                                    package_interest: inq.package_title || inq.package_name || '',
                                    preferred_checkin: inq.preferred_checkin || '',
                                    preferred_checkout: inq.preferred_checkout || '',
                                    guests: inq.guests || 1,
                                    original_message: inq.message || '',
                                    tags: ['package_inquiry', inq.package_slug].filter(Boolean),
                                    status: 'active',
                                  });
                                }
                                await deletePkgMutation.mutateAsync(inq.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgb(198,182,165)] text-[rgb(107,85,64)] text-xs hover:bg-[rgb(248,246,242)] transition-colors"
                            >
                              <UserX className="w-3 h-3" /> Completed — Not Booked
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => updatePkgMutation.mutate({ id: inq.id, data: { status: inq.status === 'new' ? 'replied' : 'new' } })}
                      className="flex-shrink-0 p-1.5 hover:bg-[rgb(235,225,213)] rounded transition-colors"
                      title={inq.status === 'new' ? 'Mark as replied' : 'Mark as new'}
                    >
                      {inq.status === 'new'
                        ? <Clock className="w-4 h-4 text-[rgb(150,150,150)]" />
                        : <CheckCircle className="w-4 h-4 text-[rgb(150,170,155)]" />
                      }
                    </button>
                  </div>
                </motion.div>
              ))}
            </>
          )}

        </div>
      </div>
    </div>
  );
}