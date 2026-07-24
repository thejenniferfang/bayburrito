/**
 * Sound via HTML5 <audio> elements (not WebAudio). This matters on mobile:
 * iOS Safari mutes WebAudio when the hardware silent switch is on, but plays
 * gesture-initiated <audio> elements through it. Each sound keeps a small pool
 * of clones so rapid taps can overlap.
 */

export type SoundName = "foil-peel" | "munch-1" | "munch-2";

const FILES: Record<SoundName, string> = {
  "foil-peel": "/sounds/foil-peel.mp3",
  "munch-1": "/sounds/munch-1.mp3",
  "munch-2": "/sounds/munch-2.mp3",
};

const pool: Partial<Record<SoundName, HTMLAudioElement[]>> = {};
let ready = false;

/** Preload the sounds. Safe to call on any early user gesture. */
export function initAudio() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  (Object.keys(FILES) as SoundName[]).forEach((name) => {
    pool[name] = Array.from({ length: 3 }, () => {
      const a = new Audio(FILES[name]);
      a.preload = "auto";
      a.volume = 0.6;
      return a;
    });
  });
}

export function play(name: SoundName) {
  if (!ready) initAudio();
  const clones = pool[name];
  if (!clones) return;
  // reuse an idle clone (or the first) so quick repeated taps overlap
  const a = clones.find((c) => c.paused || c.ended) ?? clones[0];
  try {
    a.currentTime = 0;
    void a.play();
  } catch {
    // some browsers reject play() outside a gesture; ignore
  }
}

export function playMunch() {
  play(Math.random() < 0.5 ? "munch-1" : "munch-2");
}
