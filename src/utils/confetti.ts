import confetti from 'canvas-confetti';

/**
 * Trigger full-screen high-energy cyber celebration confetti
 */
export function fireWinnerConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#00F0FF', '#FF007F', '#FACC15', '#A855F7', '#FFFFFF', '#38BDF8'],
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Multi-stage celebratory blast sequence
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });

  // Secondary side cannons
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.85 },
      colors: ['#00F0FF', '#FF007F', '#38BDF8'],
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.85 },
      colors: ['#FF007F', '#FACC15', '#A855F7'],
    });
  }, 250);
}
