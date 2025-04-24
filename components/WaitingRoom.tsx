'use client';
import React from 'react';

export default function WaitingRoom({ participants, onAdmit }: { participants: string[]; onAdmit: (id: string) => void; }) {
  return (
    <div className="p-4">
      <h2 className="text-xl mb-4">Waiting Room</h2>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li key={p} className="flex justify-between items-center border p-2 rounded">
            <span>{p}</span>
            <button onClick={() => onAdmit(p)} className="px-3 py-1 bg-blue-500 text-white rounded">Admit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
