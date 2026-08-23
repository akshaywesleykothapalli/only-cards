'use client';

import Lobby from '../../components/Lobby';
import ToastContainer from '../../components/ToastContainer';
import ReconnectOverlay from '../../components/ReconnectOverlay';
import { SiteFooter } from '../../components/SiteFooter';

export default function ReadyToPlayPage() {
  return <><ToastContainer /><ReconnectOverlay /><Lobby /><SiteFooter /></>;
}
