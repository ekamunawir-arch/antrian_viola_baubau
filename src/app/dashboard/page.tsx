"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getQueueData } from '@/lib/queue-store';
import { Participant } from '@/lib/queue-types';
import { Clock, Users, ArrowRightCircle, ListChecks } from 'lucide-react';

export default function PublicDashboard() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = () => {
    const data = getQueueData();
    setParticipants(data.participants);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setCurrentTime(new Date());
    }, 2000); // Fast refresh for MVP realtime feel

    window.addEventListener('viola_storage_update', fetchData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('viola_storage_update', fetchData);
    };
  }, []);

  const currentlyServing = participants.find(p => p.status === 'Being Served');
  const finishedParticipants = participants.filter(p => p.status === 'Finished').slice(-5).reverse();
  const nextInQueue = participants.find(p => p.status === 'Waiting');
  const totalToday = participants.length;

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 flex flex-col gap-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-xl border-b-8 border-b-primary">
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-primary font-headline tracking-tighter">VIOLA</h1>
          <p className="text-xl font-bold text-muted-foreground">Virtual Office Layanan Peserta</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black tabular-nums">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="text-lg font-bold text-muted-foreground">{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Main Serving Area */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Card className="flex-1 bg-gradient-viola text-white shadow-2xl border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <Users className="w-64 h-64" />
            </div>
            <CardContent className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6 relative z-10">
              <div className="bg-white/20 px-8 py-3 rounded-full text-2xl font-black uppercase tracking-[0.2em]">SEDANG DILAYANI</div>
              {currentlyServing ? (
                <>
                  <div className="text-[14rem] font-black leading-none drop-shadow-2xl">{currentlyServing.queueNumber}</div>
                  <div className="text-6xl font-black tracking-tight">{currentlyServing.fullName}</div>
                  <div className="text-2xl font-bold bg-white text-primary px-10 py-4 rounded-2xl shadow-lg mt-8 inline-block">
                    {currentlyServing.serviceType}
                  </div>
                  {currentlyServing.serveStartTime && (
                    <div className="text-xl font-medium flex items-center gap-2 mt-4 opacity-80">
                      <Clock className="w-6 h-6" /> Mulai: {new Date(currentlyServing.serveStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-4xl font-bold italic opacity-60">Tidak ada antrian aktif</div>
              )}
            </CardContent>
          </Card>

          {/* Next Up Bar */}
          <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-dashed border-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="bg-muted p-4 rounded-2xl">
                <ArrowRightCircle className="w-12 h-12 text-primary" />
              </div>
              <div>
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Antrian Berikutnya</p>
                {nextInQueue ? (
                  <div className="flex items-baseline gap-4">
                    <span className="text-5xl font-black text-primary">{nextInQueue.queueNumber}</span>
                    <span className="text-3xl font-bold">{nextInQueue.fullName}</span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground italic">Belum Ada</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Total Antrian</p>
              <p className="text-5xl font-black text-primary">{totalToday}<span className="text-2xl text-muted-foreground">/20</span></p>
            </div>
          </div>
        </div>

        {/* Sidebar: History */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 bg-white shadow-lg border-none">
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-4 border-b pb-6">
                <ListChecks className="w-8 h-8 text-primary" />
                <h2 className="text-2xl font-black font-headline">Sudah Dilayani</h2>
              </div>
              
              <div className="space-y-6">
                {finishedParticipants.length > 0 ? (
                  finishedParticipants.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-primary/10 text-primary w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0">
                        {p.queueNumber}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-2xl font-bold truncate">{p.fullName}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">{p.serviceType}</Badge>
                          <span className="text-sm font-bold text-muted-foreground">Selesai {p.serveEndTime && new Date(p.serveEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-muted-foreground font-bold text-lg italic">Belum ada peserta selesai</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}