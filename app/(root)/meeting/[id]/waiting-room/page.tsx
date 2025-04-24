'use client';
import React from 'react';
import WaitingRoom from '@/components/WaitingRoom';

export default function WaitingRoomPage() {
  // TODO: Replace with real participants from call context
  const participants = ['User A', 'User B', 'User C'];
  const admit = (id: string) => {
    console.log('Admitted', id);
    // TODO: implement admit logic using call.connect / call.member permissions
  };

  return <WaitingRoom participants={participants} onAdmit={admit} />;
}
