import WebSocket from 'ws';
import { WebSocketMessage, ConnectionState } from '../types';

export interface WebSocketClientEvents {
  onMessage: (message: WebSocketMessage) => void;
  onConnectionStateChange: (state: ConnectionState) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000; // 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: NodeJS.Timeout | null = null;
  private events: WebSocketClientEvents;
  private isManualDisconnect = false;

  constructor(serverUrl: string, events: WebSocketClientEvents) {
    this.serverUrl = serverUrl;
    this.events = events;
  }

  connect(): void {
    if (this.connectionState === ConnectionState.CONNECTING || 
        this.connectionState === ConnectionState.CONNECTED) {
      return;
    }

    this.isManualDisconnect = false;
    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      this.ws = new WebSocket(this.serverUrl);

      if (this.ws) {
        this.ws.on('open', () => {
          console.log('Connected to WebSocket server');
          this.reconnectAttempts = 0;
          this.setConnectionState(ConnectionState.CONNECTED);
          this.startHeartbeat();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'pong') {
              // Heartbeat response received
              this.resetHeartbeatTimeout();
              return;
            }

            // It's a chat message
            this.events.onMessage(message as WebSocketMessage);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        this.ws.on('close', (code: number, reason: string) => {
          console.log(`WebSocket connection closed: ${code} - ${reason}`);
          this.stopHeartbeat();
          this.setConnectionState(ConnectionState.DISCONNECTED);
          
          if (!this.isManualDisconnect) {
            this.handleReconnect();
          }
        });

        this.ws.on('error', (error: Error) => {
          console.error('WebSocket error:', error);
          this.setConnectionState(ConnectionState.DISCONNECTED);
          
          if (!this.isManualDisconnect) {
            this.handleReconnect();
          }
        });

        // Set connection timeout
        this.ws.on('ping', () => {
          console.log('WebSocket ping received');
        });
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.setConnectionState(ConnectionState.DISCONNECTED);
      
      if (!this.isManualDisconnect) {
        this.handleReconnect();
      }
    }
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    // Send initial ping
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }

    // Set up heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        this.setHeartbeatTimeout();
      }
    }, 10000); // Send ping every 10 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private setHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }
    
    // Expect pong response within 5 seconds
    this.heartbeatTimeout = setTimeout(() => {
      console.warn('Heartbeat timeout - connection may be lost');
      this.setConnectionState(ConnectionState.RECONNECTING);
      this.handleReconnect();
    }, 5000);
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState(ConnectionState.RECONNECTING);

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    ) + Math.random() * 1000; // Add jitter

    console.log(`Attempting to reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.events.onConnectionStateChange(state);
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED && 
           this.ws !== null && 
           this.ws.readyState === WebSocket.OPEN;
  }

  send(data: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }
}
