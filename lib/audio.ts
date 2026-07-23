/**
 * Web Audio engine. Initialized on the first user gesture (browsers block
 * audio before one). Tries real files in /public/sounds first; if a file is
 * missing it synthesizes a stand-in (filtered noise) so the experience never
 * breaks or goes silent.
 */

export type SoundName = "foil-peel" | "munch-1" | "munch-2";

const FILES: Record<SoundName, string> = {
  "foil-peel": "/sounds/foil-peel.mp3",
  "munch-1": "/sounds/munch-1.mp3",
  "munch-2": "/sounds/munch-2.mp3",
};

let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, AudioBuffer>();
let loading: Promise<void> | null = null;

function synthFoil(ac: AudioContext): AudioBuffer {
  const dur = 0.8;
  const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buf.getChannelData(0);
  // crinkle: sparse random spikes over quiet noise, densest in the middle
  let crackle = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    const env = Math.sin(Math.PI * t) ** 0.6;
    if (Math.random() < 0.012 * env) crackle = (Math.random() * 2 - 1) * 0.9;
    crackle *= 0.86;
    data[i] = (crackle + (Math.random() * 2 - 1) * 0.05) * env;
  }
  return buf;
}

function synthMunch(ac: AudioContext, pitch: number): AudioBuffer {
  const dur = 0.22;
  const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buf.getChannelData(0);
  // crunchy bite: dense crackle burst with a fast decay
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    const env = Math.exp(-t * 9);
    const white = Math.random() * 2 - 1;
    last = last * pitch + white * (1 - pitch); // one-pole lowpass
    const spike = Math.random() < 0.06 ? white * 0.8 : 0;
    data[i] = (last * 0.9 + spike) * env;
  }
  return buf;
}

async function loadBuffer(ac: AudioContext, name: SoundName) {
  try {
    const res = await fetch(FILES[name]);
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || type.includes("text/html")) throw new Error("missing");
    buffers.set(name, await ac.decodeAudioData(await res.arrayBuffer()));
  } catch {
    if (name === "foil-peel") buffers.set(name, synthFoil(ac));
    else buffers.set(name, synthMunch(ac, name === "munch-1" ? 0.55 : 0.7));
  }
}

/** Call from the first pointer event. Unlocks audio + preloads everything. */
export function initAudio() {
  if (ctx) return;
  if (typeof window === "undefined" || !("AudioContext" in window)) return;
  ctx = new AudioContext();
  loading = Promise.all(
    (Object.keys(FILES) as SoundName[]).map((n) => loadBuffer(ctx!, n))
  ).then(() => undefined);
}

export function play(name: SoundName) {
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  const fire = () => {
    const buf = buffers.get(name);
    if (!buf || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = 0.55;
    src.connect(gain).connect(ctx.destination);
    src.start();
  };
  if (buffers.has(name)) fire();
  else void loading?.then(fire);
}

export function playMunch() {
  play(Math.random() < 0.5 ? "munch-1" : "munch-2");
}
