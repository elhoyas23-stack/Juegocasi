import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

interface Player {
  id: string; // 'p1' | 'p2'
  ws: WebSocket;
  name: string;
  isReady: boolean;
  cameraDistance: string;
  cameraMode: string;
}

interface Room {
  code: string;
  createdAt: number;
  hostId: string;
  players: Map<string, Player>;
  laps: number;
  car1Name: string;
  car2Name: string;
  crewName: string;
  car1Data?: string; // base64 / url
  car2Data?: string;
  crewData?: string;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdownStartTime?: number;
  winner?: string;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `APEX-${code}`;
}

function getSanitizedRoomState(room: Room) {
  const playersObj: Record<string, { id: string; name: string; isReady: boolean; cameraDistance: string; cameraMode: string }> = {};
  room.players.forEach((p, k) => {
    playersObj[k] = {
      id: p.id,
      name: p.name,
      isReady: p.isReady,
      cameraDistance: p.cameraDistance,
      cameraMode: p.cameraMode,
    };
  });

  return {
    code: room.code,
    hostId: room.hostId,
    players: playersObj,
    playerCount: room.players.size,
    laps: room.laps,
    car1Name: room.car1Name,
    car2Name: room.car2Name,
    crewName: room.crewName,
    status: room.status,
    countdownStartTime: room.countdownStartTime,
    winner: room.winner,
    hasCar1Data: Boolean(room.car1Data),
    hasCar2Data: Boolean(room.car2Data),
    hasCrewData: Boolean(room.crewData),
  };
}

