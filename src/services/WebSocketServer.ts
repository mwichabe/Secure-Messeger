import * as WebSocket from 'ws';
import { WebSocketMessage } from '../types';

export class WebSocketServer {
  private wss: WebSocket.Server | null = null;
  private messageInterval: NodeJS.Timeout | null = null;
  private port: number;

  constructor(port: number = 8080) {
    this.port = port;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocket.Server({ port: this.port }, () => {
          console.log(`WebSocket server started on port ${this.port}`);
          this.startMessageBroadcast();
          resolve();
        });

        this.wss.on('connection', (ws: WebSocket) => {
          console.log('Client connected to WebSocket server');
          
          ws.on('message', (data: WebSocket.Data) => {
            try {
              const message = JSON.parse(data.toString());
              if (message.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
              }
            } catch (error) {
              console.error('Invalid message received:', error);
            }
          });

          ws.on('close', () => {
            console.log('Client disconnected from WebSocket server');
          });

          ws.on('error', (error) => {
            console.error('WebSocket error:', error);
          });
        });

        this.wss.on('error', (error) => {
          console.error('WebSocket server error:', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private startMessageBroadcast(): void {
    const senders = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
    const messageTemplates = [
      'New message incoming!',
      'How are you?',
      'Check this out!',
      'Let\'s talk soon.',
      'Thanks for the update.',
      'I agree with that.',
      'See you later!',
      'Great idea!',
      'What\'s new?',
      'Happy to help!'
    ];

    this.messageInterval = setInterval(() => {
      if (this.wss && this.wss.clients.size > 0) {
        const message: WebSocketMessage = {
          chatId: `chat_${Math.floor(Math.random() * 200)}`,
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ts: Date.now(),
          sender: senders[Math.floor(Math.random() * senders.length)],
          body: messageTemplates[Math.floor(Math.random() * messageTemplates.length)]
        };

        const messageStr = JSON.stringify(message);
        
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
          }
        });

        console.log(`Broadcast message to chat ${message.chatId}`);
      }
    }, Math.random() * 2000 + 1000); // Random interval between 1-3 seconds
  }

  stop(): void {
    if (this.messageInterval) {
      clearInterval(this.messageInterval);
      this.messageInterval = null;
    }

    if (this.wss) {
      this.wss.close(() => {
        console.log('WebSocket server stopped');
      });
      this.wss = null;
    }
  }

  simulateConnectionDrop(): void {
    if (this.wss) {
      console.log('Simulating connection drop - closing all client connections');
      this.wss.clients.forEach((client) => {
        client.close();
      });
    }
  }
}
