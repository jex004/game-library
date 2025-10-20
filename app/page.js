import dynamic from 'next/dynamic';

// Dynamically import the GameLobby component and disable Server-Side Rendering (SSR) for it.
// This ensures it only runs in the browser, where it can safely interact with Firebase.
const GameLobby = dynamic(
  () => import('../components/GameLobby'),
  { 
    ssr: false, // This is the key change: it prevents the component from running on the server.
    loading: () => <p className="flex items-center justify-center h-screen text-xl">Loading Lobby...</p>
  }
);

export default function HomePage() {
  return <GameLobby />;
}

