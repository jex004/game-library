// app/page.js (Updated)

import GameLobbyLoader from '../components/GameLobbyLoader';

export default function HomePage() {
  // This page remains a Server Component, but it renders a Client Component
  // that handles the client-side-only logic.
  return <GameLobbyLoader />;
}