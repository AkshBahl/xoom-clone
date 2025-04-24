'use client';
import React, { useEffect, useState } from 'react';
import { useCallStateHooks, useCall } from '@stream-io/video-react-sdk';

interface Message {
  sender: string;
  content: string;
  recipient: string;
}

export default function ChatPanel() {
  const call = useCall(); // ✅ correct hook usage
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [recipient, setRecipient] = useState('Everyone');


  // Debug: Inspect members
  console.log("call.state.members:", call?.state.members);
  const participants =
    call?.state.members
      ? Object.values(call.state.members).map((m: any) => ({
          id: m.user.id,
          name: m.user.name || m.user.id,
        }))
      : [];


  useEffect(() => {
    if (!call) return;

    const handleMessage = (event: any) => {
      console.log("Received event:", event);
      // For Stream, custom events come as type 'custom' and payload in event.custom
      if (event.type !== 'custom' || !event.custom || event.custom.type !== 'message.new') return;
      const { user, content, recipient } = event.custom;
      if (!content) return;
      setMessages((prev) => [
        ...prev,
        {
          sender: user?.name || user?.id || 'Unknown',
          content,
          recipient: recipient || 'Everyone',
        },
      ]);
    };


    call.on('custom', handleMessage);
    return () => {
      call.off('custom', handleMessage);
    };

  }, [call]);

  const sendMessage = async () => {
    if (!input.trim() || !call) return;
    console.log("Sending message:", input, "to", recipient);
    await call.sendCustomEvent({
      type: 'message.new',
      user: {
        id: call.currentUserId,
        // name: userName, // Add this if you have access to the user's name
      },
      content: input,
      recipient,
    });

    setMessages((prev) => [
      ...prev,
      { sender: 'You', content: input, recipient },
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
        <span className="ml-2 self-center text-sm italic">to {recipient}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 mb-2">
        {messages.map((msg, idx) => (
          <div key={idx} className="text-sm">
            <strong>{msg.sender}</strong> to <em>{msg.recipient}</em>: {msg.content}
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          className="flex-1 border px-2 py-1 rounded-l"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={sendMessage} className="border px-4 py-1 rounded-r">Send</button>
      </div>
    </div>
  );
}
