'use client';

import Lobby from '../../components/Lobby';
import ToastContainer from '../../components/ToastContainer';
import ReconnectOverlay from '../../components/ReconnectOverlay';

export default function ReadyToPlayPage() {
  return <><ToastContainer /><ReconnectOverlay /><Lobby /></>;
}
