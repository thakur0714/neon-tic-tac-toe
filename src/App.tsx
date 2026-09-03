import React, { useState, useEffect } from 'react';
import { MobileFrame } from './components/MobileFrame';
import { ArcadeHub } from './components/ArcadeHub';
import { TicTacToeGame } from './components/TicTacToeGame';
import { CyberSnake } from './components/games/CyberSnake';
import { NeonConnect4 } from './components/games/NeonConnect4';
import { Neon2048 } from './components/games/Neon2048';
import { NeonLudoGame } from './components/games/NeonLudoGame';
import { NeonCarromGame } from './components/games/carrom/NeonCarromGame';
import { NeonUnoGame } from './components/games/uno/NeonUnoGame';
import {
  ArcadeGameId,
  Connect4Stats,
  Game2048Stats,
  GameConfig,
  GameStats,
  SnakeStats,
} from './types';
import { playClickSound } from './utils/audio';

const DEFAULT_TTT_CONFIG: GameConfig = {
  mode: 'ai-hard',
  playerSymbol: 'X',
  aiSymbol: 'O',
  startingPlayer: 'X',
  soundEnabled: true,
  hapticsEnabled: true,
};

const DEFAULT_TTT_STATS: GameStats = {
  winsX: 0,
  winsO: 0,
  draws: 0,
  totalGames: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastWinner: null,
};

const DEFAULT_SNAKE_STATS: SnakeStats = {
  highScore: 0,
  totalGames: 0,
  highestLength: 3,
  totalApples: 0,
};

const DEFAULT_CONNECT4_STATS: Connect4Stats = {
  winsP1: 0,
  winsP2: 0,
  draws: 0,
  totalGames: 0,
};

const DEFAULT_2048_STATS: Game2048Stats = {
  highScore: 0,
  bestTile: 0,
  totalGames: 0,
};

export default function App() {
  // Navigation: Start at Arcade Hub
  const [activeGame, setActiveGame] = useState<ArcadeGameId>('hub');

  // Tic-Tac-Toe State
  const [tttConfig, setTttConfig] = useState<GameConfig>(() => {
    try {
      const saved = localStorage.getItem('ttt_config');
      return saved ? { ...DEFAULT_TTT_CONFIG, ...JSON.parse(saved) } : DEFAULT_TTT_CONFIG;
    } catch {
      return DEFAULT_TTT_CONFIG;
    }
  });

  const [tttStats, setTttStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem('ttt_stats');
      return saved ? { ...DEFAULT_TTT_STATS, ...JSON.parse(saved) } : DEFAULT_TTT_STATS;
    } catch {
      return DEFAULT_TTT_STATS;
    }
  });

  // Snake State
  const [snakeStats, setSnakeStats] = useState<SnakeStats>(() => {
    try {
      const saved = localStorage.getItem('snake_stats');
      return saved ? { ...DEFAULT_SNAKE_STATS, ...JSON.parse(saved) } : DEFAULT_SNAKE_STATS;
    } catch {
      return DEFAULT_SNAKE_STATS;
    }
  });

  // Connect 4 State
  const [connect4Stats, setConnect4Stats] = useState<Connect4Stats>(() => {
    try {
      const saved = localStorage.getItem('connect4_stats');
      return saved ? { ...DEFAULT_CONNECT4_STATS, ...JSON.parse(saved) } : DEFAULT_CONNECT4_STATS;
    } catch {
      return DEFAULT_CONNECT4_STATS;
    }
  });

  // 2048 State
  const [game2048Stats, setGame2048Stats] = useState<Game2048Stats>(() => {
    try {
      const saved = localStorage.getItem('game2048_stats');
      return saved ? { ...DEFAULT_2048_STATS, ...JSON.parse(saved) } : DEFAULT_2048_STATS;
    } catch {
      return DEFAULT_2048_STATS;
    }
  });

  // Global Sound state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('arcade_sound');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Persistence
  useEffect(() => {
    try {
      localStorage.setItem('ttt_config', JSON.stringify(tttConfig));
    } catch {}
  }, [tttConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('ttt_stats', JSON.stringify(tttStats));
    } catch {}
  }, [tttStats]);

  useEffect(() => {
    try {
      localStorage.setItem('snake_stats', JSON.stringify(snakeStats));
    } catch {}
  }, [snakeStats]);

  useEffect(() => {
    try {
      localStorage.setItem('connect4_stats', JSON.stringify(connect4Stats));
    } catch {}
  }, [connect4Stats]);

  useEffect(() => {
    try {
      localStorage.setItem('game2048_stats', JSON.stringify(game2048Stats));
    } catch {}
  }, [game2048Stats]);

  useEffect(() => {
    try {
      localStorage.setItem('arcade_sound', JSON.stringify(soundEnabled));
      setTttConfig((prev) => ({ ...prev, soundEnabled }));
    } catch {}
  }, [soundEnabled]);

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const nextVal = !prev;
      playClickSound(nextVal);
      return nextVal;
    });
  };

  return (
    <MobileFrame>
      {/* 1. Main Game Center Hub */}
      {activeGame === 'hub' && (
        <ArcadeHub
          onSelectGame={(gameId) => setActiveGame(gameId)}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          tttStreak={tttStats.bestStreak}
          snakeHighScore={snakeStats.highScore}
          connect4Wins={connect4Stats.winsP1 + connect4Stats.winsP2}
          score2048HighScore={game2048Stats.highScore}
        />
      )}

      {/* 2. Ultimate Tic-Tac-Toe Game */}
      {activeGame === 'tictactoe' && (
        <TicTacToeGame
          onBackToHub={() => setActiveGame('hub')}
          config={tttConfig}
          onUpdateConfig={(newConf) => setTttConfig((p) => ({ ...p, ...newConf }))}
          onToggleSound={handleToggleSound}
          stats={tttStats}
          onUpdateStats={setTttStats}
        />
      )}

      {/* 2.5. Neon Ludo King */}
      {activeGame === 'ludo' && (
        <NeonLudoGame
          onBackToHub={() => setActiveGame('hub')}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* 2.8. Neon Carrom Pool */}
      {activeGame === 'carrom' && (
        <NeonCarromGame
          onBackToHub={() => setActiveGame('hub')}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* 2.9. Neon UNO / Card 8 */}
      {activeGame === 'uno' && (
        <NeonUnoGame
          onBackToHub={() => setActiveGame('hub')}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {/* 3. Cyber Snake 2099 */}
      {activeGame === 'snake' && (
        <CyberSnake
          onBackToHub={() => setActiveGame('hub')}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          stats={snakeStats}
          onUpdateStats={setSnakeStats}
        />
      )}

      {/* 4. Neon Connect 4 */}
      {activeGame === 'connect4' && (
        <NeonConnect4
          onBackToHub={() => setActiveGame('hub')}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          stats={connect4Stats}
          onUpdateStats={setConnect4Stats}
        />
      )}

      {/* 5. Neon 2048 Matrix */}
      {activeGame === '2048' && (
        <Neon2048
          onBackToHub={() => setActiveGame('hub')}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          stats={game2048Stats}
          onUpdateStats={setGame2048Stats}
        />
      )}
    </MobileFrame>
  );
}
