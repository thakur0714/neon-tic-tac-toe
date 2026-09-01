import confetti from 'canvas-confetti';

/**
 * Trigger lightweight, high-performance cyber celebration confetti
 * Optimized for mobile GPUs with zero frame drops
 */
export function fireWinnerConfetti() {
  const count = 55;
  const defaults = {
    origin: { y: 0.65 },
    colors: ['#00F0FF', '#FF007F', '#FACC15', '#A855F7', '#38BDF8'],
    disableForReducedMotion: true,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Fast, crisp 2-burst celebration
  fire(0.6, {
    spread: 65,
    startVelocity: 35,
    decay: 0.93,
    scalar: 0.9,
  });

  fire(0.4, {
    spread: 100,
    startVelocity: 40,
    decay: 0.92,
    scalar: 1.0,
  });
}

