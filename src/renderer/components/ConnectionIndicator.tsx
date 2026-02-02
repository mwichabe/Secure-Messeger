import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ConnectionState } from '../../types';

const ConnectionIndicator: React.FC = () => {
  const connectionState = useSelector((state: RootState) => state.connection.state);
  const reconnectAttempts = useSelector((state: RootState) => state.connection.reconnectAttempts);
  const [localReconnectAttempts, setLocalReconnectAttempts] = useState(0);

  useEffect(() => {
    const updateConnectionState = async () => {
      const state = await window.electronAPI.getWebSocketState();
      setLocalReconnectAttempts(state.reconnectAttempts);
    };

    updateConnectionState();
    const interval = setInterval(updateConnectionState, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStateClass = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'connected';
      case ConnectionState.CONNECTING:
        return 'connecting';
      case ConnectionState.RECONNECTING:
        return 'reconnecting';
      case ConnectionState.DISCONNECTED:
        return 'disconnected';
      default:
        return '';
    }
  };

  const getStateText = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.RECONNECTING:
        return `Reconnecting... (${localReconnectAttempts})`;
      case ConnectionState.DISCONNECTED:
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getStateIcon = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return '●';
      case ConnectionState.CONNECTING:
        return '○';
      case ConnectionState.RECONNECTING:
        return '◐';
      case ConnectionState.DISCONNECTED:
        return '●';
      default:
        return '○';
    }
  };

  const handleSimulateDrop = () => {
    window.electronAPI.simulateConnectionDrop();
  };

  return (
    <>
      <div className={`connection-indicator ${getStateClass()}`} />
      <div className="connection-info">
        <span className="connection-status">
          {getStateText()}
        </span>
        {connectionState === ConnectionState.CONNECTED && (
          <button 
            className="btn btn-compact" 
            onClick={handleSimulateDrop}
          >
            Test Connection
          </button>
        )}
      </div>
    </>
  );
};

export default ConnectionIndicator;
