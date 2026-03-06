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
    // Set initial time only on client
    setCurrentTime(new Date());
    fetchData();
    
    const interval = setInterval(() => {
      fetchData();
      setCurrentTime(new Date());
    }, 2000); 

    window.addEventListener('viola_storage_update', fetchData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('viola_storage_update', fetchData);
    };
  }, []);

  const beingServedList = participants.filter(p => p.status === 'Being Served');
  const finishedParticipants = participants.filter(p => p.status === 'Finished').slice(-5).reverse();
  const nextInQueue = participants.find(p => p.status === 'Waiting');
  const totalToday = participants.length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-lg border-b-4 border-b-primary">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-primary font-headline tracking-tighter">VIOLA</h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Virtual Office Layanan Peserta</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black tabular-nums">
            {currentTime ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </div>
          <div className="text-sm font-bold text-muted-foreground uppercase">
            {currentTime ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '...'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Main Panel: Video Player */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <Card className="flex-1 bg-black shadow-2xl border-none overflow-hidden relative group">
            <CardContent className="h-full p-0 flex items-center justify-center bg-slate-900">
              <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                <MonitorPlay className="w-32 h-32 mb-4 group-hover:scale-110 transition-transform duration-500" />
                <p className="text-xl font-bold uppercase tracking-[0.3em]">VIOLA Multimedia Channel</p>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-sm font-black uppercase tracking-widest">Live Streaming Information</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom Bar: Queue Summary */}
          <div className="bg-white p-6 rounded-2xl shadow-md border border-dashed border-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-xl">
                <ArrowRightCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Antrian Berikutnya</p>
                {nextInQueue ? (
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-primary">{nextInQueue.queueNumber}</span>
                    <span className="text-xl font-bold text-slate-700">{nextInQueue.fullName}</span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-muted-foreground italic">Tidak Ada Antrian</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Antrian Hari Ini</p>
              <p className="text-4xl font-black text-primary">{totalToday}<span className="text-xl text-muted-foreground">/20</span></p>
            </div>
          </div>
        </div>

        {/* Sidebar: Information Panels */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Part 1: Currently Serving (Sedang Dilayani) - BARIS LAYOUT */}
          <Card className="bg-white shadow-lg border-t-4 border-t-primary overflow-hidden">
            <div className="bg-primary/5 p-4 border-b flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-black font-headline tracking-tight uppercase">Sedang Dilayani</h2>
            </div>
            <CardContent className="p-4 space-y-4">
              {beingServedList.length > 0 ? (
                beingServedList.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2 p-4 bg-gradient-to-br from-[#005a78] to-[#003d52] text-white rounded-2xl shadow-md animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between items-start">
                      <div className="text-5xl font-black leading-none">{p.queueNumber}</div>
                      <Badge className="bg-white/20 text-white text-[9px] font-black uppercase border-none">
                        {p.serviceType}
                      </Badge>
                    </div>
                    <div className="space-y-1 mt-1">
                      <div className="text-lg font-black tracking-tight truncate">{p.fullName}</div>
                      <div className="flex items-center justify-between text-[10px] opacity-70 font-bold uppercase">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {p.staffName || 'Petugas 1'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {p.serveStartTime ? new Date(p.serveStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center space-y-3 opacity-30">
                  <Users className="w-12 h-12 mx-auto" />
                  <p className="text-sm font-bold italic uppercase tracking-widest">Antrian Kosong</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Part 2: Recently Finished (Sudah Dilayani) */}
          <Card className="flex-1 bg-white shadow-lg border-none overflow-hidden">
            <div className="bg-slate-50 p-4 border-b flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-slate-500" />
              <h2 className="text-lg font-black font-headline tracking-tight uppercase">Selesai Dilayani</h2>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-3">
                {finishedParticipants.length > 0 ? (
                  finishedParticipants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl animate-in slide-in-from-right-4 duration-300">
                      <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 border border-primary/20">
                        {p.queueNumber}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-bold truncate leading-tight">{p.fullName}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[8px] font-bold text-muted-foreground uppercase">{p.serviceType}</span>
                          <span className="text-[8px] font-black text-emerald-600 uppercase">Selesai</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-muted-foreground font-bold text-sm italic opacity-50 uppercase tracking-widest">
                    Belum ada data
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
