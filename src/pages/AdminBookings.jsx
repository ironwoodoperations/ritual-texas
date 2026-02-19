import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { 
  Calendar, Search, Eye, 
  Mail, Phone, MoreHorizontal, Leaf, ArrowLeft, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminBookings() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('cloudbeds');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (userData.role !== 'admin') {
          window.location.href = createPageUrl('Home');
        }
      } catch (e) {
        base44.auth.redirectToLogin(createPageUrl('AdminBookings'));
      }
    };
    loadUser();
  }, []);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date', 200),
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-bookings']);
    },
  });

  const filteredBookings = bookings?.filter(b => {
    const matchesSearch = 
      b.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.confirmation_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.guest_email?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || b.booking_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    checked_in: 'bg-blue-100 text-blue-800',
    checked_out: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
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
              <h1 className="text-xl font-light text-[rgb(107,85,64)]">Bookings</h1>
              <p className="text-sm text-[rgb(45,45,45)]">Manage all reservations</p>
            </div>
          </div>
          <Link 
            to={createPageUrl('AdminDashboard')}
            className="flex items-center gap-2 text-[rgb(150,170,155)]"
          >
            <Leaf className="w-5 h-5" />
            <span className="text-sm">Dashboard</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(45,45,45)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or confirmation code..."
              className="pl-10 border-[rgb(235,225,213)]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 border-[rgb(235,225,213)]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bookings Table */}
        <div className="bg-white border border-[rgb(235,225,213)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[rgb(235,225,213)]">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Guest</th>
                  <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Room</th>
                  <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Dates</th>
                  <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Total</th>
                  <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-[rgb(107,85,64)]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgb(235,225,213)]">
                {filteredBookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-[rgb(248,246,242)]">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-[rgb(107,85,64)]">{booking.guest_name}</p>
                        <p className="text-xs text-[rgb(45,45,45)]">{booking.confirmation_code}</p>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[rgb(45,45,45)]">{booking.room_name}</td>
                    <td className="p-4 text-sm text-[rgb(45,45,45)]">
                      {format(new Date(booking.check_in_date), 'MMM d')} - {format(new Date(booking.check_out_date), 'MMM d')}
                    </td>
                    <td className="p-4 text-sm text-[rgb(107,85,64)]">${booking.grand_total}</td>
                    <td className="p-4">
                      <Badge className={statusColors[booking.booking_status]}>
                        {booking.booking_status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-2 hover:bg-[rgb(235,225,213)] rounded">
                          <MoreHorizontal className="w-4 h-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setSelectedBooking(booking)}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateBookingMutation.mutate({
                              id: booking.id,
                              data: { booking_status: 'confirmed' }
                            })}
                          >
                            Confirm Booking
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateBookingMutation.mutate({
                              id: booking.id,
                              data: { booking_status: 'checked_in' }
                            })}
                          >
                            Mark Checked In
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => updateBookingMutation.mutate({
                              id: booking.id,
                              data: { booking_status: 'checked_out' }
                            })}
                          >
                            Mark Checked Out
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => updateBookingMutation.mutate({
                              id: booking.id,
                              data: { booking_status: 'cancelled' }
                            })}
                          >
                            Cancel Booking
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredBookings.length === 0 && (
            <p className="p-8 text-center text-[rgb(45,45,45)]">No bookings found</p>
          )}
        </div>
      </main>

      {/* Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgb(248,246,242)]">
          {selectedBooking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="text-xl font-light text-[rgb(107,85,64)]">
                    Booking Details
                  </span>
                  <span className="text-sm text-[rgb(150,170,155)]">
                    {selectedBooking.confirmation_code}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[rgb(150,170,155)]">Guest</p>
                    <p className="text-[rgb(107,85,64)]">{selectedBooking.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[rgb(150,170,155)]">Contact</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[rgb(45,45,45)]" />
                      <span className="text-sm">{selectedBooking.guest_email}</span>
                    </div>
                    {selectedBooking.guest_phone && (
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4 text-[rgb(45,45,45)]" />
                        <span className="text-sm">{selectedBooking.guest_phone}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-[rgb(150,170,155)]">Room</p>
                    <p className="text-[rgb(107,85,64)]">{selectedBooking.room_name}</p>
                    <p className="text-sm text-[rgb(45,45,45)]">{selectedBooking.num_guests} guests</p>
                  </div>
                  <div>
                    <p className="text-sm text-[rgb(150,170,155)]">Dates</p>
                    <p className="text-[rgb(107,85,64)]">
                      {format(new Date(selectedBooking.check_in_date), 'MMM d')} - {format(new Date(selectedBooking.check_out_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {selectedBooking.wellness_intention && (
                  <div className="p-4 bg-[rgb(235,225,213)]">
                    <p className="text-sm text-[rgb(150,170,155)]">Wellness Intention</p>
                    <p className="text-[rgb(45,45,45)] italic">"{selectedBooking.wellness_intention}"</p>
                  </div>
                )}

                {selectedBooking.special_requests && (
                  <div className="p-4 border border-[rgb(196,155,145)]">
                    <p className="text-sm text-[rgb(196,155,145)]">Special Requests</p>
                    <p className="text-[rgb(45,45,45)]">{selectedBooking.special_requests}</p>
                  </div>
                )}

                {(selectedBooking.package_name || selectedBooking.treatments?.length > 0) && (
                  <div>
                    <p className="text-sm text-[rgb(150,170,155)] mb-2">Spa & Wellness</p>
                    {selectedBooking.package_name && (
                      <p className="text-[rgb(107,85,64)]">{selectedBooking.package_name}</p>
                    )}
                    {selectedBooking.treatments?.map((t, i) => (
                      <p key={i} className="text-sm text-[rgb(45,45,45)]">• {t.treatment_name}</p>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-[rgb(235,225,213)]">
                  <div>
                    <p className="text-sm text-[rgb(45,45,45)]">Room: ${selectedBooking.room_total}</p>
                    {selectedBooking.treatments_total > 0 && (
                      <p className="text-sm text-[rgb(45,45,45)]">Spa: ${selectedBooking.treatments_total}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-light text-[rgb(107,85,64)]">${selectedBooking.grand_total}</p>
                    <Badge className={statusColors[selectedBooking.booking_status]}>
                      {selectedBooking.booking_status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}