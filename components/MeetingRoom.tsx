'use client';
import React, { useState, useEffect } from 'react';
import {
  CallControls,
  CallParticipantsList,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutList, MessageSquare, UserPlus } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Loader from './Loader';
import EndCallButton from './EndCallButton';
import RaiseHandButton from './RaiseHandButton';
import ChatPanel from './ChatPanel';
import WaitingRoom from './WaitingRoom';
import { cn } from '@/lib/utils';

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

// Add CSS to prevent video flickering
const videoStabilizationStyles = `
  .str-video__participant-view video {
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1000px;
    will-change: transform;
  }
  
  .str-video__participant-view {
    transition: none !important;
  }
  
  .str-video__participant-view__container {
    transition: none !important;
  }
`;

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const router = useRouter();
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const { useCallCallingState, useCallMembers } = useCallStateHooks();
  const call = useCall();

  const callingState = useCallCallingState();
  const members = useCallMembers();

  // Check if we have more than 4 participants
  const participantCount = members ? Object.keys(members).length : 0;
  
  // Apply CSS fix for video flickering
  useEffect(() => {
    // Create a style element and add it to the head
    const styleElement = document.createElement('style');
    styleElement.textContent = videoStabilizationStyles;
    document.head.appendChild(styleElement);
    
    // Disable hardware acceleration for videos if they exist
    const applyVideoFixes = () => {
      const videoElements = document.querySelectorAll('.str-video__participant-view video');
      videoElements.forEach(video => {
        if (video instanceof HTMLVideoElement) {
          video.style.transform = 'translateZ(0)';
          video.style.backfaceVisibility = 'hidden';
          video.style.willChange = 'transform';
          
          // Force the browser to reconsider how it renders this element
          video.style.filter = 'brightness(1)';
        }
      });
    };
    
    // Apply immediately and then periodically to catch new videos
    applyVideoFixes();
    const interval = setInterval(applyVideoFixes, 2000);
    
    return () => {
      document.head.removeChild(styleElement);
      clearInterval(interval);
    };
  }, []);
  
  // Manage waiting participants
  const [waitingParticipants, setWaitingParticipants] = useState<Array<{id: string, name: string}>>([]);
  const [isLoadingWaitingRoom, setIsLoadingWaitingRoom] = useState(false);
  
  // Check for waiting participants in the lobby
  useEffect(() => {
    if (!call) return;
    
    const fetchWaitingParticipants = async () => {
      try {
        setIsLoadingWaitingRoom(true);
        // Stream doesn't have a direct 'waiting' role, so we check for custom status
        const participants = await call.queryMembers({
          filter_conditions: {
            custom: { status: 'waiting' }
          },
        });
        
        // Format participants for display
        const formattedParticipants = participants.members.map(member => ({
          id: member.user.id,
          name: member.user.name || member.user.id,
        }));
        
        setWaitingParticipants(formattedParticipants);
      } catch (error) {
        console.error('Error fetching waiting participants:', error);
      } finally {
        setIsLoadingWaitingRoom(false);
      }
    };
    
    // Initial fetch
    fetchWaitingParticipants();
    
    // Set up polling or subscription for waiting room updates
    const intervalId = setInterval(fetchWaitingParticipants, 3000);
    
    // Also listen for custom events that might signal new waiting participants
    const handleCustomEvent = (event: any) => {
      if (event.type === 'custom' && event.custom?.type === 'waiting_participant') {
        fetchWaitingParticipants();
      }
    };
    
    call.on('custom', handleCustomEvent);
    
    return () => {
      clearInterval(intervalId);
      call.off('custom', handleCustomEvent);
    };
  }, [call]);
  
  // Admit participant from waiting room
  const handleAdmitParticipant = async (participantId: string) => {
    if (!call) return;
    try {
      // Change the participant's status from 'waiting' to 'admitted'
      await call.updateCallMembers({
        update_members: [
          {
            user_id: participantId,
            custom: { status: 'admitted' }
          }
        ]
      });
      
      // Send a custom event to notify the participant
      await call.sendCustomEvent({
        type: 'participant_admitted', 
        user_id: participantId
      });
      
      // Update local state
      setWaitingParticipants(current => 
        current.filter(p => p.id !== participantId)
      );
    } catch (error) {
      console.error('Error admitting participant:', error);
    }
  };
  
  // Automatically switch to grid layout if more than 4 participants
  useEffect(() => {
    if (participantCount > 4 && layout !== 'grid') {
      setLayout('grid');
    }
  }, [participantCount, layout]);

  if (callingState !== CallingState.JOINED) return <Loader />;

  const CallLayout = () => {
    switch (layout) {
      case 'grid':
        return <PaginatedGridLayout />;
      case 'speaker-right':
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden pt-4 text-white">
      {showChat && (
        <div className="fixed right-0 top-0 h-full w-[350px] bg-white text-black z-20 shadow-lg">
          <ChatPanel />
        </div>
      )}
      
      {showWaitingRoom && (
        <div className="fixed right-0 top-0 h-full w-[350px] bg-white text-black z-20 shadow-lg overflow-y-auto">
          <WaitingRoom 
            participants={waitingParticipants} 
            onAdmit={handleAdmitParticipant}
            isLoading={isLoadingWaitingRoom}
          />
        </div>
      )}

      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>

        {showParticipants && (
          <div className="absolute top-20 right-4 z-20 bg-white rounded shadow-lg">
            <CallParticipantsList onClose={() => setShowParticipants(false)} />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 flex w-full items-center justify-center gap-3 p-3 bg-black bg-opacity-40">
        <CallControls onLeave={() => router.push(`/`)} />

        <DropdownMenu>
          <DropdownMenuTrigger className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
            <LayoutList size={20} className="text-white" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
            {['Grid', 'Speaker-Left', 'Speaker-Right'].map((item, index) => (
              <div key={index}>
                <DropdownMenuItem
                  onClick={() =>
                    setLayout(item.toLowerCase() as CallLayoutType)
                  }
                >
                  {item}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-dark-1" />
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button onClick={() => setShowParticipants((prev) => !prev)}>
          <div className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
            <Users size={20} className="text-white" />
          </div>
        </button>

        <button onClick={() => setShowChat((prev) => !prev)}>
          <div className="cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]">
            <MessageSquare size={20} className="text-white" />
          </div>
        </button>
        
        {isPersonalRoom && (
          <button onClick={() => setShowWaitingRoom((prev) => !prev)}>
            <div className={cn(
              "cursor-pointer rounded-2xl bg-[#19232d] px-4 py-2 hover:bg-[#4c535b]",
              waitingParticipants.length > 0 && "relative"
            )}>
              <UserPlus size={20} className="text-white" />
              {waitingParticipants.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                  {waitingParticipants.length}
                </span>
              )}
            </div>
          </button>
        )}

        <RaiseHandButton />

        {!isPersonalRoom && <EndCallButton />}
      </div>
    </section>
  );
};

export default MeetingRoom;
