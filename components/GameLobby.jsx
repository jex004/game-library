'use client';

import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, doc, setDoc } from 'firebase/firestore';

// --- IMPORTANT: Firebase Configuration ---
// This configuration will be loaded from environment variables in your Next.js project.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// --- Helper component for the send icon ---
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);

// --- The Chat Room Component ---
function ChatRoom({ roomId, user, db, nickname, onLeaveRoom }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const chatBoxRef = useRef(null);
    const appId = firebaseConfig.appId;

    useEffect(() => {
        if (!db || !roomId) return;
        
        const messagesPath = `artifacts/${appId}/public/data/rooms/${roomId}/messages`;
        const q = query(collection(db, messagesPath));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            msgs.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
            setMessages(msgs);
        });
        
        return () => unsubscribe();
    }, [db, roomId, appId]);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;
        
        const messagesPath = `artifacts/${appId}/public/data/rooms/${roomId}/messages`;
        await addDoc(collection(db, messagesPath), {
            text: newMessage,
            senderId: user.uid,
            senderName: nickname,
            timestamp: serverTimestamp(),
        });
        setNewMessage('');
    };

    return (
        <div className="w-full h-full flex flex-col">
            <header className="bg-gray-800 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h1 className="text-xl font-bold">Room: {roomId}</h1>
                <button onClick={onLeaveRoom} className="bg-red-500 text-white font-bold py-1 px-3 rounded hover:bg-red-600 transition">Leave</button>
            </header>
            <main ref={chatBoxRef} className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex mb-4 ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-4 py-2 rounded-lg max-w-xs sm:max-w-md ${msg.senderId === user.uid ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                            <div className="font-bold text-sm">{msg.senderName}</div>
                            <div>{msg.text}</div>
                        </div>
                    </div>
                ))}
            </main>
            <footer className="p-4 bg-white border-t rounded-b-lg">
                <form onSubmit={handleSendMessage} className="flex items-center">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 px-4 py-2 border rounded-l-lg" placeholder="Type a message..." />
                    <button type="submit" className="bg-blue-500 text-white font-bold py-2 px-4 rounded-r-lg hover:bg-blue-600"><SendIcon /></button>
                </form>
            </footer>
        </div>
    );
}

// --- The Lobby Component ---
function Lobby({ onJoinRoom, db }) {
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');
    const appId = firebaseConfig.appId;

    useEffect(() => {
        if (!db) return;

        const roomsPath = `artifacts/${appId}/public/data/rooms`;
        const q = query(collection(db, roomsPath));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setRooms(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, [db, appId]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        const trimmedName = newRoomName.trim();
        if (trimmedName === '' || !db) return;

        const roomsPath = `artifacts/${appId}/public/data/rooms`;
        const roomRef = doc(db, roomsPath, trimmedName);
        await setDoc(roomRef, {
            name: trimmedName,
            createdAt: serverTimestamp(),
        });
        setNewRoomName('');
        onJoinRoom(trimmedName);
    };

    return (
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-2xl">
            <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Game Lobby</h1>
            <form onSubmit={handleCreateRoom} className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Create a New Room</h2>
                <div className="flex">
                    <input type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} className="flex-1 px-4 py-2 border rounded-l-lg" placeholder="Enter room name..." />
                    <button type="submit" className="bg-green-500 text-white font-bold py-2 px-4 rounded-r-lg hover:bg-green-600">Create</button>
                </div>
            </form>
            <div>
                <h2 className="text-xl font-semibold mb-3 border-t pt-4">Available Rooms</h2>
                {rooms.length === 0 ? (
                    <p className="text-gray-500">No rooms available. Create one!</p>
                ) : (
                    <ul className="space-y-2">
                        {rooms.map(room => (
                            <li key={room.id} onClick={() => onJoinRoom(room.id)} className="p-3 bg-gray-100 rounded-lg hover:bg-blue-100 cursor-pointer transition text-lg font-medium text-gray-700">
                                {room.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// --- The Main Component that manages state ---
export default function GameLobby() {
    const [user, setUser] = useState(null);
    const [nickname, setNickname] = useState('');
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [currentView, setCurrentView] = useState('NICKNAME'); // NICKNAME, LOBBY, CHAT
    const [roomId, setRoomId] = useState(null);

    useEffect(() => {
        if (!firebaseConfig.apiKey) return;
        const app = initializeApp(firebaseConfig);
        setDb(getFirestore(app));
        setAuth(getAuth(app));
    }, []);

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, u => u ? setUser(u) : signInAnonymously(auth));
        return () => unsubscribe();
    }, [auth]);

    const handleNicknameSubmit = (e) => {
        e.preventDefault();
        if (nickname.trim()) setCurrentView('LOBBY');
    };

    const joinRoom = (id) => {
        setRoomId(id);
        setCurrentView('CHAT');
    };

    const leaveRoom = () => {
        setRoomId(null);
        setCurrentView('LOBBY');
    };

    const renderView = () => {
        switch (currentView) {
            case 'NICKNAME':
                return (
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
                        <h2 className="text-2xl font-bold mb-4 text-center">Welcome!</h2>
                        <p className="text-gray-600 mb-6 text-center">Choose a nickname to enter the lobby.</p>
                        <form onSubmit={handleNicknameSubmit}>
                            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Enter your nickname..." required />
                            <button type="submit" className="w-full mt-4 bg-blue-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-600">Enter Lobby</button>
                        </form>
                    </div>
                );
            case 'LOBBY':
                return <Lobby onJoinRoom={joinRoom} db={db} />;
            case 'CHAT':
                return (
                    <div className="w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col bg-white rounded-lg shadow-2xl">
                        <ChatRoom roomId={roomId} user={user} db={db} nickname={nickname} onLeaveRoom={leaveRoom} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-100 flex items-center justify-center h-screen font-sans">
            {user ? renderView() : <p>Connecting...</p>}
        </div>
    );
}

