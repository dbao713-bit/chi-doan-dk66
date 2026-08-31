"use client";

import {
  Dices,
  Maximize2,
  Medal,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type RaceStatus = "setup" | "countdown" | "racing" | "finished";

type Member = {
  id: number;
  full_name: string;
  student_id: string;
  class_name: string;
  avatar: string | null;
};

type Racer = {
  id: number;
  memberId: number;
  name: string;
  studentId: string;
  className: string;
  color: string;

  skill: number;
  phase: number;
  frequency: number;
  finishBias: number;
  luck: number;

  progress: number;
  speed: number;
  targetSpeed: number;
  acceleration: number;

  finished: boolean;
  rank: number | null;
  finishTime: number | null;

  finalBurst: boolean;
  burstPower: number;
};

const FROG_COLORS = [
  "#16a34a",
  "#22c55e",
  "#eab308",
  "#f59e0b",
  "#0ea5e9",
  "#06b6d4",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#14b8a6",
  "#84cc16",
];

const MIN_RACERS = 2;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(ms: number | null) {
  if (ms === null) return "--";
  return `${(ms / 1000).toFixed(2)}s`;
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createRacers(members: Member[]): Racer[] {
  return shuffle(members).map((member, index) => {
    const initialSpeed = 0.94 + Math.random() * 0.12;
    return {
      id: index + 1,
      memberId: member.id,
      name: member.full_name,
      studentId: member.student_id,
      className: member.class_name,
      color: FROG_COLORS[index % FROG_COLORS.length],

      skill: 0.985 + Math.random() * 0.03,
      phase: Math.random() * Math.PI * 2,
      frequency: 0.7 + Math.random() * 3.1,
      finishBias: Math.random() * 0.06 - 0.03,
      luck: 0.9 + Math.random() * 0.2,

      progress: 0,
      speed: initialSpeed,
      targetSpeed: initialSpeed,
      acceleration: 1.4 + Math.random() * 1.6,

      finished: false,
      rank: null,
      finishTime: null,

      finalBurst: false,
      burstPower: 0,
    };
  });
}

export default function FrogRace() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [raceDuration, setRaceDuration] = useState(10);
  const [status, setStatus] = useState<RaceStatus>("setup");
  const [countdown, setCountdown] = useState(3);
  const [racers, setRacers] = useState<Racer[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [winner, setWinner] = useState<Racer | null>(null);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const finishBurstTimerRef = useRef<number | null>(null);
  const raceStartRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef(0);
  const previousElapsedRef = useRef(0);
  const finalBurstOwnerRef = useRef<number | null>(null);
  const finishOrderRef = useRef<number[]>([]);
  const snapshotRef = useRef<Racer[]>([]);
  const elapsedRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  const filteredMembers = useMemo(() => {
    const key = search.trim().toLowerCase();
    if (!key) return members;
    return members.filter((member) =>
      `${member.full_name} ${member.student_id} ${member.class_name}`
        .toLowerCase()
        .includes(key)
    );
  }, [members, search]);

  const selectedMembers = useMemo(() => {
    const memberMap = new Map(members.map((member) => [member.id, member]));
    return selectedMemberIds
      .map((id) => memberMap.get(id))
      .filter((member): member is Member => Boolean(member));
  }, [members, selectedMemberIds]);

  const ranking = useMemo(() => {
    return [...racers].sort((a, b) => {
      if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return b.progress - a.progress;
    });
  }, [racers]);

  useEffect(() => {
    let cancelled = false;
    async function loadMembers() {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, student_id, class_name, avatar")
        .order("full_name");
      if (cancelled) return;
      setMembers(error || !data ? [] : (data as Member[]));
      setLoadingMembers(false);
    }
    void loadMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      setSelectedMemberIds(members.map((member) => member.id));
    }
  }, [members]);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      if (countdownRef.current !== null) {
        window.clearInterval(countdownRef.current);
      }
      if (finishBurstTimerRef.current !== null) {
        window.clearTimeout(finishBurstTimerRef.current);
      }
      void audioRef.current?.close();
    };
  }, []);

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  function getAudioContext() {
    if (typeof window === "undefined") return null;
    if (!audioRef.current) {
      const AudioContextClass =
        window.AudioContext ??
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;
      if (!AudioContextClass) return null;
      audioRef.current = new AudioContextClass();
    }
    return audioRef.current;
  }

  function tone(frequency: number, duration = 0.1, type: OscillatorType = "sine") {
    if (muted) return;
    const context = getAudioContext();
    if (!context) return;
    if (context.state === "suspended") void context.resume();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + duration);
  }

  function startSound() {
    tone(440, 0.08);
  }

  function goSound() {
    tone(880, 0.14, "square");
    window.setTimeout(() => tone(1100, 0.18, "square"), 90);
  }

  function winnerSound() {
    [660, 780, 920, 1100].forEach((frequency, index) => {
      window.setTimeout(() => tone(frequency, 0.15), index * 90);
    });
  }

  function toggleMember(id: number) {
    if (status === "countdown" || status === "racing") return;
    setSelectedMemberIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  function selectAll() {
    if (status === "countdown" || status === "racing") return;
    setSelectedMemberIds(members.map((member) => member.id));
  }

  function clearAll() {
    if (status === "countdown" || status === "racing") return;
    setSelectedMemberIds([]);
  }

  function shuffleSelected() {
    if (status === "countdown" || status === "racing") return;
    setSelectedMemberIds((current) => shuffle(current));
  }

  function buildRace(): Racer[] | null {
    if (selectedMembers.length < MIN_RACERS) return null;
    const next = createRacers(selectedMembers);
    snapshotRef.current = next;
    finishOrderRef.current = [];
    finalBurstOwnerRef.current = null;
    lastFrameRef.current = null;
    previousElapsedRef.current = 0;
    lastUiUpdateRef.current = 0;
    elapsedRef.current = 0;
    setRacers(next);
    setWinner(null);
    setElapsed(0);
    return next;
  }

  const drawScene = useCallback(
    (currentRacers: Racer[], currentElapsed: number) => {
      const canvas = canvasRef.current;
      const stage = stageRef.current;
      if (!canvas || !stage) return;

      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(rect.width, 320);
      const height = Math.max(rect.height, 300);

      const targetWidth = Math.round(width * dpr);
      const targetHeight = Math.round(height * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, "#dff7ff");
      bg.addColorStop(0.5, "#d9f7ef");
      bg.addColorStop(1, "#b9efca");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      drawWater(ctx, width, height, currentElapsed);
      drawHills(ctx, width, height);

      const startX = 62;
      const finishX = width - 62;
      drawStartMarker(ctx, startX, height);
      drawFinishLine(ctx, finishX, height);

      if (status === "racing") {
        const remaining = Math.max(0, raceDuration - currentElapsed / 1000);
        drawBadge(ctx, width - 82, 24, `${remaining.toFixed(1)}s`);
      }
      drawBadge(ctx, width - 79, 57, `🐸 ${currentRacers.length}`);

      const rows = Math.max(4, Math.min(8, Math.ceil(Math.sqrt(currentRacers.length))));
      const rowGap = Math.max(34, Math.min(49, (height - 62) / rows));

      for (let index = 0; index < currentRacers.length; index += 1) {
        const racer = currentRacers[index];
        const p = clamp(racer.progress);
        const x = startX + (finishX - startX) * p;
        const row = index % rows;
        const column = Math.floor(index / rows);
        const baseY = 52 + row * rowGap;
        const drift =
          Math.sin(currentElapsed / 480 + racer.phase) * 3.5 +
          Math.sin(currentElapsed / 830 + racer.phase * 1.6) * 2.5;
        const y = clamp(
          baseY + drift + (column % 2) * 2,
          31,
          height - 30
        );

        const hop =
          status === "racing"
            ? Math.max(0, Math.sin(currentElapsed / 72 + racer.phase)) * 4
            : 0;
        const isBurst = racer.finalBurst && status === "racing";

        drawFrog(ctx, racer, x, y, hop, isBurst);

        drawNameTag(ctx, racer.name, x, y - 25, racer.color, isBurst);
        if (racer.rank !== null) {
          drawRank(ctx, racer.rank, x + 17, y - 13);
        }
      }
    },
    [raceDuration, status]
  );

  useEffect(() => {
    drawScene(snapshotRef.current, elapsedRef.current);
    const resize = () => drawScene(snapshotRef.current, elapsedRef.current);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawScene]);

  const animateRace = useCallback(
    (now: number) => {
      if (raceStartRef.current === null) return;

      if (lastFrameRef.current === null) lastFrameRef.current = now;

      const rawDelta = Math.max(0, (now - lastFrameRef.current) / 1000);
      const delta = Math.min(rawDelta, 0.025);
      lastFrameRef.current = now;

      const elapsedMs = now - raceStartRef.current;
      const durationMs = raceDuration * 1000;
      const raceT = clamp(elapsedMs / durationMs);

      const current = snapshotRef.current;

      /*
       * Final burst: chỉ MỘT con được chọn.
       * Chọn ngẫu nhiên trong nhóm đang dẫn đầu,
       * nên avatar/thứ tự danh sách không quyết định winner.
       */
      if (
        raceT >= 0.80 &&
        finalBurstOwnerRef.current === null
      ) {
        const candidates = [...current]
          .filter((racer) => !racer.finished && racer.progress >= 0.68)
          .sort((a, b) => b.progress - a.progress)
          .slice(0, Math.min(8, current.length));

        if (candidates.length > 0) {
          const chosen =
            candidates[Math.floor(Math.random() * candidates.length)];
          finalBurstOwnerRef.current = chosen.id;
        }
      }

      const updated = current.map((racer) => {
        if (racer.finished) return racer;

        const isBurst = finalBurstOwnerRef.current === racer.id;
        const finalStrength = isBurst && raceT >= 0.80 ? 0.58 : 0;

        const noise = (Math.random() - 0.5) * 0.30;
        const wave = Math.sin(elapsedMs / (320 + racer.frequency * 95) + racer.phase) * 0.11;
        const waveFast = Math.sin(elapsedMs / 118 + racer.phase * 2.1) * 0.045;
        const hesitation = Math.random() < 0.026 ? -(0.08 + Math.random() * 0.12) : 0;
        const miniBurst = Math.random() > 0.972 ? 0.16 + Math.random() * 0.18 : 0;

        const nearEnd = clamp((racer.progress - 0.70) / 0.30);
        const comeback = nearEnd * Math.max(0, Math.sin(elapsedMs / 145 + racer.phase * 1.9)) * 0.11;

        const target =
          1 +
          noise +
          wave +
          waveFast +
          hesitation +
          miniBurst +
          comeback +
          finalStrength +
          racer.finishBias * 0.08;

        const clampedTarget = clamp(target, 0.58, 1.72);
        const speedDelta = racer.acceleration * delta;
        let speed = racer.speed;
        if (speed < clampedTarget) {
          speed = Math.min(clampedTarget, speed + speedDelta);
        } else {
          speed = Math.max(clampedTarget, speed - speedDelta);
        }

        const movement =
          (delta / Math.max(1, raceDuration)) * speed * (0.985 + racer.luck * 0.015);
        let progress = racer.progress + movement;

        /* Bảo đảm mỗi frame không thể teleport. */
        progress = Math.min(progress, racer.progress + delta / raceDuration * 1.78);

        let finished = false;
        let finishTime: number | null = null;

        if (progress >= 1) {
          const previousProgress = racer.progress;
          const travelled = progress - previousProgress;
          const fraction = travelled > 0 ? clamp((1 - previousProgress) / travelled) : 1;
          const crossingMs = Math.max(0, elapsedMs - (delta * 1000) + fraction * delta * 1000);
          progress = 1;
          finished = true;
          finishTime = crossingMs;
        }

        return {
          ...racer,
          progress,
          speed,
          targetSpeed: clampedTarget,
          finalBurst: isBurst,
          burstPower: isBurst ? Math.max(racer.burstPower, finalStrength) : racer.burstPower,
          finished,
          rank: null,
          finishTime,
        };
      });

      const justFinished = updated.filter(
        (racer) => racer.finished && !finishOrderRef.current.includes(racer.id)
      );

      justFinished.sort(
        (a, b) => (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity)
      );

      for (const racer of justFinished) {
        if (!finishOrderRef.current.includes(racer.id)) {
          finishOrderRef.current.push(racer.id);
        }
      }

      const rankMap = new Map<number, number>();
      finishOrderRef.current.forEach((id, index) => rankMap.set(id, index + 1));

      const ranked = updated.map((racer) => ({
        ...racer,
        rank: rankMap.get(racer.id) ?? null,
      }));

      snapshotRef.current = ranked;

      /* Canvas 60 FPS, React UI throttled. */
      drawScene(ranked, elapsedMs);

      if (elapsedMs - lastUiUpdateRef.current >= 80 || justFinished.length > 0) {
        lastUiUpdateRef.current = elapsedMs;
        setRacers(ranked);
        setElapsed(Math.min(elapsedMs, durationMs));
        elapsedRef.current = elapsedMs;
      }

      const allFinished = ranked.length > 0 && ranked.every((racer) => racer.finished);
      const graceDeadline = durationMs + 1800;

      if (allFinished || elapsedMs >= graceDeadline) {
        const final = [...ranked].sort((a, b) => {
          if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime;
          if (a.finishTime !== null) return -1;
          if (b.finishTime !== null) return 1;
          return b.progress - a.progress;
        });

        const completed = final.map((racer, index) => ({
          ...racer,
          progress: racer.finished ? 1 : Math.max(racer.progress, 0.985),
          finished: true,
          rank: index + 1,
          finishTime: racer.finishTime ?? elapsedMs + index * 28,
        }));

        snapshotRef.current = completed;
        setRacers(completed);
        setElapsed(Math.min(elapsedMs, graceDeadline));
        elapsedRef.current = elapsedMs;

        const champion = completed[0] ?? null;
        setWinner(champion);
        setStatus("finished");
        drawScene(completed, elapsedMs);
        winnerSound();
        stopAnimation();
        raceStartRef.current = null;
        return;
      }

      previousElapsedRef.current = elapsedMs;
      animationRef.current = requestAnimationFrame(animateRace);
    },
    [drawScene, raceDuration, stopAnimation]
  );

  function startRace() {
    if (status === "countdown" || status === "racing") return;
    if (selectedMembers.length < MIN_RACERS) {
      setPickerOpen(true);
      return;
    }

    stopAnimation();
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    const ready = buildRace();
    if (!ready) return;

    setStatus("countdown");
    setCountdown(3);
    startSound();
    let value = 3;

    countdownRef.current = window.setInterval(() => {
      value -= 1;
      if (value > 0) {
        setCountdown(value);
        startSound();
        return;
      }

      if (countdownRef.current !== null) {
        window.clearInterval(countdownRef.current);
        countdownRef.current = null;
      }

      setCountdown(0);
      setStatus("racing");
      goSound();

      window.setTimeout(() => {
        const start = performance.now();
        raceStartRef.current = start;
        lastFrameRef.current = start;
        lastUiUpdateRef.current = 0;
        previousElapsedRef.current = 0;
        elapsedRef.current = 0;
        finalBurstOwnerRef.current = null;
        finishOrderRef.current = [];
        animationRef.current = requestAnimationFrame(animateRace);
      }, 120);
    }, 850);
  }

  function resetRace() {
    stopAnimation();
    if (countdownRef.current !== null) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    raceStartRef.current = null;
    lastFrameRef.current = null;
    elapsedRef.current = 0;
    lastUiUpdateRef.current = 0;
    previousElapsedRef.current = 0;
    finalBurstOwnerRef.current = null;
    finishOrderRef.current = [];
    setStatus("setup");
    setCountdown(3);
    setElapsed(0);
    setWinner(null);

    const next = createRacers(selectedMembers);
    snapshotRef.current = next;
    setRacers(next);
    drawScene(next, 0);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        setFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setFullscreen(false);
      }
    } catch {
      // Optional browser feature.
    }
  }

  return (
    <main className="frog-race-page">
      <div className="frog-race-shell">
        <header className="frog-header">
          <div>
            <div className="frog-kicker">
              <Sparkles size={14} />
              D-K66 MINI GAME
            </div>
            <h1>
              Đua Ếch <span>🐸</span>
            </h1>
            <p>
              Cuộc đua realtime cho toàn bộ đoàn viên — mỗi lượt là một kết quả RNG mới.
            </p>
          </div>

          <div className="frog-header-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => setMuted((value) => !value)}
              title={muted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={toggleFullscreen}
              title="Toàn màn hình"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </header>

        <section className="control-bar">
          <div className="stat">
            <div className="stat-icon green"><Users size={18} /></div>
            <div><span>THAM GIA</span><strong>{selectedMembers.length}</strong></div>
          </div>
          <div className="stat">
            <div className="stat-icon purple"><Zap size={18} /></div>
            <div>
              <span>TRẠNG THÁI</span>
              <strong>
                {status === "setup" ? "Sẵn sàng" : status === "countdown" ? "Chuẩn bị" : status === "racing" ? "Đang đua" : "Hoàn thành"}
              </strong>
            </div>
          </div>
          <div className="stat">
            <div className="stat-icon blue">⏱</div>
            <div>
              <span>THỜI GIAN</span>
              <strong>{status === "setup" ? `${raceDuration}s` : `${(elapsed / 1000).toFixed(1)}s`}</strong>
            </div>
          </div>
          <div className="duration-control">
            <label>Thời lượng</label>
            <select
              value={raceDuration}
              disabled={status === "countdown" || status === "racing"}
              onChange={(event) => setRaceDuration(Number(event.target.value))}
            >
              <option value={5}>5 giây</option>
              <option value={8}>8 giây</option>
              <option value={10}>10 giây</option>
              <option value={15}>15 giây</option>
              <option value={20}>20 giây</option>
            </select>
          </div>
        </section>

        <section className="selection-card">
          <div className="selection-head">
            <div>
              <span>01 · NGƯỜI THAM GIA</span>
              <h2>Chọn đoàn viên đua</h2>
              <p>Chọn toàn bộ 44 đoàn viên hoặc tạo một nhóm riêng.</p>
            </div>
            <div className="selection-actions">
              <button type="button" onClick={() => setPickerOpen((value) => !value)}>
                <UserCheck size={16} />Chọn đoàn viên
              </button>
              <button type="button" onClick={selectAll}>
                <Users size={16} />Chọn tất cả
              </button>
              <button type="button" onClick={shuffleSelected}>
                <Dices size={16} />Xáo trộn
              </button>
            </div>
          </div>

          <div className="selected-summary">
            <div className="selected-count">
              <strong>{selectedMembers.length}</strong>
              <span>đoàn viên đã chọn</span>
            </div>
            <div className="selected-avatars">
              {selectedMembers.slice(0, 12).map((member, index) => (
                <div
                  key={member.id}
                  className="mini-avatar"
                  title={member.full_name}
                  style={{
                    background: FROG_COLORS[index % FROG_COLORS.length],
                    zIndex: 20 - index,
                  }}
                >
                  {member.avatar ? <img src={member.avatar} alt="" /> : member.full_name.charAt(0).toUpperCase()}
                </div>
              ))}
              {selectedMembers.length > 12 && <div className="more-avatar">+{selectedMembers.length - 12}</div>}
            </div>
            {selectedMembers.length > 0 && (
              <button type="button" className="clear-button" onClick={clearAll}>
                <X size={14} />Bỏ chọn tất cả
              </button>
            )}
          </div>

          {pickerOpen && (
            <div className="picker">
              <div className="picker-top">
                <div className="search-box">
                  <Search size={16} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, mã sinh viên hoặc lớp..." />
                </div>
                <button type="button" className="select-all-button" onClick={selectAll}>Chọn tất cả</button>
              </div>
              <div className="picker-meta">
                <span>{loadingMembers ? "Đang tải..." : `Đang hiển thị ${filteredMembers.length} đoàn viên`}</span>
                <strong>Đã chọn {selectedMembers.length}</strong>
              </div>
              <div className="member-grid">
                {filteredMembers.map((member) => {
                  const selected = selectedMemberIds.includes(member.id);
                  return (
                    <button
                      type="button"
                      key={member.id}
                      className={`member-option ${selected ? "selected" : ""}`}
                      onClick={() => toggleMember(member.id)}
                    >
                      <div className="member-option-avatar">
                        {member.avatar ? <img src={member.avatar} alt="" /> : member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="member-option-text">
                        <strong>{member.full_name}</strong>
                        <span>{member.student_id} · {member.class_name}</span>
                      </div>
                      <div className={`checkbox ${selected ? "checked" : ""}`}>{selected ? "✓" : ""}</div>
                    </button>
                  );
                })}
                {!loadingMembers && filteredMembers.length === 0 && <div className="empty-picker">Không tìm thấy đoàn viên.</div>}
              </div>
              <div className="picker-footer">
                <span>Đã chọn <strong>{selectedMembers.length}</strong> đoàn viên</span>
                <button type="button" onClick={() => setPickerOpen(false)}>Xong</button>
              </div>
            </div>
          )}
        </section>

        {status === "finished" && winner && (
          <section className="winner-card">
            <div className="winner-icon"><Trophy size={23} /></div>
            <div className="winner-frog">🐸</div>
            <div className="winner-content">
              <span>🏆 NHÀ VÔ ĐỊCH</span>
              <h2>{winner.name}</h2>
              <p>{winner.className} · {winner.studentId} · {formatTime(winner.finishTime)}</p>
            </div>
            <button type="button" onClick={startRace}><RotateCcw size={16} />Đua lại</button>
          </section>
        )}

        <section className="track-card" ref={stageRef}>
          <div className="track-head">
            <div><span>02 · RACE TRACK</span><h2>Sân đua D-K66</h2></div>
            <div className={`live-pill ${status === "racing" ? "live" : ""}`}><i />{status === "racing" ? "LIVE" : status === "finished" ? "FINISH" : "READY"}</div>
          </div>
          <div className="canvas-wrap">
            <canvas ref={canvasRef} className="race-canvas" />
            {status === "setup" && (
              <div className="track-placeholder">
                <div>🐸</div>
                <strong>Sẵn sàng cho cuộc đua?</strong>
                <span>{selectedMembers.length} đoàn viên đang chờ xuất phát.</span>
              </div>
            )}
            {status === "countdown" && (
              <div className="countdown-overlay">
                <div className="countdown-circle">
                  <span>CHUẨN BỊ</span>
                  <strong>{countdown}</strong>
                  <small>CÁC ẾCH SẮP XUẤT PHÁT!</small>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="main-action">
          <button
            type="button"
            className="start-button"
            disabled={status === "countdown" || status === "racing" || selectedMembers.length < MIN_RACERS}
            onClick={startRace}
          >
            <span className="start-button-icon"><Play size={20} fill="currentColor" /></span>
            {status === "setup" ? "BẮT ĐẦU ĐUA" : status === "countdown" ? "CHUẨN BỊ..." : status === "racing" ? "ĐANG ĐUA..." : "ĐUA LẠI"}
            <Zap size={17} />
          </button>
          <p>
            {selectedMembers.length < MIN_RACERS
              ? "Cần ít nhất 2 đoàn viên."
              : status === "racing"
                ? `Cuộc đua đang diễn ra · còn ${Math.max(0, raceDuration - elapsed / 1000).toFixed(1)} giây`
                : `${selectedMembers.length} người · ${raceDuration} giây · RNG mới mỗi lượt`}
          </p>
        </section>

        <section className="results-card">
          <div className="results-head">
            <div><span>03 · RESULTS</span><h2>Bảng xếp hạng</h2></div>
            <Medal size={22} />
          </div>
          <div className="results-list">
            {ranking.map((racer, index) => (
              <div key={racer.id} className={`result-row ${racer.rank === 1 ? "champion" : ""}`}>
                <div className="rank">
                  {racer.rank === 1 ? "🥇" : racer.rank === 2 ? "🥈" : racer.rank === 3 ? "🥉" : racer.rank ?? index + 1}
                </div>
                <div className="result-frog">🐸</div>
                <div className="result-info">
                  <strong>{racer.name}</strong>
                  <span>{racer.className} · {racer.finished ? `Hoàn thành · ${formatTime(racer.finishTime)}` : status === "racing" ? "Đang chạy..." : "Sẵn sàng"}</span>
                </div>
                <div className="result-progress">
                  <div><span style={{ width: `${Math.round(racer.progress * 100)}%`, background: racer.color }} /></div>
                  <strong>{Math.round(racer.progress * 100)}%</strong>
                </div>
              </div>
            ))}
            {ranking.length === 0 && <div className="results-empty">Chưa có cuộc đua.</div>}
          </div>
        </section>

        <footer className="frog-footer">
          <span>🐸 Đua Ếch D-K66</span>
          <span>{selectedMembers.length} người tham gia</span>
          <span>{fullscreen ? "FULLSCREEN" : "READY"}</span>
        </footer>
      </div>

      <style jsx>{`
        .frog-race-page{min-height:100%;padding:20px 14px 60px;background:radial-gradient(circle at 90% 0%,rgba(110,231,183,.18),transparent 28%),radial-gradient(circle at 5% 72%,rgba(125,211,252,.14),transparent 28%),linear-gradient(180deg,#f8fafc 0%,#f0fdf4 100%);color:#0f172a;}
        .frog-race-shell{width:100%;max-width:1240px;margin:0 auto;}
        .frog-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:16px;}
        .frog-kicker{display:inline-flex;align-items:center;gap:6px;color:#059669;font-size:10px;font-weight:900;letter-spacing:.14em;}
        .frog-header h1{margin:4px 0;font-size:clamp(34px,5vw,50px);line-height:1;letter-spacing:-.055em;font-weight:950;}
        .frog-header h1 span{margin-left:6px;}
        .frog-header p{margin:0;color:#64748b;font-size:12px;}
        .frog-header-actions{display:flex;gap:7px;}
        .icon-button{width:43px;height:43px;display:grid;place-items:center;border:1px solid #e2e8f0;border-radius:13px;color:#475569;background:rgba(255,255,255,.93);cursor:pointer;transition:.18s ease;}
        .icon-button:hover{color:#059669;border-color:#a7f3d0;transform:translateY(-1px);}
        .control-bar{display:flex;align-items:center;gap:16px;margin-bottom:15px;padding:11px 13px;border:1px solid #dbeafe;border-radius:18px;background:rgba(255,255,255,.92);box-shadow:0 10px 30px rgba(15,23,42,.05);backdrop-filter:blur(12px);}
        .stat{display:flex;align-items:center;gap:8px;min-width:118px;}
        .stat-icon{width:35px;height:35px;display:grid;place-items:center;border-radius:10px;}
        .stat-icon.green{color:#059669;background:#d1fae5}.stat-icon.purple{color:#7c3aed;background:#ede9fe}.stat-icon.blue{color:#0369a1;background:#e0f2fe}
        .stat span,.duration-control label{display:block;color:#94a3b8;font-size:8px;font-weight:900;letter-spacing:.1em;}
        .stat strong{display:block;margin-top:1px;color:#1e293b;font-size:12px;font-weight:950;}
        .duration-control{margin-left:auto;display:flex;align-items:center;gap:8px}.duration-control select{border:1px solid #e2e8f0;border-radius:10px;padding:7px 9px;outline:0;color:#475569;background:#fff;font-size:10px;font-weight:850;}
        .selection-card,.results-card,.track-card{margin-bottom:15px;border:1px solid #e2e8f0;border-radius:21px;background:rgba(255,255,255,.94);box-shadow:0 12px 35px rgba(15,23,42,.05);}
        .selection-card{padding:16px;}.selection-head,.track-head,.results-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
        .selection-head > div:first-child span,.track-head span,.results-head span{display:block;color:#94a3b8;font-size:8px;font-weight:900;letter-spacing:.13em;}
        .selection-head h2,.track-head h2,.results-head h2{margin:3px 0;font-size:18px;font-weight:950;letter-spacing:-.025em;}.selection-head p{margin:0;color:#94a3b8;font-size:9px;}
        .selection-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.selection-actions button,.select-all-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:34px;padding:7px 10px;border:1px solid #e2e8f0;border-radius:10px;color:#475569;background:#f8fafc;font-size:9px;font-weight:900;cursor:pointer;}
        .selection-actions button:nth-child(2),.select-all-button{color:#047857;border-color:#a7f3d0;background:#ecfdf5}.selection-actions button:nth-child(3){color:#4f46e5;border-color:#c7d2fe;background:#eef2ff}
        .selected-summary{display:flex;align-items:center;gap:12px;margin-top:12px;padding:8px 9px;border:1px dashed #dbeafe;border-radius:13px;background:#f8fafc;}.selected-count{min-width:120px}.selected-count strong{color:#059669;font-size:19px;font-weight:950}.selected-count span{margin-left:5px;color:#64748b;font-size:8px;}
        .selected-avatars{display:flex;align-items:center;flex:1;min-width:0}.mini-avatar,.more-avatar{position:relative;display:grid;place-items:center;width:28px;height:28px;margin-left:-6px;overflow:hidden;border:2px solid #fff;border-radius:50%;color:#fff;font-size:8px;font-weight:900}.mini-avatar:first-child{margin-left:0}.mini-avatar img{width:100%;height:100%;object-fit:cover}.more-avatar{color:#475569;background:#e2e8f0}.clear-button{display:inline-flex;align-items:center;gap:5px;border:0;color:#dc2626;background:transparent;font-size:8px;font-weight:850;cursor:pointer;}
        .picker{margin-top:10px;overflow:hidden;border:1px solid #e2e8f0;border-radius:15px;background:#fff}.picker-top{display:flex;gap:7px;padding:10px;border-bottom:1px solid #f1f5f9}.search-box{display:flex;align-items:center;gap:7px;flex:1;height:36px;padding:0 10px;border:1px solid #e2e8f0;border-radius:10px;color:#94a3b8}.search-box input{width:100%;border:0;outline:0;color:#334155;background:transparent;font-size:9px}.picker-meta{display:flex;justify-content:space-between;padding:8px 10px;color:#94a3b8;font-size:8px}.picker-meta strong{color:#059669}
        .member-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;max-height:310px;overflow:auto;padding:7px}.member-option{display:flex;align-items:center;gap:7px;min-width:0;padding:7px;border:1px solid transparent;border-radius:10px;background:#fff;text-align:left;cursor:pointer}.member-option:hover{border-color:#dbeafe;background:#f8fafc}.member-option.selected{border-color:#bbf7d0;background:#f0fdf4}.member-option-avatar{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;overflow:hidden;border-radius:10px;color:#047857;background:#d1fae5;font-size:11px;font-weight:950}.member-option-avatar img{width:100%;height:100%;object-fit:cover}.member-option-text{flex:1;min-width:0}.member-option-text strong,.member-option-text span{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.member-option-text strong{color:#334155;font-size:9px}.member-option-text span{margin-top:2px;color:#94a3b8;font-size:7px}.checkbox{display:grid;place-items:center;width:21px;height:21px;flex:0 0 21px;border:1px solid #cbd5e1;border-radius:6px;color:transparent;background:#fff;font-size:11px;font-weight:950}.checkbox.checked{border-color:#059669;color:#fff;background:#059669}.empty-picker{grid-column:1/-1;min-height:90px;display:grid;place-items:center;color:#94a3b8;font-size:9px}.picker-footer{display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:8px}.picker-footer strong{color:#059669}.picker-footer button{border:0;border-radius:9px;padding:7px 11px;color:#fff;background:#059669;font-size:8px;font-weight:900;cursor:pointer;}
        .winner-card{display:flex;align-items:center;gap:11px;margin-bottom:15px;padding:13px 15px;border:1px solid #fde68a;border-radius:18px;background:linear-gradient(135deg,#fffbeb,#fefce8)}.winner-icon{display:grid;place-items:center;width:42px;height:42px;flex:0 0 42px;border-radius:13px;color:#b45309;background:#fef3c7}.winner-frog{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:#fff;font-size:26px}.winner-content{flex:1;min-width:0}.winner-content span{color:#b45309;font-size:7px;font-weight:900;letter-spacing:.1em}.winner-content h2{margin:2px 0;color:#78350f;font-size:18px;font-weight:950}.winner-content p{margin:0;color:#92400e;font-size:8px}.winner-card>button{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:9px;padding:9px 11px;color:#fff;background:#b45309;font-size:9px;font-weight:900;cursor:pointer;}
        .track-card{overflow:hidden}.track-head,.results-head{padding:15px 17px;border-bottom:1px solid #eef2f7}.live-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid #e2e8f0;border-radius:999px;color:#94a3b8;font-size:7px;font-weight:900;letter-spacing:.1em}.live-pill i{width:6px;height:6px;border-radius:50%;background:#94a3b8}.live-pill.live{color:#dc2626;border-color:#fecaca;background:#fffafa}.live-pill.live i{background:#ef4444;box-shadow:0 0 0 4px rgba(239,68,68,.08);animation:pulse 1s infinite}@keyframes pulse{50%{transform:scale(.65);opacity:.45}}
        .canvas-wrap{position:relative;width:100%;height:300px;overflow:hidden;background:#c9f6eb}.race-canvas{display:block;width:100%;height:300px}.track-placeholder{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;pointer-events:none;text-align:center}.track-placeholder>div{margin-bottom:5px;font-size:52px}.track-placeholder strong{color:#334155;font-size:15px}.track-placeholder span{margin-top:4px;color:#94a3b8;font-size:9px}.countdown-overlay{position:absolute;inset:0;display:grid;place-items:center;background:rgba(15,23,42,.15);backdrop-filter:blur(3px);pointer-events:none}.countdown-circle{display:flex;flex-direction:column;align-items:center;justify-content:center;width:160px;height:160px;border:6px solid rgba(255,255,255,.85);border-radius:50%;color:#fff;background:radial-gradient(circle,#059669,#047857);box-shadow:0 25px 60px rgba(15,23,42,.24)}.countdown-circle span,.countdown-circle small{color:#d1fae5;font-size:8px;font-weight:900;letter-spacing:.12em}.countdown-circle strong{margin:1px 0;font-size:68px;line-height:1;font-weight:950}
        .main-action{display:flex;flex-direction:column;align-items:center;padding:17px 0 2px}.start-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-width:220px;border:0;border-radius:15px;padding:7px 11px 7px 7px;color:#fff;background:linear-gradient(135deg,#059669,#10b981,#0d9488);box-shadow:0 13px 27px rgba(5,150,105,.22);font-size:11px;font-weight:950;cursor:pointer}.start-button:disabled{opacity:.5;cursor:not-allowed}.start-button-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;color:#059669;background:#fff}.main-action p{margin:7px 0 0;color:#94a3b8;font-size:8px}
        .results-card{overflow:hidden}.results-head{display:flex;align-items:center}.results-head>svg{color:#f59e0b}.results-list{padding:7px 10px 10px}.result-row{display:flex;align-items:center;gap:8px;min-height:53px;padding:7px;border-radius:11px}.result-row:hover{background:#f8fafc}.result-row.champion{background:#fffbeb}.rank{width:26px;flex:0 0 26px;color:#94a3b8;font-size:11px;font-weight:950;text-align:center}.result-frog{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:#f0fdf4;font-size:19px}.result-info{width:175px;min-width:175px}.result-info strong,.result-info span{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.result-info strong{color:#334155;font-size:10px;font-weight:900}.result-info span{margin-top:2px;color:#94a3b8;font-size:7px}.result-progress{display:flex;align-items:center;gap:7px;flex:1}.result-progress>div{height:5px;flex:1;overflow:hidden;border-radius:999px;background:#f1f5f9}.result-progress>div span{display:block;height:100%;border-radius:999px}.result-progress>strong{width:29px;color:#64748b;font-size:7px;text-align:right}.results-empty{padding:25px;text-align:center;color:#94a3b8;font-size:9px}.frog-footer{display:flex;justify-content:space-between;gap:10px;margin-top:13px;padding:0 3px;color:#94a3b8;font-size:7px}
        @media(max-width:900px){.member-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.result-info{width:145px;min-width:145px}}
        @media(max-width:720px){.frog-header{align-items:flex-start}.control-bar{flex-wrap:wrap}.stat{min-width:100px}.duration-control{width:100%;margin-left:0;padding-top:7px;border-top:1px solid #f1f5f9}.selection-head{display:block}.selection-actions{margin-top:11px;justify-content:flex-start}.selection-actions button{flex:1}.selected-summary{flex-wrap:wrap}.selected-avatars{width:100%;order:3}.member-grid{grid-template-columns:1fr}.canvas-wrap{height:250px}.race-canvas{height:250px}.winner-card{flex-wrap:wrap}.winner-card>button{width:100%;justify-content:center}.result-info{width:110px;min-width:110px}}
        @media(max-width:520px){.frog-race-page{padding:13px 9px 50px}.frog-header{display:block}.frog-header-actions{margin-top:10px}.stat:nth-child(2),.stat:nth-child(3){display:none}.picker-top{flex-direction:column}.select-all-button{width:100%}.canvas-wrap{height:230px}.race-canvas{height:230px}.result-info{width:82px;min-width:82px}.frog-footer{display:block;line-height:1.8}.frog-footer span{display:block}}
      `}</style>
    </main>
  );
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
) {
  ctx.save();

  const flow = time / 900;

  /*
   * --------------------------------------------------
   * SÓNG CHÍNH
   * --------------------------------------------------
   */

  ctx.globalAlpha = 0.62;
  ctx.strokeStyle =
    "rgba(255,255,255,.88)";
  ctx.lineWidth = 1.9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (
    let row = 0;
    row < 12;
    row += 1
  ) {
    const baseY =
      15 +
      row *
        (height / 12);

    ctx.beginPath();

    for (
      let x = -35;
      x <= width + 35;
      x += 18
    ) {
      const wave =
        Math.sin(
          x / 42 -
            flow * 1.35 +
            row * 0.7
        ) *
        3.0;

      const secondary =
        Math.sin(
          x / 82 -
            flow * 0.65 +
            row * 1.3
        ) *
        1.4;

      const y =
        baseY +
        wave +
        secondary;

      if (x === -35) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  /*
   * --------------------------------------------------
   * GỢN NHỎ
   * --------------------------------------------------
   */

  ctx.globalAlpha = 0.38;
  ctx.strokeStyle =
    "rgba(255,255,255,.92)";
  ctx.lineWidth = 1.35;

  for (
    let row = 0;
    row < 10;
    row += 1
  ) {
    const baseY =
      28 +
      row *
        (height / 10);

    ctx.beginPath();

    for (
      let x = -45;
      x <= width + 45;
      x += 25
    ) {
      const y =
        baseY +
        Math.sin(
          x / 52 -
            flow * 2.1 +
            row * 2.2
        ) *
          1.8;

      if (x === -45) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  /*
   * --------------------------------------------------
   * HIGHLIGHT TRÔI TRÊN MẶT NƯỚC
   * --------------------------------------------------
   */

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle =
    "rgba(255,255,255,.98)";
  ctx.lineWidth = 2.4;

  const highlightOffset =
    (flow * 42) %
    90;

  for (
    let row = 0;
    row < 5;
    row += 1
  ) {
    const y =
      45 +
      row *
        (height / 6);

    for (
      let x =
        -90 +
        highlightOffset;
      x < width + 90;
      x += 115
    ) {
      ctx.beginPath();

      ctx.moveTo(
        x,
        y
      );

      ctx.lineTo(
        x + 30,
        y
      );

      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawFrog(
  ctx: CanvasRenderingContext2D,
  racer: Racer,
  x: number,
  y: number,
  hop: number,
  burst: boolean
) {
  ctx.save();

  const frogY = y - hop;

  /*
   * --------------------------------------------------
   * COLORS
   * --------------------------------------------------
   */

  const color =
    racer.color || "#16a34a";

  /*
   * --------------------------------------------------
   * SHADOW
   * --------------------------------------------------
   */

  ctx.fillStyle =
    "rgba(15,23,42,.22)";

  ctx.beginPath();

  ctx.ellipse(
    x,
    y + 17,
    burst ? 16 : 18,
    burst ? 4 : 5,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /*
   * --------------------------------------------------
   * BURST GLOW
   * --------------------------------------------------
   */

  if (burst) {
    const pulse =
      1 +
      Math.sin(
        performance.now() / 90 +
          racer.phase
      ) *
        0.08;

    const glow =
      ctx.createRadialGradient(
        x,
        frogY,
        3,
        x,
        frogY,
        34 * pulse
      );

    glow.addColorStop(
      0,
      `${color}55`
    );

    glow.addColorStop(
      0.5,
      `${color}22`
    );

    glow.addColorStop(
      1,
      "rgba(255,255,255,0)"
    );

    ctx.fillStyle = glow;

    ctx.beginPath();

    ctx.arc(
      x,
      frogY,
      34 * pulse,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  /*
   * --------------------------------------------------
   * FROG BODY
   * --------------------------------------------------
   */

  ctx.save();

  /*
   * Body gradient.
   *
   * Phần trên sáng hơn,
   * phần dưới đậm hơn.
   */

  const bodyGradient =
    ctx.createLinearGradient(
      x,
      frogY - 18,
      x,
      frogY + 18
    );

  bodyGradient.addColorStop(
    0,
    lightenColor(color, 24)
  );

  bodyGradient.addColorStop(
    0.45,
    color
  );

  bodyGradient.addColorStop(
    1,
    darkenColor(color, 22)
  );

  ctx.fillStyle =
    bodyGradient;

  ctx.strokeStyle =
    "rgba(15,23,42,.42)";

  ctx.lineWidth = 1.8;

  /*
   * Body
   */

  ctx.beginPath();

  ctx.ellipse(
    x,
    frogY + 4,
    17,
    14,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();
  ctx.stroke();

  /*
   * --------------------------------------------------
   * EYES
   * --------------------------------------------------
   */

  const eyeY =
    frogY - 10;

  /*
   * Left eye
   */

  ctx.fillStyle =
    bodyGradient;

  ctx.beginPath();

  ctx.arc(
    x - 9,
    eyeY,
    7,
    0,
    Math.PI * 2
  );

  ctx.fill();
  ctx.stroke();

  /*
   * Right eye
   */

  ctx.beginPath();

  ctx.arc(
    x + 9,
    eyeY,
    7,
    0,
    Math.PI * 2
  );

  ctx.fill();
  ctx.stroke();

  /*
   * Eye whites
   */

  ctx.fillStyle =
    "#ffffff";

  ctx.beginPath();

  ctx.arc(
    x - 9,
    eyeY - 1,
    4.2,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.beginPath();

  ctx.arc(
    x + 9,
    eyeY - 1,
    4.2,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /*
   * Pupils
   */

  ctx.fillStyle =
    "#0f172a";

  ctx.beginPath();

  ctx.arc(
    x - 8,
    eyeY - 1,
    2.2,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.beginPath();

  ctx.arc(
    x + 8,
    eyeY - 1,
    2.2,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /*
   * --------------------------------------------------
   * MOUTH
   * --------------------------------------------------
   */

  ctx.strokeStyle =
    "rgba(15,23,42,.55)";

  ctx.lineWidth = 1.5;

  ctx.beginPath();

  ctx.arc(
    x,
    frogY + 2,
    8,
    0.15,
    Math.PI - 0.15
  );

  ctx.stroke();

  /*
   * --------------------------------------------------
   * BELLY HIGHLIGHT
   * --------------------------------------------------
   */

  const belly =
    ctx.createRadialGradient(
      x - 5,
      frogY - 1,
      1,
      x,
      frogY + 5,
      14
    );

  belly.addColorStop(
    0,
    "rgba(255,255,255,.30)"
  );

  belly.addColorStop(
    1,
    "rgba(255,255,255,0)"
  );

  ctx.fillStyle = belly;

  ctx.beginPath();

  ctx.ellipse(
    x,
    frogY + 5,
    13,
    10,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  /*
   * --------------------------------------------------
   * FEET
   * --------------------------------------------------
   */

  ctx.fillStyle =
    darkenColor(color, 12);

  ctx.beginPath();

  ctx.ellipse(
    x - 14,
    frogY + 12,
    8,
    4,
    -0.25,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.beginPath();

  ctx.ellipse(
    x + 14,
    frogY + 12,
    8,
    4,
    0.25,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();

  /*
   * --------------------------------------------------
   * BURST SPARKLES
   * --------------------------------------------------
   */

  if (burst) {
    const t =
      performance.now() / 150 +
      racer.phase;

    ctx.fillStyle =
      "#ffffff";

    for (
      let i = 0;
      i < 4;
      i += 1
    ) {
      const angle =
        t +
        i *
          (Math.PI / 2);

      const distance =
        24 +
        Math.sin(
          t * 1.4 + i
        ) *
          4;

      const sx =
        x +
        Math.cos(angle) *
          distance;

      const sy =
        frogY +
        Math.sin(angle) *
          distance;

      ctx.beginPath();

      ctx.arc(
        sx,
        sy,
        1.6,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }
  }

  ctx.restore();
}


/*
 * --------------------------------------------------
 * COLOR HELPERS
 * --------------------------------------------------
 */

function lightenColor(
  hex: string,
  amount: number
) {
  const value =
    hex.replace("#", "");

  const r =
    parseInt(
      value.slice(0, 2),
      16
    );

  const g =
    parseInt(
      value.slice(2, 4),
      16
    );

  const b =
    parseInt(
      value.slice(4, 6),
      16
    );

  const factor =
    amount / 100;

  return `rgb(
    ${Math.min(255, Math.round(r + (255 - r) * factor))},
    ${Math.min(255, Math.round(g + (255 - g) * factor))},
    ${Math.min(255, Math.round(b + (255 - b) * factor))}
  )`;
}


function darkenColor(
  hex: string,
  amount: number
) {
  const value =
    hex.replace("#", "");

  const r =
    parseInt(
      value.slice(0, 2),
      16
    );

  const g =
    parseInt(
      value.slice(2, 4),
      16
    );

  const b =
    parseInt(
      value.slice(4, 6),
      16
    );

  const factor =
    1 - amount / 100;

  return `rgb(
    ${Math.round(r * factor)},
    ${Math.round(g * factor)},
    ${Math.round(b * factor)}
  )`;
}

function drawHills(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.fillStyle = "rgba(34,197,94,.08)";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.45);
  ctx.bezierCurveTo(width * 0.17, height * 0.33, width * 0.35, height * 0.54, width * 0.5, height * 0.42);
  ctx.bezierCurveTo(width * 0.66, height * 0.31, width * 0.84, height * 0.53, width, height * 0.39);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawStartMarker(ctx: CanvasRenderingContext2D, x: number, height: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(100,116,139,.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 14);
  ctx.lineTo(x, height - 13);
  ctx.stroke();
  ctx.fillStyle = "#64748b";
  ctx.font = "900 8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("START", x, height - 4);
  ctx.restore();
}

function drawFinishLine(ctx: CanvasRenderingContext2D, x: number, height: number) {
  const size = 8;
  for (let y = 0; y < height; y += size) {
    for (let col = 0; col < 2; col += 1) {
      ctx.fillStyle = (Math.floor(y / size) + col) % 2 === 0 ? "#0f172a" : "#ffffff";
      ctx.fillRect(x + col * size, y, size, size);
    }
  }
  ctx.save();
  ctx.font = "17px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji";
  ctx.textAlign = "center";
  ctx.fillText("🏁", x + 8, 16);
  ctx.restore();
}

function drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, text: string) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.88)";
  ctx.strokeStyle = "rgba(226,232,240,.9)";
  ctx.lineWidth = 1;
  const width = Math.max(54, text.length * 6.2 + 16);
  roundRect(ctx, x - width / 2, y - 12, width, 24, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#475569";
  ctx.font = "900 8px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawNameTag(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  borderColor: string,
  highlight = false
) {
  ctx.save();
  const text = name.length > 19 ? `${name.slice(0, 19)}…` : name;
  ctx.font = "800 7.5px sans-serif";
  const width = ctx.measureText(text).width + 11;

  if (highlight) {
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 8;
  }

  ctx.fillStyle = highlight ? "rgba(255,255,255,.98)" : "rgba(255,255,255,.94)";
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = highlight ? 1.7 : 1;
  roundRect(ctx, x - width / 2, y - 8, width, 16, 6);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#334155";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function drawRank(ctx: CanvasRenderingContext2D, rank: number, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = rank === 1 ? "#f59e0b" : "#64748b";
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "950 7px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(rank), x, y);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
