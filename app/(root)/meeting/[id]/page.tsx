'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { StreamCall, StreamTheme } from '@stream-io/video-react-sdk';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader } from 'lucide-react';

import { useGetCallById } from '@/hooks/useGetCallById';
import Alert from '@/components/Alert';
import MeetingSetup from '@/components/MeetingSetup';
import MeetingRoom from '@/components/MeetingRoom';
import WaitingRoomParticipant from '@/components/WaitingRoomParticipant';

const MeetingPage = () => {
  const { id } = useParams();
  const { isLoaded, user } = useUser();
  const { call, isCallLoading } = useGetCallById(id);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPersonalRoom = !!searchParams.get('personal');

  // Check if the current user is the host (personal room)
  const isHost = isPersonalRoom && user?.id === id;

  useEffect(() => {
    // If this user is joining a personal room and is not the host
    // put them in a waiting room
    if (call && isLoaded && !isCallLoading && !isHost && isPersonalRoom) {
      setIsInWaitingRoom(true);
    } else {
      setIsInWaitingRoom(false);
    }
  }, [call, isLoaded, isCallLoading, isHost, isPersonalRoom]);

  if (!isLoaded || isCallLoading) return <Loader />;

  if (!call) return (
    <p className="text-center text-3xl font-bold text-white">
      Call Not Found
    </p>
  );

  return (
    <main className="h-screen w-full">
      <StreamCall call={call}>
        <StreamTheme>
          {isInWaitingRoom ? (
            <WaitingRoomParticipant meetingId={id as string} />
          ) : !isSetupComplete ? (
            <MeetingSetup setIsSetupComplete={setIsSetupComplete} />
          ) : (
            <MeetingRoom />
          )}
        </StreamTheme>
      </StreamCall>
    </main>
  );
};

export default MeetingPage;
