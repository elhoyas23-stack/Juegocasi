/**
 * MultiplayerClient.ts
 * Real-time WebSocket synchronization client for 1v1 private rooms and telemetry streaming
 */

export interface MultiplayerPlayer {
  id: string; // 'p1' | 'p2'
  name: string;
  isReady: boolean;
  cameraDistance: string;
  cameraMode: string;
}

export interface MultiplayerRoomState {
  code: string;
  hostId: string;
  players: Record<string, MultiplayerPlayer>;
  playerCount: number;
  laps: number;
  car1Name: string;
  car2Name: string;
  crewName: string;
  status: 'lobby' | 'countdown' | 'racing' | 'finished';
  countdownStartTime?: number;
  winner?: string;
  hasCar1Data: boolean;
  hasCar2Data: boolean;
  hasCrewData: boolean;
}

export interface RivalTelemetryData {
  x: number;
  y: number;
  z: number;
  yaw: number;
  roll: number;
  speed: number;
  speedKmh: number;
  steerAngle: number;
  rpm: number;
  gear: number;
  slipRatio: number;
  isDrifting: boolean;
  brake: number;
  lapCount: number;
  lapTime: number;
  currentSector: number;
  isShifting: boolean;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  public playerId: 'p1' | 'p2' | null = null;
  public currentRoom: MultiplayerRoomState | null = null;
  public isConnected = false;

  public onRoomCreated?: (room: MultiplayerRoomState, playerId: string) => void;
  public onRoomJoined?: (room: MultiplayerRoomState, playerId: string, car1Data?: string, car2Data?: string, crewData?: string) => void;
  public onRoomUpdated?: (room: MultiplayerRoomState, car1Data?: string, car2Data?: string, crewData?: string) => void;
  public onRaceStarting?: (room: MultiplayerRoomState, countdownStartTime: number) => void;
  public onRivalTelemetry?: (telemetry: RivalTelemetryData) => void;
  public onRaceWinner?: (winnerId: string, winnerName: string) => void;
  public onPlayerLeft?: (playerId: string, room: MultiplayerRoomState) => void;
  public onError?: (message: string) => void;

  constructor() {
    // Lazy connect when needed
  }

  public connect(): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          resolve(true);
        };

        this.ws.onerror = (err) => {
          console.warn('WebSocket connection error:', err);
          this.isConnected = false;
          resolve(false);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (err) {
        console.error('Failed to instantiate WebSocket:', err);
        resolve(false);
      }
    });
  }

  private handleMessage(raw: string): void {
    try {
      const msg = JSON.parse(raw);

      switch (msg.type) {
        case 'room_created':
          this.playerId = msg.playerId;
          this.currentRoom = msg.room;
          if (this.onRoomCreated) this.onRoomCreated(msg.room, msg.playerId);
          break;

        case 'room_joined':
          this.playerId = msg.playerId;
          this.currentRoom = msg.room;
          if (this.onRoomJoined) this.onRoomJoined(msg.room, msg.playerId, msg.car1Data, msg.car2Data, msg.crewData);
          break;

        case 'room_updated':
          this.currentRoom = msg.room;
          if (this.onRoomUpdated) this.onRoomUpdated(msg.room, msg.car1Data, msg.car2Data, msg.crewData);
          break;

        case 'race_starting':
          this.currentRoom = msg.room;
          if (this.onRaceStarting) this.onRaceStarting(msg.room, msg.countdownStartTime);
          break;

        case 'rival_telemetry':
          if (this.onRivalTelemetry) this.onRivalTelemetry(msg.telemetry);
          break;

        case 'race_winner':
          if (this.onRaceWinner) this.onRaceWinner(msg.winner, msg.winnerName);
          break;

        case 'player_left':
          this.currentRoom = msg.room;
          if (this.onPlayerLeft) this.onPlayerLeft(msg.playerId, msg.room);
          break;

        case 'error':
          if (this.onError) this.onError(msg.message);
          break;
      }
    } catch (e) {
      console.error('Error parsing incoming WebSocket message:', e);
    }
  }

  public async createRoom(options: {
    playerName: string;
    laps: number;
    car1Name: string;
    car2Name: string;
    crewName: string;
    car1Data?: string;
    car2Data?: string;
    crewData?: string;
    cameraDistance?: string;
    cameraMode?: string;
  }): Promise<void> {
    await this.connect();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.onError) this.onError('No se pudo establecer conexión con el servidor.');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'create_room',
      ...options,
    }));
  }

  public async joinRoom(code: string, playerName: string, cameraDistance?: string, cameraMode?: string): Promise<void> {
    await this.connect();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.onError) this.onError('No se pudo establecer conexión con el servidor.');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'join_room',
      code: code.trim().toUpperCase(),
      playerName,
      cameraDistance,
      cameraMode,
    }));
  }

  public updateLobbyConfig(config: {
    laps?: number;
    car1Name?: string;
    car2Name?: string;
    crewName?: string;
    car1Data?: string;
    car2Data?: string;
    crewData?: string;
  }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'update_lobby_config',
      ...config,
    }));
  }

  public setReady(isReady: boolean, cameraDistance?: string, cameraMode?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'set_ready',
      isReady,
      cameraDistance,
      cameraMode,
    }));
  }

  public startRace(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'start_race',
    }));
  }

  public sendTelemetry(telemetry: RivalTelemetryData): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'telemetry_sync',
      telemetry,
    }));
  }

  public notifyRaceFinished(playerName: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'race_finished',
      playerName,
    }));
  }

  public leaveRoom(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'leave_room',
      }));
    }
    this.playerId = null;
    this.currentRoom = null;
  }

  public dispose(): void {
    this.leaveRoom();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
