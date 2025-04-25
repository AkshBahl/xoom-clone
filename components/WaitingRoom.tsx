'use client';
import React from 'react';
import { Loader } from 'lucide-react';
import { Button } from './ui/button';

interface WaitingRoomProps {
  participants: Array<{
    id: string;
    name: string;
  }>;
  onAdmit: (id: string) => void;
  isLoading?: boolean;
}

export default function WaitingRoom({ participants, onAdmit, isLoading = false }: WaitingRoomProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Waiting Room</h2>
      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <Loader className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : participants.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No participants waiting</p>
      ) : (
        <ul className="space-y-2">
          {participants.map((p) => (
            <li key={p.id} className="flex justify-between items-center border border-gray-200 p-3 rounded-md bg-gray-50">
              <span className="font-medium text-gray-700">{p.name}</span>
              <Button 
                onClick={() => onAdmit(p.id)} 
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Admit
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
