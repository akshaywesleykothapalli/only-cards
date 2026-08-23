import { useEffect, useRef } from 'react';

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const muteRef = useRef<boolean>(false);
  const volumeRef = useRef<number>(0.5); // global volume scaling

  useEffect(() => {
    // Lazy initialize context on first click or interaction
    const initCtx = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    
    window.addEventListener('click', initCtx);
    window.addEventListener('keydown', initCtx);
    return () => {
      window.removeEventListener('click', initCtx);
      window.removeEventListener('keydown', initCtx);
    };
  }, []);

  const getCtx = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playSynthNode = (
    freqs: number[],
    durations: number[],
    type: OscillatorType = 'sine',
    volumeScale = 1
  ) => {
    if (muteRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volumeRef.current * volumeScale * 0.2, ctx.currentTime);
    masterGain.connect(ctx.destination);

    let timeOffset = ctx.currentTime;
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const dur = durations[idx] || 0.2;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, timeOffset);

      gainNode.gain.setValueAtTime(1, timeOffset);
      gainNode.gain.exponentialRampToValueAtTime(0.001, timeOffset + dur);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(timeOffset);
      osc.stop(timeOffset + dur);

      timeOffset += dur * 0.4; // overlapping notes
    });
  };

  const createNoiseBuffer = (ctx: AudioContext, duration: number) => {
    const sampleCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      const fade = 1 - i / sampleCount;
      data[i] = (Math.random() * 2 - 1) * fade * fade;
    }
    return buffer;
  };

  const playCardFoley = (variant: 'draw' | 'play') => {
    if (muteRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = variant === 'draw' ? 0.24 : 0.15;
    const source = ctx.createBufferSource();
    const bodyFilter = ctx.createBiquadFilter();
    const polishFilter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();
    const polishGain = ctx.createGain();

    source.buffer = createNoiseBuffer(ctx, duration);
    source.playbackRate.setValueAtTime(variant === 'draw' ? 0.92 : 1.04, now);

    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(variant === 'draw' ? 1320 : 1180, now);
    bodyFilter.frequency.exponentialRampToValueAtTime(variant === 'draw' ? 760 : 680, now + duration);
    bodyFilter.Q.setValueAtTime(0.42, now);

    polishFilter.type = 'bandpass';
    polishFilter.frequency.setValueAtTime(variant === 'draw' ? 1850 : 1600, now);
    polishFilter.Q.setValueAtTime(0.55, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(volumeRef.current * (variant === 'draw' ? 0.13 : 0.18), now + 0.035);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.025);

    polishGain.gain.setValueAtTime(0.0001, now);
    polishGain.gain.linearRampToValueAtTime(volumeRef.current * (variant === 'draw' ? 0.025 : 0.04), now + 0.02);
    polishGain.gain.exponentialRampToValueAtTime(0.0001, now + (variant === 'draw' ? 0.16 : 0.095));

    source.connect(bodyFilter);
    bodyFilter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.connect(polishFilter);
    polishFilter.connect(polishGain);
    polishGain.connect(ctx.destination);

    if (variant === 'play') {
      const tap = ctx.createOscillator();
      const tapGain = ctx.createGain();
      tap.type = 'triangle';
      tap.frequency.setValueAtTime(72, now);
      tap.frequency.exponentialRampToValueAtTime(48, now + 0.06);
      tapGain.gain.setValueAtTime(0.0001, now);
      tapGain.gain.linearRampToValueAtTime(volumeRef.current * 0.035, now + 0.012);
      tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
      tap.connect(tapGain);
      tapGain.connect(ctx.destination);
      tap.start(now);
      tap.stop(now + 0.075);
    }

    source.start(now);
    source.stop(now + duration + 0.03);
  };

  // 1. Play Hover click
  const playHover = () => {
    playSynthNode([600], [0.03], 'sine', 0.2);
  };

  // 2. Play Select button
  const playSelect = () => {
    playSynthNode([400, 800], [0.05, 0.08], 'sine', 0.6);
  };

  // 3. Play Draw card sound
  const playDraw = () => {
    playCardFoley('draw');
  };

  // 4. Play Discard/Play card sound
  const playPlayCard = () => {
    playCardFoley('play');
  };

  // 5. Play Warning Timer Alert
  const playTimerAlert = () => {
    playSynthNode([1000, 800], [0.1, 0.1], 'square', 0.4);
  };

  // 6. Play Victory fan fare
  const playVictory = () => {
    // Upward pentatonic major chord progression
    playSynthNode([261.6, 329.6, 392.0, 523.3, 659.3, 784.0, 1047.0], [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.4], 'triangle', 0.8);
  };

  // 7. Play Defeat sound
  const playDefeat = () => {
    // Downward detuned progression
    playSynthNode([196.0, 164.8, 130.8, 98.0, 73.4], [0.3, 0.3, 0.3, 0.3, 0.6], 'sawtooth', 0.6);
  };

  // 8. LAST CARD call indicator sound
  const playLastCardCall = () => {
    playSynthNode([880, 1174], [0.15, 0.35], 'triangle', 0.8);
  };

  // 9. Flip card sound effect
  const playFlip = () => {
    if (muteRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    // Whoosh sound with frequency sweep
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);

    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(volumeRef.current * 0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  };

  return {
    playHover,
    playSelect,
    playDraw,
    playPlayCard,
    playTimerAlert,
    playVictory,
    playDefeat,
    playLastCardCall,
    playFlip,
    setMute: (mute: boolean) => { muteRef.current = mute; },
    setVolume: (vol: number) => { volumeRef.current = vol; }
  };
}
