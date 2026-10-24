import React, { createContext, useContext } from 'react';
import { useGameState, GameStateEngine } from '../hooks/useGameState';

const GameContext = createContext<GameStateEngine | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const gameState = useGameState();
  return <GameContext.Provider value={gameState}>{children}</GameContext.Provider>;
};

export function useGame(): GameStateEngine {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
