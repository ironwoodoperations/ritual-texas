import React from 'react';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function BookingFlow() {
  return <Navigate to={createPageUrl('GuestBookNow')} replace />;
}
