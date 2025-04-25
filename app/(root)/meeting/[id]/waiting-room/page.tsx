'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { StreamCall, StreamTheme, useStreamVideoClient } from '@stream-io/video-react-sdk';
import { Loader } from 'lucide-react';

import { useGetCallById } from '@/hooks/useGetCallById';
import WaitingRoomParticipant from '@/components/WaitingRoomParticipant';

export default function WaitingRoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const { call, isCallLoading } = useGetCallById(id as string);
  const videoClient = useStreamVideoClient();
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!isLoaded || isCallLoading || !call || !videoClient || !user) return;

    // When this component loads, attempt to join the call as a waiting member
    const joinCall = async () => {
      try {
        setIsJoining(true);
        // We join the call with permissions to wait in the lobby
        await call.join({
          create: true,
          data: {
            custom: {
              status: 'waiting'
            }
          }
        });
        
        // Notify the meeting host that someone is waiting
        await call.sendCustomEvent({
          type: 'waiting_participant',
          user: {
            id: user.id,
            name: user.username || user.id,
          }
        });
      } catch (error) {
        console.error('Error joining call waiting room:', error);
        // If there's an error, redirect to the home page
        router.push('/');
      } finally {
        setIsJoining(false);
      }
    };

    joinCall();
  }, [isLoaded, isCallLoading, call, videoClient, user, router]);

  // Show loading state
  if (!isLoaded || isCallLoading || isJoining) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <Loader className="h-8 w-8 animate-spin text-gray-500 mb-4" />
        <p className="text-gray-700">Joining meeting waiting room...</p>
      </div>
    );
  }

  // If the call doesn't exist
  if (!call) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <p className="text-xl font-bold text-gray-800 mb-4">Meeting not found</p>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          onClick={() => router.push('/')}
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <StreamCall call={call}>
      <StreamTheme>
        <WaitingRoomParticipant meetingId={id as string} />
      </StreamTheme>
    </StreamCall>
  );
}
