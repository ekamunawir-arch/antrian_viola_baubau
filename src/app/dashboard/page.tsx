"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getQueueData, refreshQueueData, getSettings } from '@/lib/queue-store';
import { Participant, SystemSettings } from '@/lib/queue-types';
import { Clock, Users, ArrowRightCircle, ListChecks, PlayCircle, MonitorPlay, User, AlertCircle, FileVideo, Volume2, VolumeX, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminQueueCallAnnouncement } from '@/ai/flows/admin-queue-call-announcement';
import { toast } from '@/hooks/use-toast';

export default function PublicDashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  // State untuk Kontrol Audio & Monitoring
  const [isStarted, setIsStarted] = useState(false);
  const [announcedIds, setAnnouncedIds] = useState<Set<string>>(new Set());
  const [isCalling, setIsCalling] = useState(false);

  const fetchData = () => {
    try {
      const data = getQueueData();
      const currentSettings = getSettings();
      setParticipants(data.participants || []);
      setSettings(currentSettings);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    fetchData();
    
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const syncInterval = setInterval(() => {
      refreshQueueData();
    }, 15000);

    window.addEventListener('viola_storage_update', fetchData);
    
    return () => {
      clearInterval(clockInterval);
      clearInterval(syncInterval);
      window.removeEventListener('viola_storage_update', fetchData);
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
      }
    };
  }, [localVideoUrl]);

  // Efek Listener untuk Panggilan Suara Otomatis
  useEffect(() => {
    if (!isStarted || isCalling) return;

    // Cari peserta yang statusnya 'Called' atau 'called' dan belum diumumkan
    const toAnnounce = participants.find(p => 
      (p.status === 'Called' || p.status === 'called') && !announcedIds.has(p.id)
    );

    if (toAnnounce) {
      handleAutoAnnouncement(toAnnounce);
    }
  }, [participants, isStarted, announcedIds, isCalling]);

  const handleAutoAnnouncement = async (participant: Participant) => {
    setIsCalling(true);
    try {
      console.log(`[AUDIO] Memulai panggilan untuk: ${participant.queueNumber} - ${participant.fullName}`);
      
      const result = await adminQueueCallAnnouncement({
        queueNumber: participant.queueNumber,
        participantName: participant.fullName
      });

      if (result.audioDataUri) {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.src = result.audioDataUri;
        
        // Tambahkan ID ke set agar tidak dipanggil ulang
        setAnnouncedIds(prev => new Set(prev).add(participant.id));
        
        await audioRef.current.play();
        
        audioRef.current.onended = () => {
          setIsCalling(false);
        };
      } else {
        console.error("[AUDIO] Gagal mendapatkan data audio:", result.error);
        setIsCalling(false);
      }
    } catch (error) {
      console.error("[AUDIO] Error saat memanggil antrian:", error);
      setIsCalling(false);
    }
  };

  const handleLocalVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
      }
      const url = URL.createObjectURL(file);
      setLocalVideoUrl(url);
      setVideoError(false);
    }
  };

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'object') {
      if (val.seconds !== undefined) return new Date(val.seconds * 1000);
      if (val._seconds !== undefined) return new Date(val._seconds * 1000);
    }
    if (typeof val === 'string' && val.trim() !== '') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const calculateDuration = (startTime: any, endTime: any) => {
    const start = parseDate(startTime);
    const end = (endTime === null || endTime === undefined) ? currentTime : parseDate(endTime);
    if (!start || !end) return '00:00:00';
    const diffInSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;
    return [hours, minutes, seconds].map(v => v.toString().padStart(2, '0')).join(':');
  };

  const startMonitoring = () => {
    setIsStarted(true);
    // Dummy audio play to unlock audio context on some browsers
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    audioRef.current.play().catch(() => {
      // Ignore initial play error, context is now authorized
    });
    toast({
      title: "Monitoring Aktif",
      description: "Suara panggilan antrian otomatis telah diaktifkan.",
    });
  };

  const beingServedList = participants.filter(p => 
    p.status === 'Being Served' || p.status === 'Called' || p.status === 'called'
  ).slice(0, 3);
  
  const finishedParticipants = participants.filter(p => p.status === 'Finished').slice(-4).reverse();
  const nextInQueue = participants.find(p => p.status === 'Waiting');
  const totalToday = participants.length;

  const currentVideoSource = localVideoUrl || (settings?.videoUrl ? String(settings.videoUrl).trim() : null);

  if (!mounted) return <div className="min-h-screen bg-background" />;

  // Layar Start Overlay jika belum diklik
  if (!isStarted) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="space-y-4">
            <div className="bg-primary/20 p-8 rounded-[3rem] w-fit mx-auto mb-6">
              <MonitorPlay className="w-24 h-24 text-primary animate-pulse" />
            </div>
            <h1 className="text-4xl font-black text-white font-headline tracking-tighter">DASHBOARD VIOLA</h1>
            <p className="text-slate-400 font-medium">Klik tombol di bawah untuk mengaktifkan monitor dan suara panggilan otomatis.</p>
          </div>
          <Button 
            onClick={startMonitoring}
            className="w-full h-20 text-2xl font-black bg-primary hover:bg-primary/90 rounded-[2rem] shadow-[0_0_50px_rgba(18,169,194,0.3)] transition-all hover:scale-105 active:scale-95 flex gap-4"
          >
            <Play className="fill-current w-8 h-8" />
            MULAI MONITORING
          </Button>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">Virtual Office Layanan Peserta</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background p-6 md:p-10 flex flex-col gap-6 overflow-hidden animate-in fade-in duration-700">
      {/* Header Dashboard */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-xl border-b-8 border-b-primary shrink-0">
        <div className="flex items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-5xl font-black text-primary font-headline tracking-tighter leading-none">VIOLA</h1>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.5em]">Virtual Office Layanan Peserta</p>
          </div>
          
          {/* Status Indikator Suara */}
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100">
            <Volume2 className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">Audio Aktif</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl font-black tabular-nums leading-none">
            {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
          </div>
          <div className="text-sm font-bold text-muted-foreground uppercase mt-2 tracking-widest">
            {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : '...'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Konten Kiri: Video & Informasi Berikutnya */}
        <div className="lg:col-span-8 flex flex-col gap-6 min-h-0">
          <Card className="flex-1 bg-black shadow-2xl border-none overflow-hidden relative group">
            <CardContent className="h-full p-0 flex items-center justify-center bg-slate-900 overflow-hidden relative">
              {currentVideoSource && !videoError ? (
                <video 
                  key={currentVideoSource}
                  className="w-full h-full object-cover" 
                  src={currentVideoSource} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  preload="auto"
                  onError={() => setVideoError(true)}
                  onLoadedData={() => setVideoError(false)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/10 p-10 text-center">
                  {videoError ? (
                    <>
                      <AlertCircle className="w-24 h-24 mb-4 text-rose-500/50" />
                      <p className="text-lg font-black uppercase text-rose-500/50">Video Tidak Dapat Diputar</p>
                      <p className="text-xs mt-2 text-white/40">Silakan pilih file video lokal menggunakan tombol di bawah.</p>
                    </>
                  ) : (
                    <>
                      <MonitorPlay className="w-32 h-32 mb-6" />
                      <p className="text-xl font-black uppercase tracking-[0.5em]">Saluran Multimedia VIOLA</p>
                    </>
                  )}
                </div>
              )}

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <input 
                  type="file" 
                  accept="video/*" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleLocalVideoSelect}
                />
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="rounded-full bg-black/50 hover:bg-black/80 text-white border-none backdrop-blur-md"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileVideo className="w-4 h-4 mr-2" />
                  Pilih Video Lokal
                </Button>
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-10 pointer-events-none">
                <div className="flex items-center gap-4 text-white">
                  <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-sm font-black uppercase tracking-widest">Siaran Informasi & Edukasi</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-dashed border-primary/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-6">
              <div className="bg-primary/10 p-4 rounded-2xl">
                <ArrowRightCircle className="w-10 h-10 text-primary" />
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Berikutnya</p>
                {nextInQueue ? (
                  <div className="flex items-baseline gap-4">
                    <span className="text-5xl font-black text-primary leading-none">{nextInQueue.queueNumber}</span>
                    <span className="text-2xl font-bold text-slate-700 truncate max-w-[250px] leading-none">{nextInQueue.fullName}</span>
                  </div>
                ) : (
                  <span className="text-xl font-bold text-muted-foreground italic">Belum Ada Antrian</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Total Antrian Hari Ini</p>
              <p className="text-5xl font-black text-primary leading-none">{totalToday}<span className="text-xl text-muted-foreground ml-2">/{settings?.dailyQuota || 20}</span></p>
            </div>
          </div>
        </div>

        {/* Konten Kanan: Sedang Dilayani & Antrian Selesai */}
        <div className="lg:col-span-4 flex flex-col gap-6 min-h-0">
          <Card className="bg-white shadow-xl border-t-8 border-t-primary overflow-hidden flex flex-col shrink-0">
            <div className="bg-primary/5 p-4 border-b flex items-center gap-3 shrink-0">
              <PlayCircle className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-black font-headline tracking-tight uppercase">Sedang Dilayani</h2>
            </div>
            <CardContent className="p-4 space-y-4 overflow-hidden">
              {beingServedList.length > 0 ? (
                beingServedList.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 bg-gradient-to-br from-[#005a78] to-[#003d52] text-white rounded-2xl shadow-lg relative overflow-hidden group">
                    {/* Indikator Animasi jika Sedang Dipanggil */}
                    {(p.status === 'Called' || p.status === 'called') && (
                      <div className="absolute inset-0 bg-primary/20 animate-pulse pointer-events-none" />
                    )}
                    
                    <div className="bg-white/10 text-white w-14 h-16 rounded-xl flex items-center justify-center border border-white/20 shrink-0 z-10">
                      <span className="text-xl font-black whitespace-nowrap px-1">{p.queueNumber}</span>
                    </div>
                    <div className="flex-1 overflow-hidden z-10">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-lg font-bold truncate leading-none">{p.fullName}</p>
                        <Badge className="bg-white/20 text-white text-[10px] font-black uppercase border-none">
                          {p.serviceType.split(' ')[0]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="flex items-center gap-1 opacity-80 truncate max-w-[120px]">
                          <User className="w-4 h-4" /> {p.servedBy || p.staffName || 'Petugas'}
                        </span>
                        <span className="text-sky-300">
                          <Clock className="w-4 h-4 inline mr-1" /> {calculateDuration(p.calledAt || p.serveStartTime || p.timestamp, null)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center opacity-20">
                  <Users className="w-16 h-16 mx-auto mb-2" />
                  <p className="text-xs font-black uppercase tracking-widest">Menunggu Aktivitas</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 bg-white shadow-xl border-none overflow-hidden flex flex-col min-h-0">
            <div className="bg-slate-50 p-4 border-b flex items-center gap-3 shrink-0">
              <ListChecks className="w-6 h-6 text-slate-500" />
              <h2 className="text-lg font-black font-headline tracking-tight uppercase">Antrian Selesai</h2>
            </div>
            <CardContent className="p-4 space-y-3 overflow-y-auto">
              {finishedParticipants.length > 0 ? (
                finishedParticipants.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-base font-black whitespace-nowrap px-1">{p.queueNumber}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-start">
                        <p className="text-base font-bold truncate leading-none">{p.fullName}</p>
                        <span className="text-xs font-black text-emerald-600">
                           {calculateDuration(p.calledAt || p.serveStartTime || p.timestamp, p.finishedAt || p.finishAt || p.serveEndTime)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider truncate max-w-[150px]">{p.serviceType}</p>
                        <p className="text-[9px] font-bold text-slate-400 italic">{p.servedBy || p.staffName}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground font-bold text-xs opacity-30 uppercase tracking-[0.3em]">
                  Belum Ada Data
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
