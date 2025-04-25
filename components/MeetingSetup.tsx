'use client';
import { useEffect, useState } from 'react';
import {
  DeviceSettings,
  VideoPreview,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { useSearchParams } from 'next/navigation';
import { UserPlus } from 'lucide-react';

import Alert from './Alert';
import { Button } from './ui/button';

const MeetingSetup = ({
  setIsSetupComplete,
}: {
  setIsSetupComplete: (value: boolean) => void;
}) => {
  // https://getstream.io/video/docs/react/guides/call-and-participant-state/#call-state
  const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();
  const callStartsAt = useCallStartsAt();
  const callEndedAt = useCallEndedAt();
  const callTimeNotArrived =
    callStartsAt && new Date(callStartsAt) > new Date();
  const callHasEnded = !!callEndedAt;
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const [waitingParticipantsCount, setWaitingParticipantsCount] = useState(0);

  const call = useCall();

  if (!call) {
    throw new Error(
      'useStreamCall must be used within a StreamCall component.',
    );
  }

  // Check for waiting participants if this is a personal room
  useEffect(() => {
    if (!call || !isPersonalRoom) return;
    
    const checkWaitingParticipants = async () => {
      try {
        // In a real implementation, query for participants with waiting status
        const participants = await call.queryMembers({
          filter_conditions: {
            custom: { status: 'waiting' }
          },
        });
        
        setWaitingParticipantsCount(participants.members.length);
      } catch (error) {
        console.error('Error checking waiting participants:', error);
      }
    };
    
    // Check immediately and then every 5 seconds
    checkWaitingParticipants();
    const intervalId = setInterval(checkWaitingParticipants, 5000);
    
    return () => clearInterval(intervalId);
  }, [call, isPersonalRoom]);

  // https://getstream.io/video/docs/react/ui-cookbook/replacing-call-controls/
  const [isMicCamToggled, setIsMicCamToggled] = useState(false);

  useEffect(() => {
    if (isMicCamToggled) {
      call.camera.disable();
      call.microphone.disable();
    } else {
      call.camera.enable();
      call.microphone.enable();
    }
  }, [isMicCamToggled, call.camera, call.microphone]);

  if (callTimeNotArrived)
    return (
      <Alert
        title={`Your Meeting has not started yet. It is scheduled for ${callStartsAt.toLocaleString()}`}
      />
    );

  if (callHasEnded)
    return (
      <Alert
        title="The call has been ended by the host"
        iconUrl="/icons/call-ended.svg"
      />
    );

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 text-white">
      <h1 className="text-center text-2xl font-bold">Setup</h1>
      
      {isPersonalRoom && waitingParticipantsCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-500/30 rounded-lg flex items-center">
          <UserPlus size={20} className="mr-2" />
          <span>
            {waitingParticipantsCount} {waitingParticipantsCount === 1 ? 'participant is' : 'participants are'} waiting to join
          </span>
        </div>
      )}
      
      <VideoPreview />
      <div className="flex h-16 items-center justify-center gap-3">
        <label className="flex items-center justify-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={isMicCamToggled}
            onChange={(e) => setIsMicCamToggled(e.target.checked)}
          />
          Join with mic and camera off
        </label>
        <DeviceSettings />
      </div>
      <Button
        className="rounded-md bg-green-500 px-4 py-2.5"
        onClick={() => {
          call.join();

          setIsSetupComplete(true);
        }}
      >
        Join meeting
      </Button>
    </div>
  );
};

export default MeetingSetup;
