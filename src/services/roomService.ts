import { doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Room, MultiPlayer, RoomState } from '../types/multi';
import { cleanForFirestore } from '../utils/firestoreCleaner';

const CHANNEL_NAME = 'jeu_de_bluff_multi_sync';
const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL_NAME) : null;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getLocalRooms(): Record<string, Room> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem('bluff_local_rooms');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRoom(room: Room): void {
  if (typeof window === 'undefined') return;
  try {
    const rooms = getLocalRooms();
    rooms[room.code] = room;
    window.localStorage.setItem('bluff_local_rooms', JSON.stringify(rooms));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ROOM_UPDATE', code: room.code, room });
    }
  } catch {}
}

export async function createRoom(
  hostName: string,
  timerSeconds: number = 60,
  aiCount: number = 3
): Promise<{ roomCode: string; playerId: string }> {
  let roomCode = generateRoomCode();
  const hostId = 'p_' + Math.random().toString(36).substring(2, 9);
  const hostPlayer: MultiPlayer = {
    id: hostId,
    name: hostName.trim() || 'Hôte',
    isHost: true,
    score: 0,
    isReady: true,
  };

  const players: Record<string, MultiPlayer> = {
    [hostId]: hostPlayer,
  };

  const aiPersonas = [
    { id: 'ai-ruse', name: '🤖 IA Rusé' },
    { id: 'ai-manipulateur', name: '🤖 IA Manipulateur' },
    { id: 'ai-farfelu', name: '🤖 IA Farfelu' },
  ];

  for (let i = 0; i < Math.min(aiCount, aiPersonas.length); i++) {
    const ai = aiPersonas[i];
    players[ai.id] = {
      id: ai.id,
      name: ai.name,
      isHost: false,
      score: 0,
      isReady: true,
    };
  }

  const newRoom: Room = {
    code: roomCode,
    hostId: hostId,
    state: 'LOBBY',
    timerSeconds: timerSeconds,
    aiCount: aiCount,
    currentRound: 1,
    totalRounds: 4,
    players,
    currentQuestionIndex: 0,
    createdAt: Date.now(),
  };

  try {
    const roomRef = doc(db, 'rooms', roomCode);
    await setDoc(roomRef, cleanForFirestore(newRoom));
  } catch (err) {
    console.error('Error creating room in Firestore:', err);
  }

  saveLocalRoom(newRoom);
  return { roomCode, playerId: hostId };
}

export async function joinRoom(
  roomCode: string,
  playerName: string
): Promise<{ playerId: string; room: Room } | { error: string }> {
  const cleanCode = roomCode.trim().toUpperCase();
  let room: Room | null = null;

  try {
    const roomRef = doc(db, 'rooms', cleanCode);
    const snap = await getDoc(roomRef);
    if (snap && snap.exists()) {
      room = snap.data() as Room;
    }
  } catch (err) {
    console.error('Error fetching room from Firestore:', err);
  }

  if (!room) {
    const localRooms = getLocalRooms();
    room = localRooms[cleanCode] || null;
  }

  if (!room) {
    return { error: 'Salon introuvable avec ce code. Vérifiez le code ou créez un salon.' };
  }

  if (room.state !== 'LOBBY' && room.state !== 'ENDED') {
    return { error: 'La partie a déjà commencé dans ce salon.' };
  }

  const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
  const newPlayer: MultiPlayer = {
    id: playerId,
    name: playerName.trim() || 'Joueur',
    isHost: false,
    score: 0,
    isReady: false,
  };

  if (!room.players) room.players = {};
  room.players[playerId] = newPlayer;

  if (room.state === 'ENDED') {
    room.state = 'LOBBY';
  }

  try {
    const roomRef = doc(db, 'rooms', cleanCode);
    await setDoc(roomRef, cleanForFirestore(room));
  } catch (err) {
    console.error('Error updating room in Firestore during join:', err);
  }

  saveLocalRoom(room);
  return { playerId, room };
}

export async function updateRoomState(roomCode: string, state: RoomState): Promise<void> {
  const cleanCode = roomCode.trim().toUpperCase();
  
  let room: Room | null = null;
  try {
    const roomRef = doc(db, 'rooms', cleanCode);
    const snap = await getDoc(roomRef);
    if (snap && snap.exists()) room = snap.data() as Room;
  } catch {}

  if (!room) {
    const localRooms = getLocalRooms();
    room = localRooms[cleanCode] || null;
  }

  if (room) {
    room.state = state;
    if (state === 'LOBBY') {
      room.currentRound = 1;
      room.currentQuestionIndex = 0;
      room.question = undefined;
      room.submissions = undefined;
      room.cards = undefined;
      room.votes = undefined;
      room.scoreBreakdowns = undefined;
      if (room.players) {
        Object.values(room.players).forEach((p) => {
          p.score = 0;
        });
      }
    }

    try {
      const roomRef = doc(db, 'rooms', cleanCode);
      await setDoc(roomRef, cleanForFirestore(room));
    } catch (err) {
      console.error('Error updating room state in Firestore:', err);
    }

    saveLocalRoom(room);
  }
}

export async function leaveRoom(roomCode: string, playerId: string): Promise<void> {
  const cleanCode = roomCode.trim().toUpperCase();
  let room: Room | null = null;
  try {
    const roomRef = doc(db, 'rooms', cleanCode);
    const snap = await getDoc(roomRef);
    if (snap && snap.exists()) room = snap.data() as Room;
  } catch {}

  if (!room) {
    const localRooms = getLocalRooms();
    room = localRooms[cleanCode] || null;
  }

  if (room && room.players) {
    delete room.players[playerId];
    saveLocalRoom(room);
    try {
      const roomRef = doc(db, 'rooms', cleanCode);
      await setDoc(roomRef, cleanForFirestore(room));
    } catch (err) {
      console.error('Error leaving room in Firestore:', err);
    }
  }
}

export function subscribeToRoom(
  roomCode: string,
  callback: (room: Room | null) => void
): () => void {
  const cleanCode = roomCode.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', cleanCode);

  const unsubscribeFirebase = onSnapshot(
    roomRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const val = docSnap.data() as Room;
        saveLocalRoom(val);
        callback(val);
      } else {
        const local = getLocalRooms();
        callback(local[cleanCode] || null);
      }
    },
    (err) => {
      console.error('Firestore subscription error:', err);
      const rooms = getLocalRooms();
      callback(rooms[cleanCode] || null);
    }
  );

  let bcHandler: ((e: MessageEvent) => void) | null = null;
  if (broadcastChannel) {
    bcHandler = (event) => {
      if (event.data && event.data.code === cleanCode) {
        if (event.data.type === 'ROOM_UPDATE') {
          callback(event.data.room);
        } else if (event.data.type === 'ROOM_DELETE') {
          callback(null);
        }
      }
    };
    broadcastChannel.addEventListener('message', bcHandler);
  }

  return () => {
    try {
      unsubscribeFirebase();
    } catch {}
    if (broadcastChannel && bcHandler) {
      broadcastChannel.removeEventListener('message', bcHandler);
    }
  };
}
