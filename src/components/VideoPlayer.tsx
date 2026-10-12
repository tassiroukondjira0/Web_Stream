"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, ShieldCheck, Lock } from "lucide-react";
import Link from "next/link";

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  title: string;
  isPremium?: boolean;
  hasAccess?: boolean; // false si l'utilisateur doit souscrire au pass Premium
}

export function VideoPlayer({
  src,
  poster,
  title,
  isPremium = false,
  hasAccess = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Verrouillage Freemium
  if (isPremium && !hasAccess) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-950 border border-amber-500/30 flex flex-col items-center justify-center p-6 text-center shadow-2xl">
        <div className="relative z-10 max-w-md flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
            <Lock className="h-7 w-7" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400 mb-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Contenu Réservé aux Membres Premium
          </span>
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Ce titre fait partie du catalogue exclusif haute définition. Abonnez-vous dès maintenant pour un accès illimité sans publicité.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/premium"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all hover:scale-105"
            >
              Débloquer avec le Pass Premium
            </Link>
            <Link
              href="/connexion"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {poster && (
          <img
            src={poster}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm pointer-events-none"
          />
        )}
      </div>
    );
  }

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    videoRef.current.muted = nextMute;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-white/10 shadow-2xl select-none"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="h-full w-full object-contain cursor-pointer"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration);
        }}
      />

      {/* Bouton lecture central au survol si en pause */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600/90 text-white shadow-xl shadow-red-600/40 backdrop-blur-sm transition-transform hover:scale-110"
          aria-label="Démarrer la vidéo"
        >
          <Play className="h-8 w-8 fill-white ml-1" />
        </button>
      )}

      {/* Barre de contrôles inférieure */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Curseur de progression */}
        <div className="relative mb-3 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2 transition-all"
            aria-label="Position de lecture"
          />
        </div>

        {/* Contrôles et boutons */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="hover:text-red-400 transition-colors"
              aria-label={isPlaying ? "Pause" : "Lecture"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 10);
              }}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Reculer de 10s"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} aria-label="Muet">
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5 text-red-400" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/30 rounded-lg accent-white"
                aria-label="Volume"
              />
            </div>

            {/* Durée */}
            <span className="font-mono text-zinc-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isPremium && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                <ShieldCheck className="h-3 w-3" />
                HD Premium
              </span>
            )}
            <button
              onClick={toggleFullscreen}
              className="hover:text-red-400 transition-colors"
              aria-label="Plein écran"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
