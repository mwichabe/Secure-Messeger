"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const WebSocket = __importStar(require("ws"));
class WebSocketServer {
    constructor(port = 8080) {
        this.wss = null;
        this.messageInterval = null;
        this.port = port;
    }
    start() {
        return new Promise((resolve, reject) => {
            try {
                this.wss = new WebSocket.Server({ port: this.port }, () => {
                    console.log(`WebSocket server started on port ${this.port}`);
                    this.startMessageBroadcast();
                    resolve();
                });
                this.wss.on('connection', (ws) => {
                    console.log('Client connected to WebSocket server');
                    ws.on('message', (data) => {
                        try {
                            const message = JSON.parse(data.toString());
                            if (message.type === 'ping') {
                                ws.send(JSON.stringify({ type: 'pong' }));
                            }
                        }
                        catch (error) {
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
            }
            catch (error) {
                reject(error);
            }
        });
    }
    startMessageBroadcast() {
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
                const message = {
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
    stop() {
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
    simulateConnectionDrop() {
        if (this.wss) {
            console.log('Simulating connection drop - closing all client connections');
            this.wss.clients.forEach((client) => {
                client.close();
            });
        }
    }
}
exports.WebSocketServer = WebSocketServer;
