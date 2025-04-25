'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCall, useCallStateHooks, CallingState } from '@stream-io/video-react-sdk';
import { Loader } from 'lucide-react';

export const WaitingRoomParticipant = ({ meetingId }: { meetingId: string }) => {
  const router = useRouter();
  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const [waitingTime, setWaitingTime] = useState(0);
  
  useEffect(() => {
    // Start waiting timer
    const interval = setInterval(() => {
      setWaitingTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Format wait time as MM:SS
  const formatWaitTime = () => {
    const minutes = Math.floor(waitingTime / 60);
    const seconds = waitingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Check if the participant has been admitted
  useEffect(() => {
    if (!call) return;
    
    // Listen for admission events
    const handleCustomEvent = (event: any) => {
      console.log("Received custom event:", event);
      if (
        event.type === 'custom' && 
        event.custom?.type === 'participant_admitted' && 
        event.custom?.user_id === call.currentUserId
      ) {
        // We've been admitted, redirect to the meeting
        router.push(`/meeting/${meetingId}`);
      }
    };
    
    // Listen for status changes in call members
    const checkAdmissionStatus = () => {
      if (!call?.state?.members) return;
      
      // Check if our status has been changed to 'admitted'
      const currentMember = Object.values(call.state.members).find(
        (member: any) => member.user.id === call.currentUserId
      );
      
      if (currentMember?.custom?.status === 'admitted') {
        // We've been admitted, redirect to the meeting
        router.push(`/meeting/${meetingId}`);
      }
    };
    
    call.on('custom', handleCustomEvent);
    
    // Check our status periodically
    const intervalId = setInterval(checkAdmissionStatus, 2000);
    
    return () => {
      call.off('custom', handleCustomEvent);
      clearInterval(intervalId);
    };
  }, [call, router, meetingId]);
  
  // Also check if our calling state changes
  useEffect(() => {
    if (callingState === CallingState.JOINING || callingState === CallingState.JOINED) {
      router.push(`/meeting/${meetingId}`);
    }
  }, [callingState, router, meetingId]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <Image
          src="/icons/waiting.svg"
          alt="Waiting"
          width={120}
          height={120}
          className="mx-auto mb-6"
        />
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Waiting to be admitted
        </h1>
        <p className="text-gray-600 mb-6">
          The meeting host will let you in soon. Please wait.
        </p>
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-xl font-medium text-gray-700">
              Wait time: {formatWaitTime()}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Loader className="animate-spin mr-2" size={20} />
          <span className="text-gray-500">Waiting for host to admit you...</span>
        </div>
        
        <button 
          className="mt-8 bg-red-500 hover:bg-red-600 text-white font-medium px-6 py-2 rounded-lg transition-colors"
          onClick={() => {
            // Leave the waiting room
            if (call) {
              call.leave();
            }
            router.push('/');
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default WaitingRoomParticipant; 