import dynamic from 'next/dynamic';

const GameLobby = dynamic(
  () => import('../components/GameLobby'),
  { 
    ssr: false, // This prevents server-side rendering
    loading: () => <p className="flex items-center justify-center h-screen text-xl">Loading Lobby...</p>
  }
);

export default function HomePage() {
  return <GameLobby />;
}

