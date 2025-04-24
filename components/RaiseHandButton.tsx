'use client';
import React, { useState } from 'react';

export default function RaiseHandButton() {
  const [raised, setRaised] = useState(false);
  return (
    <button
      onClick={() => setRaised(!raised)}
      className={`px-4 py-2 rounded ${raised ? 'bg-yellow-300' : 'bg-gray-200'}`}
    >
      {raised ? 'Lower Hand' : 'Raise Hand'}
    </button>
  );
}
