'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '../../store/useGameStore';
import GameTable from '../../components/GameTable';
import WaitingRoom from '../../components/WaitingRoom';
import ToastContainer from '../../components/ToastContainer';
import ReconnectOverlay from '../../components/ReconnectOverlay';

export default function GamePage() {
  const router = useRouter();
  const { roomState, gameState } = useGameStore();

  useEffect(() => {
    if (!roomState && !gameState) router.replace('/ready-to-play');
  }, [roomState, gameState, router]);

  if (!roomState && !gameState) return null;
  return <>{gameState || roomState?.isStarted ? <GameTable /> : <WaitingRoom />}<ToastContainer /><ReconnectOverlay /></>;
}
