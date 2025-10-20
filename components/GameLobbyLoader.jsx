// src/components/GameLobbyLoader.jsx  (or wherever your components live)

'use client'; // <-- This is the most important line!

import dynamic from 'next/dynamic';

// Dynamically import the GameLobby component and disable SSR for it.
const GameLobby = dynamic(
  () => import('./GameLobby'), // Assumes GameLobby.jsx is in the same directory
  { 
    ssr: false, 
    loading: () => <p className="flex items-center justify-center h-screen text-xl">Loading Lobby...</p>
  }
);

// This component simply returns the dynamically loaded GameLobby
export default function GameLobbyLoader() {
  return <GameLobby />;
}