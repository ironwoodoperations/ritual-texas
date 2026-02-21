import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, MessageSquare, Package, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function AdminConciergeInbox() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('messages');
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
                          <span className="text-xs text-[rgb(150,150,150)]">{lead.created_date ? format(new Date(lead.created_date), 'MMM d, h:mm a') : ''}</span>
                        </div>
                        <p className="text-xs text-[rgb(150,150,150)] mb-2">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p>
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
                          <span className="font-medium text-[rgb(107,85,64)]">{inq.guest_name || inq.name}</span>
                          {inq.status === 'new' && (
                            <span className="text-[10px] bg-[rgb(107,85,64)] text-white px-2 py-0.5 rounded-full">NEW</span>
                          )}
                          <span className="text-xs text-[rgb(150,150,150)]">{inq.created_date ? format(new Date(inq.created_date), 'MMM d, h:mm a') : ''}</span>
                        </div>
                        <p className="text-xs text-[rgb(150,150,150)] mb-2">{inq.guest_email || inq.email}{inq.guest_phone || inq.phone ? ` · ${inq.guest_phone || inq.phone}` : ''}</p>
                        {inq.package_name && <p className="text-xs font-medium text-[rgb(196,155,145)] mb-1">Package: {inq.package_name}</p>}
                        {inq.message && <p className="text-sm text-[rgb(45,45,45)] leading-relaxed">{inq.message}</p>}
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