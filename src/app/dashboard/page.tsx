"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getQueueData } from '@/lib/queue-store';
import { Participant } from '@/lib/queue-types';
import { Clock, Users, ArrowRightCircle, ListChecks, PlayCircle, MonitorPlay, User } from 'lucide-react';

export default function PublicDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const fetchData = () => {
    const data = getQueueData();
    setParticipants(data.participants);
  };

  useEffect(() => {
    setCurrentTime(new Date());
    fetchData();
    
    const interval = setInterval(() => {
      fetchData();
      setCurrentTime(new Date());
    }, 1000);

    window.addEventListener('viola_storage_update', fetchData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('viola_storage_update', fetchData);
    };
  }, []);

  const calculateDuration = (startTime: string, endTime: string | Date | null) => {
    if (!startTime || !endTime) return '00:00';
    const start = new Date(startTime).getTime();
    const end = typeof endTime === 'string' ? new Date(endTime).getTime() : endTime.getTime();
    const diffInSeconds = Math.max(0, Math.floor((end - start) / 1000));
    
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Batasi daftar yang sedang dilayani agar tidak memanjangkan layar (maks 3)
  const beingServedList = participants.filter(p => p.status === 'Being Served').slice(0, 3);
  // Batasi daftar selesai (maks 4)
  const finishedParticipants = participants.filter(p => p.status === 'Finished').slice(-4).reverse();
  const nextInQueue = participants.find(p => p.status === 'Waiting');
  const totalToday = participants.length;

  return (
    <div className="h-screen bg-background p-4 md:p-6 flex flex-col gap-4 overflow-hidden">
      {/* Header - Dibuat lebih ringkas */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-md border-b-4 border-b-primary shrink-0">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-black text-primary font-headline tracking-tighter leading-none">VIOLA</h1>
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Virtual Office Layanan Peserta</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black tabular-nums leading-none">
            {currentTime ? currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
          </div>
          <div className="text-[9px] font-bold text-muted-foreground uppercase mt-1">
            {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : '...'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Main Panel: Video Player */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
          <Card className="flex-1 bg-black shadow-xl border-none overflow-hidden relative group">
            <CardContent className="h-full p-0 flex items-center justify-center bg-slate-900">
              <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                <MonitorPlay className="w-24 h-24 mb-3" />
                <p className="text-sm font-bold uppercase tracking-[0.3em]">Saluran Multimedia VIOLA</p>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Siaran Langsung Informasi</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Bar: Queue Summary - Lebih ringkas */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-dashed border-primary/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <ArrowRightCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Berikutnya</p>
                {nextInQueue ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-primary leading-none">{nextInQueue.queueNumber}</span>
                    <span className="text-base font-bold text-slate-700 truncate max-w-[120px] leading-none">{nextInQueue.fullName}</span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-muted-foreground italic">Kosong</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Total Hari Ini</p>
              <p className="text-3xl font-black text-primary leading-none">{totalToday}<span className="text-sm text-muted-foreground">/20</span></p>
            </div>
          </div>
        </div>

        {/* Sidebar: Information Panels - Batasi agar tidak scroll */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">
          
          {/* Part 1: Currently Serving */}
          <Card className="bg-white shadow-md border-t-4 border-t-primary overflow-hidden flex flex-col shrink-0 max-h-[45%]">
            <div className="bg-primary/5 p-3 border-b flex items-center gap-2 shrink-0">
              <PlayCircle className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-black font-headline tracking-tight uppercase">Sedang Dilayani</h2>
            </div>
            <CardContent className="p-3 space-y-3 overflow-hidden">
              {beingServedList.length > 0 ? (
                beingServedList.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2.5 bg-gradient-to-br from-[#005a78] to-[#003d52] text-white rounded-lg shadow-sm">
                    <div className="bg-white/10 text-white w-10 h-10 rounded-lg flex items-center justify-center text-xl font-black shrink-0 border border-white/20">
                      {p.queueNumber}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-0.5">
                        <p className="text-[12px] font-bold truncate leading-tight">{p.fullName}</p>
                        <Badge className="bg-white/20 text-white text-[7px] font-black uppercase border-none py-0 h-3.5">
                          {p.serviceType.split(' ')[0]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-black">
                        <span className="flex items-center gap-0.5 opacity-80">
                          <User className="w-2.5 h-2.5" /> {p.staffName?.split(' ')[0]}
                        </span>
                        <span className="text-sky-300">
                          <Clock className="w-2.5 h-2.5 inline mr-0.5" /> {calculateDuration(p.serveStartTime || '', currentTime)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center opacity-20">
                  <Users className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-[10px] font-bold uppercase">Menunggu</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Part 2: Recently Finished */}
          <Card className="flex-1 bg-white shadow-md border-none overflow-hidden flex flex-col min-h-0">
            <div className="bg-slate-50 p-3 border-b flex items-center gap-2 shrink-0">
              <ListChecks className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-black font-headline tracking-tight uppercase">Selesai</h2>
            </div>
            <CardContent className="p-3 space-y-2 overflow-y-auto">
              {finishedParticipants.length > 0 ? (
                finishedParticipants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="bg-primary/10 text-primary w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0">
                      {p.queueNumber}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-start">
                        <p className="text-[11px] font-bold truncate leading-tight">{p.fullName}</p>
                        <span className="text-[10px] font-black text-emerald-600 ml-2">
                           {calculateDuration(p.serveStartTime || '', p.serveEndTime || null)}
                        </span>
                      </div>
                      <p className="text-[8px] font-black text-muted-foreground uppercase mt-0.5">{p.serviceType}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground font-bold text-[10px] opacity-30 uppercase tracking-widest">
                  Belum Ada
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
