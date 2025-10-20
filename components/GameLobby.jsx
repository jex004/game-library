'use client';

import { useState, useEffect, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
// --- MODIFICATION: Imported updateDoc for updating room activity ---
import { collection, addDoc, query, onSnapshot, serverTimestamp, doc, setDoc, deleteDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth, appId } from '../lib/firebase';

// --- Helper component for the send icon (Unchanged) ---
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);

// --- The Chat Room Component ---
function ChatRoom({ roomId, user, nickname, onLeaveRoom }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const chatBoxRef = useRef(null);

    useEffect(() => {
        if (!db || !roomId || !appId) return;
        
        const messagesPath = `artifacts/${appId}/public/data/rooms/${roomId}/messages`;
        const q = query(collection(db, messagesPath));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            msgs.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));
            setMessages(msgs);
        });
        
        return () => unsubscribe();
    }, [roomId]);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages]);

    // --- MODIFICATION: handleSendMessage now also updates the room's lastActivity ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !appId) return;
        
        const roomsPath = `artifacts/${appId}/public/data/rooms`;
        const messagesPath = `${roomsPath}/${roomId}/messages`;

        // 1. Add the new message document
        await addDoc(collection(db, messagesPath), {
            text: newMessage,
            senderId: user.uid,
            senderName: nickname,
            timestamp: serverTimestamp(),
        });

        // 2. Update the parent room's lastActivity timestamp
        const roomRef = doc(db, roomsPath, roomId);
        await updateDoc(roomRef, {
            lastActivity: serverTimestamp()
        });
        
        setNewMessage('');
    };

    return (
        <div className="w-full h-full flex flex-col">
            <header className="bg-gray-800 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h1 className="text-xl font-bold">Room: {roomId}</h1>
                <button onClick={async () => await onLeaveRoom()} className="bg-red-500 text-white font-bold py-1 px-3 rounded hover:bg-red-600 transition">Leave</button>
            </header>
            
            <main ref={chatBoxRef} className="flex-1 min-h-0 p-4 overflow-y-auto bg-gray-50">
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
function Lobby({ onJoinRoom }) {
    const [rooms, setRooms] = useState([]);
    const [newRoomName, setNewRoomName] = useState('');

    useEffect(() => {
        if (!appId) return;
        const roomsPath = `artifacts/${appId}/public/data/rooms`;
        const q = query(collection(db, roomsPath));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setRooms(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, []);

    // --- MODIFICATION: handleCreateRoom now adds the lastActivity field ---
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        const trimmedName = newRoomName.trim();
        if (trimmedName === '' || !appId) return;

        const roomsPath = `artifacts/${appId}/public/data/rooms`;
        const roomRef = doc(db, roomsPath, trimmedName);
        await setDoc(roomRef, {
            name: trimmedName,
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp(), 
        });
        setNewRoomName('');
        await onJoinRoom(trimmedName);
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
                            <li key={room.id} onClick={async () => await onJoinRoom(room.id)} className="p-3 bg-gray-100 rounded-lg hover:bg-blue-100 cursor-pointer transition text-lg font-medium text-gray-700">
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
    const [currentView, setCurrentView] = useState('NICKNAME');
    const [roomId, setRoomId] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, u => {
            if (u) {
                setUser(u);
            } else {
                signInAnonymously(auth).catch(error => console.error("Anonymous sign-in failed:", error));
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!roomId || !user) return;

        const handleBeforeUnload = async (event) => {
            await leaveRoom(true); 
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [roomId, user]);

    const handleNicknameSubmit = (e) => {
        e.preventDefault();
        if (nickname.trim()) setCurrentView('LOBBY');
    };

    const joinRoom = async (id) => {
        if (!user || !appId) return;
        
        const membersPath = `artifacts/${appId}/public/data/rooms/${id}/members`;
        const memberRef = doc(db, membersPath, user.uid);
        
        try {
            await setDoc(memberRef, {
                nickname: nickname,
                joinedAt: serverTimestamp(),
            });
            setRoomId(id);
            setCurrentView('CHAT');
        } catch (error) {
            console.error("Error joining room:", error);
        }
    };

    const leaveRoom = async (isUnloading = false) => {
        if (!user || !roomId || !appId) return;

        const roomsPath = `artifacts/${appId}/public/data/rooms`;
        const membersPath = `${roomsPath}/${roomId}/members`;
        const memberRef = doc(db, membersPath, user.uid);

        try {
            await deleteDoc(memberRef);

            const membersQuery = query(collection(db, membersPath));
            const membersSnapshot = await getDocs(membersQuery);

            if (membersSnapshot.empty) {
                const roomRef = doc(db, roomsPath, roomId);
                await deleteDoc(roomRef);
                console.log(`Room ${roomId} is empty and has been deleted.`);
            }
        } catch (error) {
            console.error("Error leaving room:", error);
        } finally {
            if (!isUnloading) {
                setRoomId(null);
                setCurrentView('LOBBY');
            }
        }
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
                return <Lobby onJoinRoom={joinRoom} />;
            case 'CHAT':
                return (
                    <div className="w-full max-w-2xl h-[90vh] max-h-[700px] flex flex-col bg-white rounded-lg shadow-2xl">
                        <ChatRoom roomId={roomId} user={user} nickname={nickname} onLeaveRoom={leaveRoom} />
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