"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getQueueData, refreshQueueData, getSettings } from '@/lib/queue-store';
import { Participant, SystemSettings } from '@/lib/queue-types';
import { Clock, Users, ArrowRightCircle, ListChecks, PlayCircle, MonitorPlay, User } from 'lucide-react';

export default function PublicDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const fetchData = () => {
    const data = getQueueData();
    const currentSettings = getSettings();
    setParticipants(data.participants);
    setSettings(currentSettings);
  };

  useEffect(() => {
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
    };
  }, []);

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;
    
    // Handle Firestore Timestamp object
    if (typeof val === 'object') {
      if (val.seconds !== undefined) return new Date(val.seconds * 1000);
      if (val._seconds !== undefined) return new Date(val._seconds * 1000);
    }
    
    // Handle ISO string
    if (typeof val === 'string' && val.trim() !== '') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    
    return null;
  };

  const calculateDuration = (startTime: any, endTime: any) => {
    const start = parseDate(startTime);
    // Jika endTime eksplisit null, gunakan waktu sekarang (untuk timer berjalan)
    const end = (endTime === null || endTime === undefined) ? currentTime : parseDate(endTime);
    
    if (!start || !end) return '00:00:00';
    
    const diffInSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    
    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;
    
    return [hours, minutes, seconds]
      .map(v => v.toString().padStart(2, '0'))
      .join(':');
  };

  const beingServedList = participants.filter(p => 
    p.status === 'Being Served' || 
    p.status === 'Called' || 
    p.status === 'called'
  ).slice(0, 3);
  
  const finishedParticipants = participants.filter(p => p.status === 'Finished').slice(-4).reverse();
  const nextInQueue = participants.find(p => p.status === 'Waiting');
  const totalToday = participants.length;

  return (
    <div className="h-screen bg-background p-6 md:p-10 flex flex-col gap-6 overflow-hidden">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-xl border-b-8 border-b-primary shrink-0">
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-primary font-headline tracking-tighter leading-none">VIOLA</h1>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.5em]">Virtual Office Layanan Peserta</p>
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
        <div className="lg:col-span-8 flex flex-col gap-6 min-h-0">
          <Card className="flex-1 bg-black shadow-2xl border-none overflow-hidden relative group">
            <CardContent className="h-full p-0 flex items-center justify-center bg-slate-900 overflow-hidden">
              {settings?.videoUrl ? (
                <video 
                  key={settings.videoUrl}
                  className="w-full h-full object-cover" 
                  src={settings.videoUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  preload="auto"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                  <MonitorPlay className="w-32 h-32 mb-6" />
                  <p className="text-xl font-black uppercase tracking-[0.5em]">Saluran Multimedia VIOLA</p>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-10">
                    <div className="flex items-center gap-4 text-white">
                      <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse" />
                      <span className="text-sm font-black uppercase tracking-widest">Siaran Langsung Informasi & Edukasi</span>
                    </div>
                  </div>
                </div>
              )}
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

        <div className="lg:col-span-4 flex flex-col gap-6 min-h-0">
          <Card className="bg-white shadow-xl border-t-8 border-t-primary overflow-hidden flex flex-col shrink-0">
            <div className="bg-primary/5 p-4 border-b flex items-center gap-3 shrink-0">
              <PlayCircle className="w-6 h-6 text-primary" />
              <h2 className="text-lg font-black font-headline tracking-tight uppercase">Sedang Dilayani</h2>
            </div>
            <CardContent className="p-4 space-y-4 overflow-hidden">
              {beingServedList.length > 0 ? (
                beingServedList.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 bg-gradient-to-br from-[#005a78] to-[#003d52] text-white rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all">
                    <div className="bg-white/10 text-white w-14 h-16 rounded-xl flex items-center justify-center text-xl font-black shrink-0 border border-white/20 overflow-hidden">
                      <span className="whitespace-nowrap px-1 text-xl">{p.queueNumber}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
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
                    <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shrink-0 overflow-hidden">
                      <span className="whitespace-nowrap px-1 text-base">{p.queueNumber}</span>
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
