'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useCallStateHooks, useCall } from '@stream-io/video-react-sdk';

interface Message {
  sender: string;
  content: string;
  recipient: string;
  isPrivate: boolean;
}

interface Participant {
  id: string;
  name: string;
}

export default function ChatPanel() {
  const call = useCall();
  const { useCallMembers } = useCallStateHooks();
  const members = useCallMembers();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [recipient, setRecipient] = useState('Everyone');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update participants list whenever members change
  useEffect(() => {
    if (!call || !members) return;
    
    // Transform members into participants array
    const participantsList = Object.values(members).map((member: any) => {
      const userId = member.user?.id;
      
      // Create friendly display name
      let displayName = member.user?.name;
      if (!displayName || displayName === userId) {
        // Try to extract name from user ID format like "user_abcdef"
        displayName = userId.split('_')[1] || userId;
        // Make first letter uppercase if possible
        if (displayName) {
          displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        }
      }
      
      return {
        id: userId,
        name: displayName || userId
      };
    });
    
    // Filter out current user and sort alphabetically
    const filteredParticipants = participantsList
      .filter((p) => p.id !== call.currentUserId)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    setParticipants(filteredParticipants);
  }, [call, members]);

  // Handle receiving messages
  useEffect(() => {
    if (!call) return;

    const handleMessage = (event: any) => {
      console.log("Received event:", event);
      if (event.type !== 'custom' || !event.custom || event.custom.type !== 'message.new') return;

      const { user, content, recipient: messageRecipient } = event.custom;
      if (!content) return;

      const currentUserId = call?.currentUserId;
      
      // Only show messages that are for everyone or specifically for current user
      if (messageRecipient === 'Everyone' || messageRecipient === currentUserId) {
        // Get sender's display name
        const senderName = user?.name || getDisplayName(user?.id) || 'Unknown';
        // Get recipient's display name
        const recipientName = messageRecipient === 'Everyone' 
          ? 'Everyone' 
          : getDisplayName(messageRecipient);
        
        setMessages((prev) => [
          ...prev,
          {
            sender: senderName,
            content,
            recipient: recipientName,
            isPrivate: messageRecipient !== 'Everyone'
          },
        ]);
      }
    };

    call.on('custom', handleMessage);
    return () => {
      call.off('custom', handleMessage);
    };
  }, [call, participants]);

  // Helper function to get a display name from user ID
  const getDisplayName = (userId: string | undefined): string => {
    if (!userId) return 'Unknown';
    
    // Look up name in participants list
    const participant = participants.find(p => p.id === userId);
    if (participant) return participant.name;
    
    // If not found in list (could be current user)
    if (userId === call?.currentUserId) {
      return 'You';
    }
    
    // Last resort: extract from ID format
    return userId.split('_')[1] || userId;
  };

  // Send a message
  const sendMessage = async () => {
    if (!input.trim() || !call) return;
    
    // Current user's display name
    const senderName = 'You';
    // Recipient's display name
    const recipientName = recipient === 'Everyone' 
      ? 'Everyone' 
      : getDisplayName(recipient);
    
    // Send the message event
    await call.sendCustomEvent({
      type: 'message.new',
      user: {
        id: call.currentUserId,
        name: call.state.localParticipant?.name
      },
      content: input,
      recipient,
    });

    // Add message to local state
    setMessages((prev) => [
      ...prev,
      { 
        sender: senderName, 
        content: input, 
        recipient: recipientName,
        isPrivate: recipient !== 'Everyone'
      },
    ]);
    
    setInput('');
  };

  return (
    <div className="flex flex-col h-full p-2 text-black">
      <div className="flex mb-2">
        <select
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="Everyone">Everyone</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <span className="ml-2 self-center text-sm italic">to {recipient === 'Everyone' ? 'Everyone' : getDisplayName(recipient)}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 mb-2 p-2">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center py-4">No messages yet</div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`text-sm p-2 rounded ${msg.isPrivate ? 'bg-yellow-50' : ''}`}
            >
              <strong>{msg.sender}</strong> 
              <span className="text-gray-500"> to </span>
              <em className={msg.isPrivate ? 'text-yellow-700' : ''}>{msg.recipient}</em>
              <span>: {msg.content}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex">
        <input
          className="flex-1 border px-2 py-1 rounded-l"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="border px-4 py-1 rounded-r bg-blue-500 text-white">
          Send
        </button>
      </div>
    </div>
  );
}
