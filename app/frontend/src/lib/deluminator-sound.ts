/**
 * The sound of the theme change. The clips live in public/sounds and aren't in git: without them
 * the effect simply plays silently.
 */

type Theme = 'light' | 'dark';

const CLIPS: Record<Theme, { src: string; startSeconds: number }> = {
  dark: { src: '/sounds/Deluminator_light-in.mp3', startSeconds: 0 },
  // This clip opens with 0.4 s of silence.
  light: { src: '/sounds/Deluminator_light-out.mp3', startSeconds: 0.4 },
};

const players = new Map<Theme, HTMLAudioElement>();

function player(theme: Theme) {
  let audio = players.get(theme);
  if (!audio) {
    audio = new Audio(CLIPS[theme].src);
    audio.preload = 'auto';
    players.set(theme, audio);
  }
  return audio;
}

/** Loads both clips ahead of the click, so the first press has no delay. */
export function preloadDeluminatorSounds() {
  player('dark');
  player('light');
}

/** Call from the click itself: browsers only allow sound that follows a user gesture. */
export function playDeluminatorSound(theme: Theme) {
  player(theme === 'dark' ? 'light' : 'dark').pause();
  const audio = player(theme);
  audio.currentTime = CLIPS[theme].startSeconds;
  // Rejected when the file is missing or the browser refuses: the effect goes on without sound.
  void Promise.resolve(audio.play()).catch(() => undefined);
}
