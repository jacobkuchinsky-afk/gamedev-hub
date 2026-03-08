"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Square,
  Download,
  Shuffle,
  Volume2,
  ArrowLeft,
  Zap,
  Crosshair,
  Bomb,
  ArrowUp,
  Star,
  Heart,
  MousePointerClick,
  Dice5,
  AlertTriangle,
  CheckCircle,
  Wind,
  Sparkles,
  Loader2,
  ListMusic,
  Check,
  ChevronDown,
  Save,
  Trash2,
  FileDown,
} from "lucide-react";
import Link from "next/link";

type WaveType = "sine" | "square" | "sawtooth" | "triangle";

interface SoundParams {
  waveType: WaveType;
  freqStart: number;
  freqEnd: number;
  duration: number;
  volume: number;
  decay: number;
}

interface Preset {
  name: string;
  icon: typeof Play;
  params: SoundParams;
}

interface SoundAdviceItem {
  name: string;
  description: string;
  checked: boolean;
}

interface SoundAdvice {
  category: string;
  items: SoundAdviceItem[];
}

interface SavedSound {
  id: string;
  name: string;
  params: SoundParams;
  createdAt: number;
}

const WAVE_TYPES: WaveType[] = ["sine", "square", "sawtooth", "triangle"];

const PRESETS: Preset[] = [
  {
    name: "Coin/Pickup",
    icon: Star,
    params: { waveType: "square", freqStart: 587, freqEnd: 1175, duration: 0.15, volume: 0.3, decay: 0.1 },
  },
  {
    name: "Laser/Shoot",
    icon: Crosshair,
    params: { waveType: "sawtooth", freqStart: 1200, freqEnd: 200, duration: 0.2, volume: 0.25, decay: 0.15 },
  },
  {
    name: "Explosion",
    icon: Bomb,
    params: { waveType: "sawtooth", freqStart: 300, freqEnd: 20, duration: 0.6, volume: 0.4, decay: 0.5 },
  },
  {
    name: "Jump",
    icon: ArrowUp,
    params: { waveType: "square", freqStart: 300, freqEnd: 600, duration: 0.15, volume: 0.25, decay: 0.08 },
  },
  {
    name: "PowerUp",
    icon: Zap,
    params: { waveType: "sine", freqStart: 400, freqEnd: 1400, duration: 0.5, volume: 0.3, decay: 0.35 },
  },
  {
    name: "Hit/Hurt",
    icon: Heart,
    params: { waveType: "square", freqStart: 400, freqEnd: 100, duration: 0.2, volume: 0.35, decay: 0.18 },
  },
  {
    name: "Blip/Select",
    icon: MousePointerClick,
    params: { waveType: "sine", freqStart: 660, freqEnd: 880, duration: 0.08, volume: 0.2, decay: 0.05 },
  },
  {
    name: "Error",
    icon: AlertTriangle,
    params: { waveType: "square", freqStart: 200, freqEnd: 120, duration: 0.4, volume: 0.3, decay: 0.35 },
  },
  {
    name: "Success",
    icon: CheckCircle,
    params: { waveType: "sine", freqStart: 523, freqEnd: 1047, duration: 0.3, volume: 0.25, decay: 0.2 },
  },
  {
    name: "Whoosh",
    icon: Wind,
    params: { waveType: "sawtooth", freqStart: 900, freqEnd: 80, duration: 0.25, volume: 0.2, decay: 0.22 },
  },
  {
    name: "Random",
    icon: Dice5,
    params: { waveType: "sine", freqStart: 440, freqEnd: 440, duration: 0.3, volume: 0.3, decay: 0.2 },
  },
];

function randomParams(): SoundParams {
  const wt = WAVE_TYPES[Math.floor(Math.random() * WAVE_TYPES.length)];
  return {
    waveType: wt,
    freqStart: 50 + Math.random() * 2000,
    freqEnd: 50 + Math.random() * 2000,
    duration: 0.05 + Math.random() * 0.8,
    volume: 0.1 + Math.random() * 0.4,
    decay: 0.02 + Math.random() * 0.6,
  };
}

