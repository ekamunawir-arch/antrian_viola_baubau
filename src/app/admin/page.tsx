"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Monitor, 
  Download, 
  LogOut, 
  Play, 
  CheckCircle, 
  Clock, 
  User, 
  ChevronRight,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getQueueData, updateParticipantStatus, saveQueueData } from '@/lib/queue-store';
import { Participant } from '@/lib/queue-types';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { adminQueueCallAnnouncement } from '@/ai/flows/admin-queue-call-announcement';
import { Input } from '@/components/ui/input';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [lastSync, setLastSync] = useState(new Date());

  const fetchQueue = () => {
    const data = getQueueData();
    setParticipants(data.participants);
    setLastSync(new Date());
  };

  useEffect(() => {
    fetchQueue();
    window.addEventListener('viola_storage_update', fetchQueue);
    return () => window.removeEventListener('viola_storage_update', fetchQueue);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsLoggedIn(true);
      toast({ title: "Login Berhasil", description: "Selamat datang di Panel Admin VIOLA." });
    } else {
      toast({ variant: "destructive", title: "Login Gagal", description: "Password salah." });
    }
  };

  const handleCall = async (p: Participant) => {
    updateParticipantStatus(p.id, 'Being Served');
    toast({ title: "Memanggil Antrian", description: `Memanggil ${p.queueNumber} - ${p.fullName}` });
    
    try {
      const result = await adminQueueCallAnnouncement({
        queueNumber: p.queueNumber,
        participantName: p.fullName
      });
      const audio = new Audio(result.audioDataUri);
      audio.play();
    } catch (error) {
      console.error("TTS failed", error);
    }
  };

  const handleFinish = (id: string) => {
    updateParticipantStatus(id, 'Finished');
    toast({ title: "Layanan Selesai", description: "Peserta telah dipindahkan ke daftar selesai." });
  };

  const downloadCSV = () => {
    if (participants.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const headers = ["Tanggal", "Nama", "Nomor HP", "Jenis Layanan", "Nomor Antrian", "Status"];
    const rows = participants.map(p => [
      today,
      p.fullName,
      p.whatsapp,
      p.serviceType,
      p.queueNumber,
      p.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `VIOLA_Report_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-t-8 border-t-primary shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold font-headline">Admin Login</CardTitle>
            <CardDescription>Masukkan password untuk mengakses panel admin.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="py-6 text-center text-xl tracking-widest"
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 py-6 text-lg font-bold rounded-xl">Masuk</Button>
            </form>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-xl text-white">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-headline text-primary tracking-tight">Panel Admin VIOLA</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Update Terakhir: {lastSync.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="rounded-xl flex gap-2">
              <LayoutDashboard className="w-4 h-4" /> Buka Dashboard
            </Button>
            <Button variant="outline" onClick={downloadCSV} className="rounded-xl flex gap-2">
              <Download className="w-4 h-4" /> Unduh CSV
            </Button>
            <Button variant="destructive" onClick={() => setIsLoggedIn(false)} className="rounded-xl flex gap-2">
              <LogOut className="w-4 h-4" /> Keluar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-headline text-lg">Daftar Antrian Hari Ini</CardTitle>
              <Badge variant="outline" className="rounded-full px-4">{participants.length} Antrian</Badge>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-20">No</TableHead>
                      <TableHead>Peserta</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Belum ada antrian untuk hari ini.</TableCell>
                      </TableRow>
                    ) : (
                      participants.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-black text-primary">{p.queueNumber}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold">{p.fullName}</span>
                              <span className="text-xs text-muted-foreground">{p.whatsapp}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase">{p.serviceType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              p.status === 'Waiting' ? 'bg-yellow-500' : 
                              p.status === 'Being Served' ? 'bg-blue-600' : 'bg-green-600'
                            }>
                              {p.status === 'Waiting' ? 'Menunggu' : 
                               p.status === 'Being Served' ? 'Melayani' : 'Selesai'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {p.status === 'Waiting' && (
                                <Button size="sm" onClick={() => handleCall(p)} className="bg-blue-600 hover:bg-blue-700 h-8">
                                  <Play className="w-3 h-3 mr-1" /> Panggil
                                </Button>
                              )}
                              {p.status === 'Being Served' && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleCall(p)} className="h-8">
                                    <Play className="w-3 h-3 mr-1" /> Ulangi
                                  </Button>
                                  <Button size="sm" onClick={() => handleFinish(p.id)} className="bg-green-600 hover:bg-green-700 h-8">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Selesai
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="shadow-sm border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Sedang Dilayani</CardTitle>
              </CardHeader>
              <CardContent>
                {participants.find(p => p.status === 'Being Served') ? (
                  <div className="space-y-3">
                    <div className="text-5xl font-black text-primary">{participants.find(p => p.status === 'Being Served')?.queueNumber}</div>
                    <div className="font-bold text-xl">{participants.find(p => p.status === 'Being Served')?.fullName}</div>
                    <div className="text-xs font-bold text-muted-foreground bg-muted p-2 rounded-lg uppercase">
                      {participants.find(p => p.status === 'Being Served')?.serviceType}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-sm">Tidak ada yang sedang dilayani.</div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Antrian Berikutnya</CardTitle>
              </CardHeader>
              <CardContent>
                {participants.find(p => p.status === 'Waiting') ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-black text-muted-foreground">{participants.find(p => p.status === 'Waiting')?.queueNumber}</div>
                      <div className="font-semibold">{participants.find(p => p.status === 'Waiting')?.fullName}</div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-sm">Semua antrian telah diproses.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}