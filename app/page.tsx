"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  Keyboard, Trophy, Flame, Clock, Target, RotateCcw, Zap, Star,
  ChevronRight, BarChart3, Volume2, VolumeX, Settings, Crown, Timer,
  TrendingUp, Award, Hash, Type, Code, Quote, Gauge,
} from "lucide-react"

/* ============================== */
/*  WORD BANKS                    */
/* ============================== */
const WORD_BANKS = {
  common: ["the","be","to","of","and","a","in","that","have","it","for","not","on","with","he","as","you","do","at","this","but","his","by","from","they","we","her","she","or","an","will","my","one","all","would","there","their","what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just","him","know","take","people","into","year","your","good","some","could","them","see","other","than","then","now","look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well","way","even","new","want","because","any","these","give","day","most","us"],
  advanced: ["algorithm","paradigm","synchronize","implementation","architecture","infrastructure","optimization","configuration","authentication","authorization","middleware","asynchronous","polymorphism","abstraction","encapsulation","inheritance","recursion","iteration","concatenation","interpolation","serialization","deployment","repository","dependency","vulnerability","scalability","throughput","latency","bandwidth","encryption","decryption","certificate","compilation","interpreter","debugger","profiler","refactoring","microservice","containerize","orchestration"],
  code: ["function","const","return","import","export","default","async","await","class","extends","constructor","interface","type","string","number","boolean","undefined","null","promise","array","object","map","filter","reduce","forEach","useState","useEffect","useCallback","useRef","useMemo","component","render","props","state","dispatch","action","reducer","context","provider","middleware","router","handler","request","response","query","mutation","schema","model","controller","service"],
  quotes: [
    "The only way to do great work is to love what you do",
    "Innovation distinguishes between a leader and a follower",
    "Stay hungry stay foolish",
    "The future belongs to those who believe in the beauty of their dreams",
    "It does not matter how slowly you go as long as you do not stop",
    "Success is not final failure is not fatal it is the courage to continue that counts",
    "The best time to plant a tree was twenty years ago the second best time is now",
    "Your time is limited do not waste it living someone elses life",
    "The only impossible journey is the one you never begin",
    "What you get by achieving your goals is not as important as what you become",
    "Believe you can and you are halfway there",
    "Everything you have ever wanted is on the other side of fear",
    "It is during our darkest moments that we must focus to see the light",
    "Do what you can with what you have where you are",
    "The mind is everything what you think you become",
  ],
}

type GameMode = "words" | "advanced" | "code" | "quotes"
type GameDuration = 15 | 30 | 60 | 120

const MODE_CONFIG: Record<GameMode, { label: string; icon: typeof Type; color: string; desc: string }> = {
  words: { label: "Common Words", icon: Type, color: "blue", desc: "Everyday English words" },
  advanced: { label: "Advanced", icon: Hash, color: "violet", desc: "Technical vocabulary" },
  code: { label: "Code", icon: Code, color: "emerald", desc: "Programming keywords" },
  quotes: { label: "Quotes", icon: Quote, color: "amber", desc: "Famous quotes" },
}

const KEYBOARD_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m"],
]

/* ============================== */
/*  SOUND ENGINE (Web Audio API)  */
/* ============================== */
class SoundEngine {
  private ctx: AudioContext | null = null

  private getCtx() {
    if (!this.ctx) this.ctx = new AudioContext()
    return this.ctx
  }

  private play(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.08) {
    try {
      const ctx = this.getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(vol, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + dur)
    } catch {}
  }

  keyPress() { this.play(800, 0.05, "square", 0.03) }
  correct() { this.play(880, 0.08, "sine", 0.06) }
  error() { this.play(200, 0.15, "sawtooth", 0.05) }
  combo(level: number) { this.play(440 + level * 110, 0.12, "sine", 0.07) }
  wordComplete() { this.play(1200, 0.06, "sine", 0.05); setTimeout(() => this.play(1600, 0.06, "sine", 0.04), 60) }
  finish() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.play(f, 0.3, "sine", 0.06), i * 100))
  }
  countdown() { this.play(600, 0.1, "square", 0.04) }
  countdownGo() { this.play(1200, 0.2, "sine", 0.08) }
}

