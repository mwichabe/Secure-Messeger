"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
const ws_1 = __importDefault(require("ws"));
const types_1 = require("../types");
class WebSocketClient {
    constructor(serverUrl, events) {
        this.ws = null;
        this.connectionState = types_1.ConnectionState.DISCONNECTED;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.baseReconnectDelay = 1000; // 1 second
        this.heartbeatInterval = null;
        this.serverUrl = serverUrl;
        this.events = events;
    }
    connect() {
        if (this.connectionState === types_1.ConnectionState.CONNECTING ||
            this.connectionState === types_1.ConnectionState.CONNECTED) {
            return;
        }
        this.setConnectionState(types_1.ConnectionState.CONNECTING);
        try {
            this.ws = new ws_1.default(this.serverUrl);
            if (this.ws) {
                this.ws.on('open', () => {
                    console.log('Connected to WebSocket server');
                    this.reconnectAttempts = 0;
                    this.setConnectionState(types_1.ConnectionState.CONNECTED);
                    this.startHeartbeat();
                });
                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        if (message.type === 'pong') {
                            // Heartbeat response received
                            return;
                        }
                        // It's a chat message
                        this.events.onMessage(message);
                    }
                    catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                });
                this.ws.on('close', (code, reason) => {
                    console.log(`WebSocket connection closed: ${code} - ${reason}`);
                    this.stopHeartbeat();
                    this.setConnectionState(types_1.ConnectionState.DISCONNECTED);
                    this.handleReconnect();
                });
                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.setConnectionState(types_1.ConnectionState.DISCONNECTED);
                });
            }
        }
        catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.setConnectionState(types_1.ConnectionState.DISCONNECTED);
            this.handleReconnect();
        }
    }
    disconnect() {
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.setConnectionState(types_1.ConnectionState.DISCONNECTED);
    }
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === ws_1.default.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, 10000); // Send ping every 10 seconds
    }
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnect attempts reached. Giving up.');
            return;
        }
        this.reconnectAttempts++;
        this.setConnectionState(types_1.ConnectionState.RECONNECTING);
        // Exponential backoff with jitter
        const delay = Math.min(this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000 // Max 30 seconds
        ) + Math.random() * 1000; // Add jitter
        console.log(`Attempting to reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => {
            this.connect();
        }, delay);
    }
    setConnectionState(state) {
        if (this.connectionState !== state) {
            this.connectionState = state;
            this.events.onConnectionStateChange(state);
        }
    }
    getConnectionState() {
        return this.connectionState;
    }
    getReconnectAttempts() {
        return this.reconnectAttempts;
    }
}
exports.WebSocketClient = WebSocketClient;
