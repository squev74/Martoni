import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Layout, STEP_DESCRIPTIONS } from './components/Layout';
import { Home } from './components/Home';
import { LobbySetup } from './components/LobbySetup';
import { Lobby } from './components/Lobby';
import { MultiGameScreen } from './components/MultiGameScreen';
import { QuestionCard } from './components/QuestionCard';
import { AnswerInput } from './components/AnswerInput';
import { VoteScreen } from './components/VoteScreen';
import { RevealScreen } from './components/RevealScreen';
import { ScoreBoard } from './components/ScoreBoard';
import { subscribeToRoom } from './services/roomService';
import { Room } from './types/multi';

type AppMode = 'HOME' | 'SOLO' | 'MULTI_SETUP' | 'MULTI_LOBBY';

const SoloGameArena: React.FC<{ onBackToHome: () => void }> = ({ onBackToHome }) => {
  const {
    gamePhase,
    humanName,
    setHumanName,
    players,
    currentRound,
    totalRounds,
    currentStep,
    currentQuestion,
    cards,
    roundScoreBreakdowns,
    history,
    gameStats,
    endGameComment,
    isGeneratingEndComment,
    startNewGame,
    submitHumanAnswer,
    advanceToStep5Immediately,
    submitHumanVote,
    proceedToStep7,
    nextRoundOrFinish,
  } = useGame();

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <span>← Retour à l'accueil</span>
        </button>
      </div>

      {gamePhase === 'WELCOME' && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-center space-y-6 shadow-xl max-w-xl mx-auto">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white font-serif-display">Commencer la partie Solo</h2>
            <p className="text-sm text-slate-400">Entrez votre pseudonyme pour affronter les 3 IA.</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              startNewGame(humanName);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              maxLength={24}
              value={humanName}
              onChange={(e) => setHumanName(e.target.value)}
              placeholder="Vous"
              className="w-full min-h-[48px] rounded-2xl bg-slate-950 border border-slate-700 px-4 text-base text-white text-center focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full min-h-[52px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-base transition-transform active:scale-[0.99] flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/15 cursor-pointer"
            >
              <span>Lancer le jeu solo</span>
            </button>
          </form>
        </div>
      )}

      {gamePhase === 'PLAYING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div
            className={`${
              currentStep === 6 || currentStep === 7 ? 'lg:col-span-12' : 'lg:col-span-8'
            } space-y-4 min-w-0`}
          >
            <QuestionCard
              question={currentQuestion}
              roundNumber={currentRound}
              totalRounds={totalRounds}
              currentStep={currentStep}
            />

            {(currentStep === 1 || currentStep === 2 || currentStep === 3) && (
              <AnswerInput
                question={currentQuestion}
                currentStep={currentStep}
                onSubmitAnswer={submitHumanAnswer}
                onSkipAIWait={advanceToStep5Immediately}
              />
            )}

            {(currentStep === 4 || currentStep === 5) && (
              <VoteScreen
                cards={cards}
                currentStep={currentStep}
                onSubmitVote={submitHumanVote}
              />
            )}

            {(currentStep === 6 || currentStep === 7) && (
              <RevealScreen
                question={currentQuestion}
                cards={cards}
                players={players}
                scoreBreakdowns={roundScoreBreakdowns}
                currentStep={currentStep}
                currentRound={currentRound}
                totalRounds={totalRounds}
                onProceedToStep7={proceedToStep7}
                onNextRoundOrFinish={nextRoundOrFinish}
              />
            )}
          </div>

          {currentStep < 6 && (
            <aside className="hidden lg:block lg:col-span-4 space-y-5">
              <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white font-serif-display">
                    Scores en direct
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-slate-400">
                    Manche {currentRound}/{totalRounds}
                  </span>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {sortedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div
                          className={`font-semibold truncate ${
                            !player.isAI ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {player.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {player.truthsFound} vérité{player.truthsFound > 1 ? 's' : ''} ·{' '}
                          {player.bluffsSucceeded} bluff{player.bluffsSucceeded > 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="font-mono tabular-nums text-sm font-bold text-white shrink-0">
                        {player.score} pts
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-900/75 border border-slate-800 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white font-serif-display">
                  Progression des 7 étapes
                </h3>
                <div className="space-y-2">
                  {STEP_DESCRIPTIONS.map((item) => {
                    const isActive = currentStep === item.step;
                    const isDone = currentStep > item.step;
                    return (
                      <div
                        key={item.step}
                        className={`text-xs flex items-start gap-2.5 py-1 ${
                          isActive
                            ? 'text-amber-400 font-semibold'
                            : isDone
                            ? 'text-slate-400'
                            : 'text-slate-500'
                        }`}
                      >
                        <span className="font-mono tabular-nums shrink-0">
                          0{item.step}.
                        </span>
                        <div>
                          <span>{item.title}</span>
                          <span className="mx-1.5 text-slate-600">·</span>
                          <span className="font-normal text-slate-400">{item.detail}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {gamePhase === 'GAME_OVER' && (
        <div className="max-w-3xl mx-auto">
          <ScoreBoard
            players={players}
            stats={gameStats}
            history={history}
            endGameComment={endGameComment}
            isGeneratingEndComment={isGeneratingEndComment}
            onPlayAgain={() => startNewGame(humanName)}
          />
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('HOME');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<Room | null>(null);

  useEffect(() => {
    if (!activeRoomCode) {
      setRoomData(null);
      return;
    }
    const unsubscribe = subscribeToRoom(activeRoomCode, (room) => {
      setRoomData(room);
      if (!room) {
        setAppMode('MULTI_SETUP');
        setActiveRoomCode(null);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [activeRoomCode]);

  return (
    <GameProvider>
      <Layout>
        {appMode === 'HOME' && (
          <Home
            onStartSolo={() => setAppMode('SOLO')}
            onStartMulti={() => setAppMode('MULTI_SETUP')}
          />
        )}

        {appMode === 'SOLO' && (
          <SoloGameArena onBackToHome={() => setAppMode('HOME')} />
        )}

        {appMode === 'MULTI_SETUP' && (
          <LobbySetup
            onBackToModeSelect={() => setAppMode('HOME')}
            onRoomJoined={(code, playerId, room) => {
              setActiveRoomCode(code);
              setActivePlayerId(playerId);
              setRoomData(room);
              setAppMode('MULTI_LOBBY');
            }}
          />
        )}

        {appMode === 'MULTI_LOBBY' && roomData && activePlayerId && (
          roomData.state === 'LOBBY' ? (
            <Lobby
              room={roomData}
              playerId={activePlayerId}
              onLeaveRoom={() => {
                setActiveRoomCode(null);
                setActivePlayerId(null);
                setRoomData(null);
                setAppMode('MULTI_SETUP');
              }}
            />
          ) : (
            <MultiGameScreen
              roomCode={roomData.code}
              playerId={activePlayerId}
              onLeaveRoom={() => {
                setActiveRoomCode(null);
                setActivePlayerId(null);
                setRoomData(null);
                setAppMode('HOME');
              }}
            />
          )
        )}

        {appMode === 'MULTI_LOBBY' && (!roomData || !activePlayerId) && (
          <div className="text-center py-12 text-slate-400">Chargement du salon...</div>
        )}
      </Layout>
    </GameProvider>
  );
}