function renderSound(
  ctx: AudioContext | OfflineAudioContext,
  params: SoundParams,
  destination: AudioNode
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = params.waveType;
  osc.frequency.setValueAtTime(params.freqStart, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(params.freqEnd, 1),
    ctx.currentTime + params.duration
  );
  gain.gain.setValueAtTime(params.volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + params.decay + 0.01);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + Math.max(params.duration, params.decay) + 0.02);
  return osc;
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export default function SoundsPage() {
  const [params, setParams] = useState<SoundParams>(PRESETS[0].params);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const [showAdvisor, setShowAdvisor] = useState(false);
  const [advisorGenre, setAdvisorGenre] = useState("");
  const [advisorStyle, setAdvisorStyle] = useState("");
  const [advisorMood, setAdvisorMood] = useState("");
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorResults, setAdvisorResults] = useState<SoundAdvice[]>([]);

  const [savedSounds, setSavedSounds] = useState<SavedSound[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showLibrary, setShowLibrary] = useState(true);
  const [aiNamingLoading, setAiNamingLoading] = useState(false);
  const [aiWaveLoading, setAiWaveLoading] = useState(false);
  const [aiWaveResult, setAiWaveResult] = useState("");

  const toggleAdvisorCheck = (catIdx: number, itemIdx: number) => {
    setAdvisorResults((prev) =>
      prev.map((group, gi) =>
        gi === catIdx
          ? {
              ...group,
              items: group.items.map((item, ii) =>
                ii === itemIdx ? { ...item, checked: !item.checked } : item
              ),
            }
          : group
      )
    );
  };

  const handleAISoundDesign = async () => {
    if (!advisorGenre.trim() || advisorLoading) return;
    setAdvisorLoading(true);
    setAdvisorResults([]);
    try {
      const style = advisorStyle.trim() || "stylized";
      const mood = advisorMood.trim() || "engaging";
      const prompt = `List the essential sound effects needed for a ${advisorGenre.trim()} game with ${style} art and ${mood} mood. Group by: Player Actions (5), Environment (5), UI (5), Combat (5). For each: name and brief description of the sound. Be specific to the genre.`;
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 800,
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";

      const groups: SoundAdvice[] = [];
      const groupNames = ["Player Actions", "Environment", "UI", "Combat"];

      for (const gn of groupNames) {
        const idx = content.search(new RegExp(`(?:\\*\\*|#{1,3}\\s*)?${gn}`, "i"));
        if (idx === -1) continue;
        const afterHeader = content.slice(idx);
        const nextGroupIdx = groupNames
          .filter((n) => n !== gn)
          .map((n) => {
            const m = afterHeader
              .slice(gn.length)
              .search(new RegExp(`(?:\\*\\*|#{1,3}\\s*)?${n}`, "i"));
            return m === -1 ? Infinity : m + gn.length;
          })
          .reduce((min, v) => Math.min(min, v), Infinity);
        const sectionText = afterHeader.slice(
          0,
          nextGroupIdx === Infinity ? undefined : nextGroupIdx
        );
        const items = sectionText
          .split("\n")
          .slice(1)
          .map((l) => l.replace(/^[-*\d.)\s]+/, "").trim())
          .filter((l) => l.length > 3)
          .map((l) => {
            const sep = l.search(/\s*[-\u2013\u2014]\s/);
            if (sep > 0) {
              return {
                name: l.slice(0, sep).replace(/\*\*/g, "").trim(),
                description: l
                  .slice(sep)
                  .replace(/^[-\u2013\u2014\s]+/, "")
                  .replace(/\*\*/g, "")
                  .trim(),
                checked: false,
              };
            }
            const colonIdx = l.indexOf(":");
            if (colonIdx > 0 && colonIdx < l.length - 1) {
              return {
                name: l.slice(0, colonIdx).replace(/\*\*/g, "").trim(),
                description: l
                  .slice(colonIdx + 1)
                  .replace(/\*\*/g, "")
                  .trim(),
                checked: false,
              };
            }
            return { name: l.replace(/\*\*/g, "").trim(), description: "", checked: false };
          });
        if (items.length > 0) {
          groups.push({ category: gn, items });
        }
      }

      if (groups.length === 0) {
        const lines = content.split("\n").filter((l: string) => /^\d/.test(l.trim()));
        if (lines.length > 0) {
          groups.push({
            category: "Recommended Sounds",
            items: lines.map((line: string) => {
              const clean = line.replace(/^\d+[.)]\s*/, "").trim();
              const sep = clean.search(/\s*[-\u2013\u2014]\s/);
              if (sep > 0) {
                return {
                  name: clean.slice(0, sep).trim(),
                  description: clean.slice(sep).replace(/^[-\u2013\u2014\s]+/, "").trim(),
                  checked: false,
                };
              }
              return { name: clean, description: "", checked: false };
            }),
          });
        }
      }

      setAdvisorResults(groups);
    } catch {
      // silently fail
    } finally {
      setAdvisorLoading(false);
    }
  };

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    return { ctx: audioCtxRef.current, analyser: analyserRef.current! };
  }, []);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const c = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;
    const bufLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(data);

      c.fillStyle = "#1A1A1A";
      c.fillRect(0, 0, w, h);

      c.lineWidth = 2;
      c.strokeStyle = "#F59E0B";
      c.beginPath();
      const sliceW = w / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = data[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
        x += sliceW;
      }
      c.lineTo(w, h / 2);
      c.stroke();

      c.strokeStyle = "#2A2A2A";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, h / 2);
      c.lineTo(w, h / 2);
      c.stroke();
    };
    draw();
  }, []);

  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d")!;
    const w = canvas.width;
    const h = canvas.height;
    c.fillStyle = "#1A1A1A";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#2A2A2A";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, h / 2);
    c.lineTo(w, h / 2);
    c.stroke();
    c.fillStyle = "#4B5563";
    c.font = "13px Inter, system-ui, sans-serif";
    c.textAlign = "center";
    c.fillText("Play a sound to see the waveform", w / 2, h / 2 - 12);
  }, []);

  useEffect(() => {
    console.log("[SoundsPage] rendered");
    drawIdle();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [drawIdle]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gameforge-sound-library");
      if (stored) setSavedSounds(JSON.parse(stored));
    } catch {}
  }, []);

  const persistSounds = useCallback((sounds: SavedSound[]) => {
    setSavedSounds(sounds);
    localStorage.setItem("gameforge-sound-library", JSON.stringify(sounds));
  }, []);

  const saveCurrentSound = useCallback(() => {
    if (!saveName.trim()) return;
    const newSound: SavedSound = {
      id: Date.now().toString(),
      name: saveName.trim(),
      params: { ...params },
      createdAt: Date.now(),
    };
    persistSounds([newSound, ...savedSounds]);
    setSaveName("");
  }, [saveName, params, savedSounds, persistSounds]);

  const handleAIName = useCallback(async () => {
    if (aiNamingLoading) return;
    setAiNamingLoading(true);
    try {
      const prompt = `Name this retro game sound effect: waveform=${params.waveType}, freq=${Math.round(params.freqStart)}Hz to ${Math.round(params.freqEnd)}Hz, duration=${params.duration.toFixed(2)}s. Give a descriptive name like 'laser_shot_01' or 'coin_pickup'. Just the name.`;
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 128,
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const name = content.replace(/[`'"*\n]/g, "").trim().split(/\s*[\n,]/)[0].trim();
      if (name) setSaveName(name);
    } catch {
      // silently fail
    } finally {
      setAiNamingLoading(false);
    }
  }, [aiNamingLoading, params]);

  const deleteSavedSound = useCallback(
    (id: string) => {
      persistSounds(savedSounds.filter((s) => s.id !== id));
    },
    [savedSounds, persistSounds]
  );

  const exportSoundLibrary = useCallback(() => {
    if (savedSounds.length === 0) return;
    const blob = new Blob([JSON.stringify(savedSounds, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sound-library-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [savedSounds]);

  const playSound = useCallback(
    (p: SoundParams) => {
      console.log("[SoundsPage] playing sound", p);
      const { ctx, analyser } = getAudioCtx();
      cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(true);
      renderSound(ctx, p, analyser);
      drawWaveform();
      const totalDur = Math.max(p.duration, p.decay) + 0.1;
      setTimeout(() => {
        setIsPlaying(false);
        cancelAnimationFrame(animFrameRef.current);
        setTimeout(drawIdle, 200);
      }, totalDur * 1000);
    },
    [getAudioCtx, drawWaveform, drawIdle]
  );

  const handlePreset = (preset: Preset) => {
    console.log("[SoundsPage] preset selected:", preset.name);
    const p = preset.name === "Random" ? randomParams() : { ...preset.params };
    setParams(p);
    playSound(p);
  };

  const handleRandomize = () => {
    console.log("[SoundsPage] randomize");
    const p = randomParams();
    setParams(p);
    playSound(p);
  };

  const handleAIDescribe = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const prompt = `I want to create a retro game sound effect described as: '${aiPrompt.trim()}'. Suggest the best oscillator settings: waveform (sine/square/sawtooth/triangle), base frequency (Hz), end frequency (Hz), attack (0-1), decay (0-1), sustain (0-1), duration (0.1-2.0). Return ONLY a JSON object with these keys: waveform, frequency, endFrequency, attack, decay, sustain, duration.`;
      const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/Kimi-K2.5-TEE",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 256,
          temperature: 0.8,
        }),
      });
      const data = await response.json();
      const content =
        data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "";
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed = JSON.parse(jsonMatch[0]);
      const newParams: SoundParams = {
        waveType: WAVE_TYPES.includes(parsed.waveform) ? parsed.waveform : "square",
        freqStart: Math.max(20, Math.min(4000, Number(parsed.frequency) || 440)),
        freqEnd: Math.max(20, Math.min(4000, Number(parsed.endFrequency) || 220)),
        duration: Math.max(0.01, Math.min(2, Number(parsed.duration) || 0.3)),
        volume: Math.max(0, Math.min(1, Number(parsed.sustain) || 0.3)),
        decay: Math.max(0.01, Math.min(2, Number(parsed.decay) || 0.2)),
      };
      setParams(newParams);
      playSound(newParams);
    } catch {
      const p = randomParams();
      setParams(p);
      playSound(p);
    } finally {
      setAiLoading(false);
    }
  };

  const exportWAV = async () => {
    console.log("[SoundsPage] exporting WAV");
    const sampleRate = 44100;
    const totalDur = Math.max(params.duration, params.decay) + 0.05;
    const length = Math.ceil(sampleRate * totalDur);
    const offline = new OfflineAudioContext(1, length, sampleRate);
    renderSound(offline, params, offline.destination);
    const rendered = await offline.startRendering();
    const samples = rendered.getChannelData(0);
    const blob = encodeWAV(samples, sampleRate);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sfx_${params.waveType}_${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateParam = <K extends keyof SoundParams>(key: K, val: SoundParams[K]) => {
    console.log("[SoundsPage] param changed:", key, val);
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tools"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#9CA3AF] transition-colors hover:text-[#F5F5F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Sound Effect Generator</h1>
          <p className="mt-0.5 text-sm text-[#9CA3AF]">
            Generate retro sound effects using Web Audio synthesis
          </p>
        </div>
      </div>

      {/* Presets */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Presets
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className="flex items-center gap-2.5 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3.5 py-2.5 text-sm font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 active:scale-[0.97]"
            >
              <preset.icon className="h-4 w-4 text-[#F59E0B]" />
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: Waveform + Controls */}
        <div className="space-y-5">
          {/* Waveform Display */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Waveform
              </h2>
              {isPlaying && (
                <span className="flex items-center gap-1.5 text-xs text-[#F59E0B]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F59E0B]" />
                  Playing
                </span>
              )}
            </div>
            <canvas
              ref={canvasRef}
              width={640}
              height={160}
              className="w-full rounded-lg border border-[#2A2A2A]"
            />
          </div>

          {/* Parameter Sliders */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Parameters
            </h2>
            <div className="space-y-4">
              {/* Wave Type */}
              <div>
                <label className="mb-2 block text-xs font-medium text-[#9CA3AF]">
                  Wave Type
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {WAVE_TYPES.map((wt) => (
                    <button
                      key={wt}
                      onClick={() => updateParam("waveType", wt)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                        params.waveType === wt
                          ? "bg-[#F59E0B] text-[#0F0F0F]"
                          : "border border-[#2A2A2A] bg-[#0F0F0F] text-[#9CA3AF] hover:text-[#F5F5F5]"
                      }`}
                    >
                      {wt}
                    </button>
                  ))}
                </div>
              </div>

              <SliderRow
                label="Frequency Start"
                value={params.freqStart}
                min={20}
                max={4000}
                step={1}
                unit="Hz"
                onChange={(v) => updateParam("freqStart", v)}
              />
              <SliderRow
                label="Frequency End"
                value={params.freqEnd}
                min={20}
                max={4000}
                step={1}
                unit="Hz"
                onChange={(v) => updateParam("freqEnd", v)}
              />
              <SliderRow
                label="Duration"
                value={params.duration}
                min={0.01}
                max={2}
                step={0.01}
                unit="s"
                onChange={(v) => updateParam("duration", v)}
              />
              <SliderRow
                label="Volume"
                value={params.volume}
                min={0}
                max={1}
                step={0.01}
                unit=""
                onChange={(v) => updateParam("volume", v)}
              />
              <SliderRow
                label="Decay"
                value={params.decay}
                min={0.01}
                max={2}
                step={0.01}
                unit="s"
                onChange={(v) => updateParam("decay", v)}
              />
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          <button
            onClick={() => playSound(params)}
            disabled={isPlaying}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-4 py-3 text-sm font-bold text-[#0F0F0F] transition-all hover:bg-[#D97706] active:scale-[0.97] disabled:opacity-50"
          >
            {isPlaying ? (
              <>
                <Volume2 className="h-4 w-4 animate-pulse" /> Playing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" /> Play Sound
              </>
            )}
          </button>

          <button
            onClick={handleRandomize}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-sm font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 active:scale-[0.97]"
          >
            <Shuffle className="h-4 w-4 text-[#F59E0B]" /> Randomize
          </button>

          {/* AI Sound Designer */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              AI Sound Designer
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAIDescribe()}
                placeholder="e.g. heavy footstep on metal"
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
              />
              <button
                onClick={handleAIDescribe}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2.5 text-sm font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/20 active:scale-[0.97] disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> AI Describe
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={exportWAV}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-sm font-medium text-[#F5F5F5] transition-all hover:border-[#F59E0B]/40 hover:bg-[#F59E0B]/5 active:scale-[0.97]"
          >
            <Download className="h-4 w-4 text-[#F59E0B]" /> Export WAV
          </button>

          {/* AI Sound Design Advisor */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <button
              onClick={() => setShowAdvisor(!showAdvisor)}
              className="flex w-full items-center justify-between"
            >
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
                <ListMusic className="h-4 w-4 text-[#F59E0B]" />
                AI Sound Design Advisor
              </h3>
              <ChevronDown
                className={`h-4 w-4 text-[#6B7280] transition-transform ${showAdvisor ? "rotate-180" : ""}`}
              />
            </button>

            {showAdvisor && (
              <div className="mt-3 space-y-2.5">
                <input
                  type="text"
                  value={advisorGenre}
                  onChange={(e) => setAdvisorGenre(e.target.value)}
                  placeholder="Genre (e.g. platformer, RPG, horror)"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
                />
                <input
                  type="text"
                  value={advisorStyle}
                  onChange={(e) => setAdvisorStyle(e.target.value)}
                  placeholder="Art style (e.g. pixel art, 3D realistic)"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
                />
                <input
                  type="text"
                  value={advisorMood}
                  onChange={(e) => setAdvisorMood(e.target.value)}
                  placeholder="Mood (e.g. whimsical, dark, intense)"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
                />
                <button
                  onClick={handleAISoundDesign}
                  disabled={advisorLoading || !advisorGenre.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-2.5 text-sm font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/20 active:scale-[0.97] disabled:opacity-50"
                >
                  {advisorLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Get Sound Checklist
                    </>
                  )}
                </button>

                {advisorResults.length > 0 && (
                  <div className="mt-1 space-y-3">
                    {advisorResults.map((group, gi) => (
                      <div key={gi}>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                          {group.category}
                        </p>
                        <div className="space-y-1">
                          {group.items.map((item, ii) => (
                            <button
                              key={ii}
                              onClick={() => toggleAdvisorCheck(gi, ii)}
                              className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                                item.checked
                                  ? "bg-[#F59E0B]/5 text-[#6B7280] line-through"
                                  : "text-[#D1D5DB] hover:bg-[#0F0F0F]"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                  item.checked
                                    ? "border-[#F59E0B] bg-[#F59E0B]"
                                    : "border-[#4B5563]"
                                }`}
                              >
                                {item.checked && (
                                  <Check className="h-2.5 w-2.5 text-[#0F0F0F]" />
                                )}
                              </span>
                              <span>
                                <span className="font-medium">{item.name}</span>
                                {item.description && (
                                  <span className="text-[#6B7280]">
                                    {" "}
                                    &mdash; {item.description}
                                  </span>
                                )}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Current params summary */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Current Settings
            </h3>
            <div className="space-y-2 text-xs">
              <ParamRow label="Wave" value={params.waveType} />
              <ParamRow label="Freq Start" value={`${Math.round(params.freqStart)} Hz`} />
              <ParamRow label="Freq End" value={`${Math.round(params.freqEnd)} Hz`} />
              <ParamRow label="Duration" value={`${params.duration.toFixed(2)} s`} />
              <ParamRow label="Volume" value={`${Math.round(params.volume * 100)}%`} />
              <ParamRow label="Decay" value={`${params.decay.toFixed(2)} s`} />
            </div>
          </div>

          {/* AI Waveform Description */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">AI Waveform Insight</h3>
              <button
                onClick={async () => {
                  if (aiWaveLoading) return;
                  setAiWaveLoading(true);
                  setAiWaveResult("");
                  try {
                    const response = await fetch("https://llm.chutes.ai/v1/chat/completions", {
                      method: "POST",
                      headers: { Authorization: "Bearer " + (process.env.NEXT_PUBLIC_CHUTES_API_TOKEN || ""), "Content-Type": "application/json" },
                      body: JSON.stringify({ model: "moonshotai/Kimi-K2.5-TEE", messages: [{ role: "user", content: `Describe this sound waveform: ${params.waveType} at ${Math.round(params.freqStart)}Hz. What game sound does it resemble? 1 sentence.` }], stream: false, max_tokens: 128, temperature: 0.7 }),
                    });
                    const data = await response.json();
                    setAiWaveResult(data.choices?.[0]?.message?.content || data.choices?.[0]?.message?.reasoning || "");
                  } catch {} finally { setAiWaveLoading(false); }
                }}
                disabled={aiWaveLoading}
                className="flex items-center gap-1.5 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/20 disabled:opacity-50"
              >
                {aiWaveLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Describe
              </button>
            </div>
            {aiWaveResult && (
              <p className="mt-2 text-xs leading-relaxed text-[#D1D5DB]">{aiWaveResult}</p>
            )}
          </div>

          {/* Tips */}
          <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
              Tips
            </h3>
            <ul className="space-y-1.5 text-xs leading-relaxed text-[#9CA3AF]">
              <li>High-to-low frequency = descending (lasers, falls)</li>
              <li>Low-to-high = ascending (jumps, pickups)</li>
              <li>Short duration + square wave = classic retro</li>
              <li>Sawtooth + long decay = rumbling effects</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sound Library */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-5">
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className="flex w-full items-center justify-between"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#9CA3AF]">
            <ListMusic className="h-4 w-4 text-[#F59E0B]" />
            Sound Library
            {savedSounds.length > 0 && (
              <span className="ml-1 rounded-full bg-[#F59E0B]/15 px-2 py-0.5 text-[10px] font-bold text-[#F59E0B]">
                {savedSounds.length}
              </span>
            )}
          </h2>
          <ChevronDown
            className={`h-4 w-4 text-[#6B7280] transition-transform ${showLibrary ? "rotate-180" : ""}`}
          />
        </button>

        {showLibrary && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCurrentSound()}
                placeholder="Name this sound..."
                className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[#F59E0B]/40"
              />
              <button
                onClick={handleAIName}
                disabled={aiNamingLoading}
                title="AI Name"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B] transition-all hover:bg-[#F59E0B]/20 active:scale-[0.93] disabled:opacity-50"
              >
                {aiNamingLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={saveCurrentSound}
                disabled={!saveName.trim()}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-[#F59E0B] px-4 py-2 text-sm font-semibold text-[#0F0F0F] transition-all hover:bg-[#D97706] active:scale-[0.97] disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
            </div>

            {savedSounds.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#4B5563]">
                No saved sounds yet. Tweak a sound and save it to build your
                library.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  {savedSounds.map((sound) => (
                    <div
                      key={sound.id}
                      className="group flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-2.5 transition-colors hover:border-[#F59E0B]/20"
                    >
                      <button
                        onClick={() => playSound(sound.params)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F59E0B]/10 text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/25"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setParams(sound.params)}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#F5F5F5]">
                            {sound.name}
                          </p>
                          <p className="text-[11px] text-[#6B7280]">
                            {sound.params.waveType} &middot;{" "}
                            {Math.round(sound.params.freqStart)}Hz &rarr;{" "}
                            {Math.round(sound.params.freqEnd)}Hz &middot;{" "}
                            {sound.params.duration.toFixed(2)}s
                          </p>
                        </div>
                      </button>
                      <button
                        onClick={() => deleteSavedSound(sound.id)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#4B5563] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={exportSoundLibrary}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] px-4 py-2.5 text-sm font-medium text-[#9CA3AF] transition-all hover:border-[#F59E0B]/30 hover:text-[#F59E0B]"
                >
                  <FileDown className="h-4 w-4" />
                  Export Library as JSON
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-[#9CA3AF]">{label}</label>
        <span className="text-xs tabular-nums text-[#F5F5F5]">
          {step < 1 ? value.toFixed(2) : Math.round(value)}
          {unit && ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#F59E0B]"
      />
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-mono text-[#F5F5F5]">{value}</span>
    </div>
  );
}
