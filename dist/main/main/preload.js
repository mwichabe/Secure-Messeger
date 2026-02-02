"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose the API to the renderer process
const electronAPI = {
    // Database operations
    initializeDatabase: () => electron_1.ipcRenderer.invoke('db:initialize'),
    seedData: () => electron_1.ipcRenderer.invoke('db:seed'),
    getChats: (offset, limit) => electron_1.ipcRenderer.invoke('db:getChats', offset, limit),
    getMessages: (chatId, offset, limit) => electron_1.ipcRenderer.invoke('db:getMessages', chatId, offset, limit),
    searchMessages: (chatId, query, limit) => electron_1.ipcRenderer.invoke('db:searchMessages', chatId, query, limit),
    markChatAsRead: (chatId) => electron_1.ipcRenderer.invoke('db:markChatAsRead', chatId),
    // WebSocket operations
    connectWebSocket: () => electron_1.ipcRenderer.invoke('ws:connect'),
    disconnectWebSocket: () => electron_1.ipcRenderer.invoke('ws:disconnect'),
    getWebSocketState: () => electron_1.ipcRenderer.invoke('ws:getState'),
    simulateConnectionDrop: () => electron_1.ipcRenderer.invoke('ws:simulateDrop'),
    // Security operations
    encrypt: (data) => electron_1.ipcRenderer.invoke('security:encrypt', data),
    decrypt: (encryptedData) => electron_1.ipcRenderer.invoke('security:decrypt', encryptedData),
    // Event listeners
    onWebSocketMessage: (callback) => {
        electron_1.ipcRenderer.on('ws:message', (_, message) => callback(message));
    },
    onWebSocketStateChange: (callback) => {
        electron_1.ipcRenderer.on('ws:stateChange', (_, state) => callback(state));
    },
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    },
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
