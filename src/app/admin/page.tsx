"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Monitor, 
  Download, 
  LogOut, 
  Clock, 
  LayoutDashboard,
  ShieldCheck,
  Settings,
  Save,
  ArrowLeft,
  Video,
  User,
  Play,
  CalendarDays,
  CalendarOff,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getQueueData, getSettings, saveSettings } from '@/lib/queue-store';
import { Participant, DEFAULT_ZOOM_LINK, DEFAULT_OPERATING_DAYS, DEFAULT_START_TIME, DEFAULT_END_TIME, DEFAULT_SERVICE_START_TIME } from '@/lib/queue-types';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('settings');
  
  const [dailyQuota, setDailyQuota] = useState(20);
  const [zoomLink, setZoomLink] = useState(DEFAULT_ZOOM_LINK);
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME);
  const [serviceStartTime, setServiceStartTime] = useState(DEFAULT_SERVICE_START_TIME);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHoliday, setNewHoliday] = useState('');

  const fetchQueue = () => {
    const data = getQueueData();
    const settings = getSettings();
    setParticipants(data.participants);
    setDailyQuota(settings.dailyQuota);
    setZoomLink(settings.zoomLink);
    setStartTime(settings.startTime || DEFAULT_START_TIME);
    setEndTime(settings.endTime || DEFAULT_END_TIME);
    setServiceStartTime(settings.serviceStartTime || DEFAULT_SERVICE_START_TIME);
    setHolidays(settings.holidays || []);
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

  const handleSaveSettings = async () => {
    await saveSettings({ 
      dailyQuota, 
      zoomLink, 
      clerks: getSettings().clerks, 
      operatingDays: DEFAULT_OPERATING_DAYS,
      startTime, 
      endTime,
      serviceStartTime,
      holidays
    });
    toast({ title: "Pengaturan Disimpan", description: `Pengaturan sistem VIOLA telah diperbarui.` });
    setActiveTab('dashboard');
  };

  const addHoliday = () => {
    if (!newHoliday) return;
    if (holidays.includes(newHoliday)) {
      toast({ variant: "destructive", title: "Gagal", description: "Tanggal sudah ada dalam daftar libur." });
      return;
    }
    setHolidays([...holidays, newHoliday].sort());
    setNewHoliday('');
  };

  const removeHoliday = (date: string) => {
    setHolidays(holidays.filter(h => h !== date));
  };

  const downloadCSV = () => {
    if (participants.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const headers = ["Tanggal", "Nama", "Nomor HP", "Jenis Layanan", "Nomor Antrian", "Status", "Petugas"];
    const rows = participants.map(p => [
      today,
      p.fullName,
      p.whatsapp,
      p.serviceType,
      p.queueNumber,
      p.status,
      p.servedBy || p.staffName || "-"
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

  const beingServedList = participants.filter(p => p.status === 'Being Served' || p.status === 'Called' || p.status === 'called');

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
                <Clock className="w-3 h-3" /> Update Terakhir: {lastSync ? lastSync.toLocaleTimeString() : '---'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="rounded-xl flex gap-2">
              <LayoutDashboard className="w-4 h-4" /> Buka Dashboard
            </Button>
            <Button 
              variant={activeTab === 'settings' ? 'secondary' : 'outline'} 
              onClick={() => setActiveTab('settings')} 
              className="rounded-xl flex gap-2"
            >
              <Settings className="w-4 h-4" /> Pengaturan
            </Button>
            <Button variant="outline" onClick={downloadCSV} className="rounded-xl flex gap-2">
              <Download className="w-4 h-4" /> Unduh CSV
            </Button>
            <Button variant="destructive" onClick={() => setIsLoggedIn(false)} className="rounded-xl flex gap-2">
              <LogOut className="w-4 h-4" /> Keluar
            </Button>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <Card className="md:col-span-2 shadow-sm border-none bg-gradient-to-br from-white to-slate-50">
               <CardHeader className="pb-4">
                 <CardTitle className="text-xl font-black text-primary uppercase tracking-tight">Status Monitoring</CardTitle>
                 <CardDescription>Antrian dikelola sepenuhnya melalui aplikasi <strong>Viola Tracker</strong>.</CardDescription>
               </CardHeader>
               <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="bg-blue-100 p-4 rounded-2xl text-blue-600">
                      <Play className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Sedang Dilayani</p>
                      <p className="text-4xl font-black text-blue-600">{beingServedList.length}</p>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600">
                      <Clock className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Menunggu Panggilan</p>
                      <p className="text-4xl font-black text-emerald-600">{participants.filter(p => p.status === 'Waiting').length}</p>
                    </div>
                 </div>
               </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="shadow-sm border-l-4 border-l-primary overflow-hidden">
                <CardHeader className="bg-primary/5 p-4 border-b">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Play className="w-4 h-4" /> Aktif Dilayani
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {beingServedList.length > 0 ? (
                    beingServedList.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in zoom-in duration-300">
                        <div className="bg-primary text-white w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black shrink-0">
                          {p.queueNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-xs leading-tight">{p.fullName}</p>
                          <div className="flex items-center justify-between mt-1">
                            <Badge variant="outline" className="text-[8px] px-1 h-3.5 uppercase font-bold text-muted-foreground border-muted-foreground/30">
                              {p.serviceType}
                            </Badge>
                            <span className="text-[9px] font-bold text-sky-600 flex items-center gap-0.5">
                              {p.servedBy || p.staffName}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-30">
                      <User className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada layanan aktif</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300 pb-20">
            <Card className="shadow-lg border-t-4 border-t-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Settings className="w-5 h-5 text-primary" /> Pengaturan Sistem
                    </CardTitle>
                    <CardDescription>Sesuaikan parameter operasional VIOLA.</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setActiveTab('dashboard')}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label htmlFor="quota" className="text-sm font-black text-primary uppercase tracking-wider">Kuota Antrian Harian</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Input 
                        id="quota"
                        type="number" 
                        value={dailyQuota} 
                        onChange={(e) => setDailyQuota(parseInt(e.target.value) || 0)}
                        className="max-w-[120px] h-12 text-center text-xl font-black rounded-xl"
                      />
                      <div className="text-muted-foreground font-medium text-sm">Peserta</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zoom" className="text-sm font-black text-primary uppercase tracking-wider">Link Zoom Layanan</Label>
                    <div className="relative mt-2">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Video className="w-4 h-4" />
                      </div>
                      <Input 
                        id="zoom"
                        type="url" 
                        value={zoomLink} 
                        onChange={(e) => setZoomLink(e.target.value)}
                        placeholder="https://zoom.us/..."
                        className="h-12 pl-12 rounded-xl text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 border-t pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <Label className="text-sm font-black text-primary uppercase tracking-wider">Waktu Operasional Pendaftaran & Layanan</Label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Mulai Pendaftaran:</p>
                      <Input 
                        type="time" 
                        value={startTime} 
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-12 rounded-xl text-center font-bold"
                      />
                      <p className="text-[10px] text-slate-400 italic">Peserta bisa ambil nomor</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Layanan Dimulai:</p>
                      <Input 
                        type="time" 
                        value={serviceStartTime} 
                        onChange={(e) => setServiceStartTime(e.target.value)}
                        className="h-12 rounded-xl text-center font-bold border-primary/30 bg-primary/5"
                      />
                      <p className="text-[10px] text-slate-400 italic">Informasi jam stand-by petugas</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Selesai Pendaftaran:</p>
                      <Input 
                        type="time" 
                        value={endTime} 
                        onChange={(e) => setEndTime(e.target.value)}
                        className="h-12 rounded-xl text-center font-bold"
                      />
                      <p className="text-[10px] text-slate-400 italic">Pendaftaran ditutup otomatis</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 border-t pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarOff className="w-5 h-5 text-primary" />
                    <Label className="text-sm font-black text-primary uppercase tracking-wider">Manajemen Hari Libur (Cuti Bersama/Tanggal Merah)</Label>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2 w-full">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Tambah Tanggal Libur:</p>
                      <Input 
                        type="date" 
                        value={newHoliday} 
                        onChange={(e) => setNewHoliday(e.target.value)}
                        className="h-12 rounded-xl font-bold"
                      />
                    </div>
                    <Button onClick={addHoliday} className="h-12 rounded-xl px-8 flex gap-2">
                      <Plus className="w-4 h-4" /> Tambah
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                    {holidays.length > 0 ? (
                      holidays.map((date) => (
                        <div key={date} className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-xl group">
                          <span className="text-xs font-bold text-rose-700">{new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <button onClick={() => removeHoliday(date)} className="text-rose-400 hover:text-rose-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-6 text-center text-muted-foreground text-xs italic border border-dashed rounded-xl">
                        Belum ada tanggal libur yang ditambahkan.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Button onClick={handleSaveSettings} className="w-full h-14 bg-primary hover:bg-primary/90 rounded-xl text-lg font-bold flex gap-2 shadow-md">
                    <Save className="w-5 h-5" /> Simpan Pengaturan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Toaster />
    </div>
  );
}