/* ============================== */
/*  MAIN GAME                     */
/* ============================== */
export default function SpeedTyper() {
  const [mode, setMode] = useState<GameMode>("words")
  const [duration, setDuration] = useState<GameDuration>(30)
  const [gameState, setGameState] = useState<"idle" | "countdown" | "playing" | "finished">("idle")
  const [words, setWords] = useState<string[]>([])
  const [currentWordIdx, setCurrentWordIdx] = useState(0)
  const [typedChars, setTypedChars] = useState("")
  const [correctChars, setCorrectChars] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const [errors, setErrors] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [wordsCompleted, setWordsCompleted] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const [activeKey, setActiveKey] = useState("")
  const [errorFlash, setErrorFlash] = useState(false)
  const [comboFlash, setComboFlash] = useState(0)
  const [countdownNum, setCountdownNum] = useState(3)
  const [history, setHistory] = useState<{ wpm: number; accuracy: number; mode: string; duration: number; date: string }[]>([])
  const [showStats, setShowStats] = useState(false)
  const [wpmHistory, setWpmHistory] = useState<number[]>([])

  const soundRef = useRef<SoundEngine | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const wpmIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    soundRef.current = new SoundEngine()
    const saved = localStorage.getItem("speedtyper-history")
    if (saved) try { setHistory(JSON.parse(saved)) } catch {}
  }, [])

  const generateWords = useCallback((m: GameMode): string[] => {
    if (m === "quotes") {
      const shuffled = [...WORD_BANKS.quotes].sort(() => Math.random() - 0.5)
      return shuffled.slice(0, 5).join(" . ").split(" ")
    }
    const bank = WORD_BANKS[m]
    const result: string[] = []
    for (let i = 0; i < 200; i++) result.push(bank[Math.floor(Math.random() * bank.length)])
    return result
  }, [])

  const startGame = useCallback(() => {
    setGameState("countdown")
    setCountdownNum(3)
    setWords(generateWords(mode))
    setCurrentWordIdx(0)
    setTypedChars("")
    setCorrectChars(0)
    setTotalChars(0)
    setErrors(0)
    setCombo(0)
    setMaxCombo(0)
    setWordsCompleted(0)
    setWpm(0)
    setAccuracy(100)
    setWpmHistory([])

    let count = 3
    const countInterval = setInterval(() => {
      count--
      if (soundOn) soundRef.current?.countdown()
      setCountdownNum(count)
      if (count === 0) {
        clearInterval(countInterval)
        if (soundOn) soundRef.current?.countdownGo()
        setGameState("playing")
        setTimeLeft(duration)
        startTimeRef.current = Date.now()
        inputRef.current?.focus()

        wpmIntervalRef.current = setInterval(() => {
          const elapsed = (Date.now() - startTimeRef.current) / 60000
          if (elapsed > 0) {
            setCorrectChars((cc) => {
              const currentWpm = Math.round((cc / 5) / elapsed)
              setWpmHistory((prev) => [...prev, currentWpm])
              setWpm(currentWpm)
              return cc
            })
          }
        }, 1000)

        timerRef.current = setInterval(() => {
          setTimeLeft((t) => {
            if (t <= 1) {
              clearInterval(timerRef.current!)
              clearInterval(wpmIntervalRef.current!)
              setGameState("finished")
              if (soundOn) soundRef.current?.finish()
              return 0
            }
            return t - 1
          })
        }, 1000)
      }
    }, 800)
  }, [mode, duration, generateWords, soundOn])

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (wpmIntervalRef.current) clearInterval(wpmIntervalRef.current)
    setGameState("finished")
    if (soundOn) soundRef.current?.finish()
  }, [soundOn])

  useEffect(() => {
    if (gameState === "finished" && wpm > 0) {
      const entry = { wpm, accuracy, mode, duration, date: new Date().toISOString() }
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 50)
        localStorage.setItem("speedtyper-history", JSON.stringify(next))
        return next
      })
    }
  }, [gameState])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (gameState !== "playing") return
    const val = e.target.value
    const currentWord = words[currentWordIdx]

    if (val.endsWith(" ")) {
      const typed = val.trim()
      setTotalChars((t) => t + typed.length)
      if (typed === currentWord) {
        setCorrectChars((c) => c + typed.length)
        setCombo((c) => {
          const next = c + 1
          if (next > maxCombo) setMaxCombo(next)
          if (next % 5 === 0 && soundOn) soundRef.current?.combo(next / 5)
          if (next % 5 === 0) setComboFlash(next)
          return next
        })
        setWordsCompleted((w) => w + 1)
        if (soundOn) soundRef.current?.wordComplete()
      } else {
        setErrors((er) => er + 1)
        setCombo(0)
        if (soundOn) soundRef.current?.error()
        setErrorFlash(true)
        setTimeout(() => setErrorFlash(false), 300)
      }
      setCurrentWordIdx((i) => i + 1)
      setTypedChars("")
      e.target.value = ""
    } else {
      setTypedChars(val)
      if (val.length > 0) {
        const lastChar = val[val.length - 1]
        setActiveKey(lastChar.toLowerCase())
        setTimeout(() => setActiveKey(""), 100)
        if (soundOn) soundRef.current?.keyPress()
        if (val.length <= currentWord.length && val[val.length - 1] !== currentWord[val.length - 1]) {
          if (soundOn) soundRef.current?.error()
        }
      }
    }
    const elapsed = (Date.now() - startTimeRef.current) / 60000
    if (elapsed > 0) {
      setCorrectChars((cc) => {
        setWpm(Math.round((cc / 5) / elapsed))
        setAccuracy(Math.round((cc / Math.max(1, cc + errors)) * 100))
        return cc
      })
    }
  }, [gameState, words, currentWordIdx, maxCombo, errors, soundOn])

  const bestWpm = useMemo(() => Math.max(0, ...history.map((h) => h.wpm)), [history])
  const avgWpm = useMemo(() => history.length ? Math.round(history.reduce((a, h) => a + h.wpm, 0) / history.length) : 0, [history])

  const currentWord = words[currentWordIdx] || ""

  return (
    <div className="min-h-screen bg-[#050507] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[120px]" style={{ background: "radial-gradient(circle, #3B82F6, transparent)" }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[100px]" style={{ background: "radial-gradient(circle, #8B5CF6, transparent)" }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Speed Typer</h1>
              <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">Test your speed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowStats(!showStats)} className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all min-h-[44px] min-w-[44px]">
              <BarChart3 className="w-4 h-4" />
            </button>
            <button onClick={() => setSoundOn(!soundOn)} className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all min-h-[44px] min-w-[44px]">
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Stats History Panel */}
        {showStats && (
          <div className="mb-6 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5" style={{ animation: "slide-in 0.3s ease-out" }}>
            <h3 className="text-sm font-bold text-white/60 mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-400" />Your Stats</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-blue-400" style={{ fontFamily: "var(--font-display)" }}>{bestWpm}</p>
                <p className="text-[10px] text-white/30 font-semibold uppercase">Best WPM</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-violet-400" style={{ fontFamily: "var(--font-display)" }}>{avgWpm}</p>
                <p className="text-[10px] text-white/30 font-semibold uppercase">Average WPM</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-emerald-400" style={{ fontFamily: "var(--font-display)" }}>{history.length}</p>
                <p className="text-[10px] text-white/30 font-semibold uppercase">Games Played</p>
              </div>
            </div>
            {history.length > 0 && (
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                {history.slice(0, 10).map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] text-xs">
                    {i === 0 && <Crown className="w-3 h-3 text-amber-400" />}
                    {i > 0 && <span className="w-3 text-white/20 text-center">{i + 1}</span>}
                    <span className="font-bold text-white/70 w-16">{h.wpm} WPM</span>
                    <span className="text-white/30">{h.accuracy}%</span>
                    <span className="text-white/20">{h.mode}</span>
                    <span className="text-white/15 ml-auto">{h.duration}s</span>
                  </div>
                ))}
              </div>
            )}
            {history.length === 0 && <p className="text-xs text-white/20 text-center py-4">No games played yet. Start typing to build your stats.</p>}
          </div>
        )}

        {/* Game Mode & Duration Selection */}
        {gameState === "idle" && (
          <div style={{ animation: "fadeUp 0.5s ease-out" }}>
            {/* Mode Select */}
            <div className="mb-4">
              <p className="text-xs font-bold text-white/25 uppercase tracking-widest mb-2">Game Mode</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(MODE_CONFIG) as GameMode[]).map((m) => {
                  const cfg = MODE_CONFIG[m]
                  return (
                    <button key={m} onClick={() => setMode(m)} className={`p-3 rounded-xl border text-left transition-all duration-200 min-h-[44px] ${mode === m ? `bg-${cfg.color}-500/10 border-${cfg.color}-500/30` : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"}`}>
                      <cfg.icon className={`w-4 h-4 mb-1 ${mode === m ? `text-${cfg.color}-400` : "text-white/30"}`} />
                      <p className={`text-xs font-bold ${mode === m ? "text-white/80" : "text-white/50"}`}>{cfg.label}</p>
                      <p className="text-[9px] text-white/20">{cfg.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Duration Select */}
            <div className="mb-6">
              <p className="text-xs font-bold text-white/25 uppercase tracking-widest mb-2">Duration</p>
              <div className="flex gap-2">
                {([15, 30, 60, 120] as GameDuration[]).map((d) => (
                  <button key={d} onClick={() => setDuration(d)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] ${duration === d ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06]"}`}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button onClick={startGame} className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-lg shadow-xl shadow-blue-500/20 hover:shadow-[0_0_50px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 transition-all duration-300 min-h-[56px] flex items-center justify-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
              <Zap className="w-5 h-5" /> Start Typing
            </button>
          </div>
        )}

        {/* Countdown */}
        {gameState === "countdown" && (
          <div className="flex items-center justify-center py-20">
            <div className="text-8xl font-extrabold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent" style={{ fontFamily: "var(--font-display)", animation: "pop 0.8s ease-out" }} key={countdownNum}>
              {countdownNum || "GO"}
            </div>
          </div>
        )}

        {/* Playing State */}
        {gameState === "playing" && (
          <div>
            {/* Live Stats Bar */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: "WPM", value: wpm, icon: Gauge, color: "blue" },
                { label: "Accuracy", value: `${accuracy}%`, icon: Target, color: "emerald" },
                { label: "Combo", value: combo, icon: Flame, color: combo >= 10 ? "amber" : combo >= 5 ? "violet" : "gray" },
                { label: "Time", value: `${timeLeft}s`, icon: Timer, color: timeLeft <= 5 ? "red" : "white" },
              ].map((s) => (
                <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                  <s.icon className={`w-4 h-4 mx-auto mb-1 text-${s.color}-400 opacity-60`} />
                  <p className={`text-xl font-extrabold text-${s.color}-400 tabular-nums`} style={{ fontFamily: "var(--font-mono)" }}>{s.value}</p>
                  <p className="text-[9px] text-white/20 font-semibold uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Timer Progress */}
            <div className="w-full h-1 bg-white/[0.04] rounded-full mb-5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? "bg-red-500" : "bg-gradient-to-r from-blue-500 to-violet-500"}`} style={{ width: `${(timeLeft / duration) * 100}%` }} />
            </div>

            {/* Combo Flash */}
            {comboFlash > 0 && (
              <div className="text-center mb-2" key={comboFlash}>
                <span className="text-amber-400 font-extrabold text-lg" style={{ animation: "combo-flash 0.8s ease-out forwards", fontFamily: "var(--font-display)" }}>
                  {comboFlash}x COMBO
                </span>
              </div>
            )}

            {/* Word Display */}
            <div className={`bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 sm:p-6 mb-4 transition-all ${errorFlash ? "border-red-500/50 bg-red-500/[0.03]" : ""}`} style={errorFlash ? { animation: "shake 0.3s ease-out" } : {}}>
              <div className="flex flex-wrap gap-x-3 gap-y-2 text-lg sm:text-xl font-mono leading-relaxed" style={{ fontFamily: "var(--font-mono)" }}>
                {words.slice(Math.max(0, currentWordIdx - 2), currentWordIdx + 15).map((word, rawIdx) => {
                  const idx = rawIdx + Math.max(0, currentWordIdx - 2)
                  const isCurrent = idx === currentWordIdx
                  const isPast = idx < currentWordIdx
                  return (
                    <span key={idx} className={`transition-colors duration-150 ${isPast ? "text-white/15" : isCurrent ? "" : "text-white/25"}`}>
                      {isCurrent ? (
                        word.split("").map((char, ci) => {
                          const typed = typedChars[ci]
                          let color = "text-white/40"
                          if (typed !== undefined) {
                            color = typed === char ? "text-emerald-400" : "text-red-400 underline"
                          }
                          return (
                            <span key={ci} className={`${color} ${ci === typedChars.length ? "border-l-2 border-blue-400 ml-[-1px] pl-[1px]" : ""}`}>
                              {char}
                            </span>
                          )
                        })
                      ) : (
                        word
                      )}
                      {isCurrent && typedChars.length === 0 && <span className="border-l-2 border-blue-400 animate-pulse" />}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Hidden Input */}
            <input
              ref={inputRef}
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-5 py-4 text-lg font-mono text-white/80 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] transition-all duration-200 placeholder:text-white/15"
              style={{ fontFamily: "var(--font-mono)" }}
              placeholder="Start typing here..."
              onChange={handleInput}
              onPaste={(e) => e.preventDefault()}
            />

            {/* Visual Keyboard */}
            <div className="mt-5 hidden sm:block">
              <div className="space-y-1.5">
                {KEYBOARD_ROWS.map((row, ri) => (
                  <div key={ri} className="flex justify-center gap-1.5" style={{ paddingLeft: ri === 1 ? "20px" : ri === 2 ? "40px" : "0" }}>
                    {row.map((key) => {
                      const isActive = activeKey === key
                      const isNext = currentWord[typedChars.length]?.toLowerCase() === key
                      return (
                        <div key={key} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold uppercase transition-all duration-100 ${
                          isActive ? "bg-blue-500 text-white scale-110 shadow-lg shadow-blue-500/30" :
                          isNext ? "bg-white/[0.08] text-blue-400 border border-blue-500/30" :
                          "bg-white/[0.03] text-white/25 border border-white/[0.06]"
                        }`} style={isActive ? { animation: "pop 0.15s ease-out" } : {}}>
                          {key}
                        </div>
                      )
                    })}
                  </div>
                ))}
                {/* Spacebar */}
                <div className="flex justify-center">
                  <div className={`w-64 h-8 rounded-lg flex items-center justify-center text-[10px] font-semibold uppercase tracking-widest transition-all duration-100 ${
                    activeKey === " " ? "bg-blue-500/20 text-blue-400" : "bg-white/[0.03] text-white/15 border border-white/[0.06]"
                  }`}>
                    space
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {gameState === "finished" && (
          <div style={{ animation: "fadeUp 0.5s ease-out" }}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-emerald-400">Game Complete</span>
              </div>
              <h2 className="text-4xl sm:text-6xl font-extrabold bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent" style={{ fontFamily: "var(--font-display)" }}>
                {wpm} WPM
              </h2>
              <p className="text-white/30 text-sm mt-1">{MODE_CONFIG[mode].label} / {duration}s</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Accuracy", value: `${accuracy}%`, icon: Target, color: "emerald" },
                { label: "Words", value: wordsCompleted, icon: Type, color: "blue" },
                { label: "Best Combo", value: `${maxCombo}x`, icon: Flame, color: "amber" },
                { label: "Errors", value: errors, icon: Zap, color: "red" },
              ].map((s) => (
                <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center">
                  <s.icon className={`w-5 h-5 mx-auto mb-2 text-${s.color}-400 opacity-60`} />
                  <p className={`text-2xl font-extrabold text-${s.color}-400`} style={{ fontFamily: "var(--font-mono)" }}>{s.value}</p>
                  <p className="text-[10px] text-white/20 font-semibold uppercase mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* WPM Over Time Chart */}
            {wpmHistory.length > 2 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
                <p className="text-xs font-bold text-white/25 uppercase tracking-widest mb-3 flex items-center gap-1.5"><TrendingUp className="w-3 h-3" />WPM Over Time</p>
                <div className="h-20 flex items-end gap-[2px]">
                  {wpmHistory.map((w, i) => {
                    const max = Math.max(...wpmHistory, 1)
                    const h = Math.max(4, (w / max) * 100)
                    return (
                      <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-violet-500 rounded-t-sm opacity-70 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }} title={`${w} WPM`} />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={startGame} className="flex-1 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 transition-all duration-300 min-h-[52px] flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
              <button onClick={() => setGameState("idle")} className="py-4 px-6 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/60 font-semibold hover:bg-white/[0.08] transition-all min-h-[52px]">
                Change Mode
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-10 text-[10px] text-white/10 font-mono">
          SPEED TYPER / BUILT BY SHIPBOT
        </div>
      </div>
    </div>
  )
}