function broadcastToRoom(room: Room, message: Record<string, unknown>, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  room.players.forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN && player.ws !== excludeWs) {
      player.ws.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  let currentRoomCode: string | null = null;
  let playerId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'create_room': {
          let code = generateRoomCode();
          while (rooms.has(code)) {
            code = generateRoomCode();
          }

          const room: Room = {
            code,
            createdAt: Date.now(),
            hostId: 'p1',
            players: new Map(),
            laps: msg.laps || 3,
            car1Name: msg.car1Name || 'F1 Turbo GP (Host)',
            car2Name: msg.car2Name || 'F1 Turbo GP (Rival)',
            crewName: msg.crewName || 'Pit Crew Apex Scuderia',
            car1Data: msg.car1Data,
            car2Data: msg.car2Data,
            crewData: msg.crewData,
            status: 'lobby',
          };

          const hostPlayer: Player = {
            id: 'p1',
            ws,
            name: msg.playerName || 'Piloto 1 (Anfitrión)',
            isReady: true,
            cameraDistance: msg.cameraDistance || 'medium',
            cameraMode: msg.cameraMode || 'chase',
          };

          room.players.set('p1', hostPlayer);
          rooms.set(code, room);
          currentRoomCode = code;
          playerId = 'p1';

          ws.send(JSON.stringify({
            type: 'room_created',
            room: getSanitizedRoomState(room),
            playerId: 'p1',
          }));
          break;
        }

        case 'join_room': {
          const code = (msg.code || '').trim().toUpperCase();
          const room = rooms.get(code);

          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `No se encontró ninguna sala con el código "${code}".`,
            }));
            return;
          }

          if (room.players.size >= 2) {
            ws.send(JSON.stringify({
              type: 'error',
              message: `La sala "${code}" ya está completa (máximo 2 jugadores).`,
            }));
            return;
          }

          if (room.status !== 'lobby') {
            ws.send(JSON.stringify({
              type: 'error',
              message: `La carrera en la sala "${code}" ya ha comenzado.`,
            }));
            return;
          }

          const guestPlayer: Player = {
            id: 'p2',
            ws,
            name: msg.playerName || 'Piloto 2 (Invitado)',
            isReady: false,
            cameraDistance: msg.cameraDistance || 'medium',
            cameraMode: msg.cameraMode || 'chase',
          };

          room.players.set('p2', guestPlayer);
          currentRoomCode = code;
          playerId = 'p2';

          ws.send(JSON.stringify({
            type: 'room_joined',
            room: getSanitizedRoomState(room),
            playerId: 'p2',
            car1Data: room.car1Data,
            car2Data: room.car2Data,
            crewData: room.crewData,
          }));

          broadcastToRoom(room, {
            type: 'room_updated',
            room: getSanitizedRoomState(room),
          });
          break;
        }

        case 'update_lobby_config': {
          if (!currentRoomCode || playerId !== 'p1') return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          if (msg.laps !== undefined) room.laps = Number(msg.laps);
          if (msg.car1Name !== undefined) room.car1Name = msg.car1Name;
          if (msg.car2Name !== undefined) room.car2Name = msg.car2Name;
          if (msg.crewName !== undefined) room.crewName = msg.crewName;
          if (msg.car1Data !== undefined) room.car1Data = msg.car1Data;
          if (msg.car2Data !== undefined) room.car2Data = msg.car2Data;
          if (msg.crewData !== undefined) room.crewData = msg.crewData;

          broadcastToRoom(room, {
            type: 'room_updated',
            room: getSanitizedRoomState(room),
            car1Data: room.car1Data,
            car2Data: room.car2Data,
            crewData: room.crewData,
          });
          break;
        }

        case 'set_ready': {
          if (!currentRoomCode || !playerId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          const player = room.players.get(playerId);
          if (player) {
            player.isReady = Boolean(msg.isReady);
            if (msg.cameraDistance) player.cameraDistance = msg.cameraDistance;
            if (msg.cameraMode) player.cameraMode = msg.cameraMode;

            broadcastToRoom(room, {
              type: 'room_updated',
              room: getSanitizedRoomState(room),
            });
          }
          break;
        }

        case 'start_race': {
          if (!currentRoomCode || playerId !== 'p1') return;
          const room = rooms.get(currentRoomCode);
          if (!room || room.status !== 'lobby') return;

          room.status = 'countdown';
          room.countdownStartTime = Date.now();

          broadcastToRoom(room, {
            type: 'race_starting',
            room: getSanitizedRoomState(room),
            countdownStartTime: room.countdownStartTime,
          });
          break;
        }

        case 'telemetry_sync': {
          if (!currentRoomCode || !playerId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          // Forward rival telemetry directly to the other player (ultra-low latency)
          broadcastToRoom(room, {
            type: 'rival_telemetry',
            playerId,
            telemetry: msg.telemetry,
          }, ws);
          break;
        }

        case 'race_finished': {
          if (!currentRoomCode || !playerId) return;
          const room = rooms.get(currentRoomCode);
          if (!room) return;

          if (!room.winner) {
            room.winner = playerId;
            room.status = 'finished';
            broadcastToRoom(room, {
              type: 'race_winner',
              winner: playerId,
              winnerName: msg.playerName || (playerId === 'p1' ? room.players.get('p1')?.name : room.players.get('p2')?.name),
            });
          }
          break;
        }

        case 'leave_room': {
          if (currentRoomCode && playerId) {
            const room = rooms.get(currentRoomCode);
            if (room) {
              room.players.delete(playerId);
              if (room.players.size === 0) {
                rooms.delete(currentRoomCode);
              } else {
                broadcastToRoom(room, {
                  type: 'player_left',
                  playerId,
                  room: getSanitizedRoomState(room),
                });
              }
            }
          }
          currentRoomCode = null;
          playerId = null;
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomCode && playerId) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.players.delete(playerId);
        if (room.players.size === 0) {
          rooms.delete(currentRoomCode);
        } else {
          broadcastToRoom(room, {
            type: 'player_left',
            playerId,
            room: getSanitizedRoomState(room),
          });
        }
      }
    }
  });
});

// Periodic room cleanup (destroy stale rooms older than 6 hours)
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, code) => {
    if (now - room.createdAt > 6 * 60 * 60 * 1000 && room.players.size === 0) {
      rooms.delete(code);
    }
  });
}, 10 * 60 * 1000);

async function startServer() {
  const PORT = 3000;
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Apex GT 1v1 Racing Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
