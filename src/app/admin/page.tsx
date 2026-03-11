"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Monitor, 
  Download, 
  LogOut, 
  Play, 
  CheckCircle, 
  Clock, 
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
  Settings,
  Save,
  ArrowLeft,
  Video,
  User,
  AlertTriangle,
  Plus,
  Trash2,
  Users,
  Timer
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
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getQueueData, updateParticipantStatus, getSettings, saveSettings, clearQueueData } from '@/lib/queue-store';
import { Participant, DEFAULT_ZOOM_LINK, CounterClerk } from '@/lib/queue-types';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { adminQueueCallAnnouncement } from '@/ai/flows/admin-queue-call-announcement';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [lastSync, setLastSync] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'settings'>('dashboard');
  
  // Settings state
  const [dailyQuota, setDailyQuota] = useState(20);
  const [zoomLink, setZoomLink] = useState(DEFAULT_ZOOM_LINK);
  const [clerks, setClerks] = useState<CounterClerk[]>([]);
  
  // Dashboard state
  const [activeClerkId, setActiveClerkId] = useState<string>('');
  const [isCalling, setIsCalling] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  // Dialog state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Audio Queue refs
  const audioQueue = useRef<string[]>([]);
  const isPlayingAudio = useRef(false);

  const fetchQueue = () => {
    const data = getQueueData();
    const settings = getSettings();
    setParticipants(data.participants);
    setDailyQuota(settings.dailyQuota);
    setZoomLink(settings.zoomLink);
    setClerks(settings.clerks);
    
    if (!activeClerkId && settings.clerks.length > 0) {
      setActiveClerkId(settings.clerks[0].id);
    }
    
    setLastSync(new Date());
  };

  useEffect(() => {
    fetchQueue();
    window.addEventListener('viola_storage_update', fetchQueue);
    return () => window.removeEventListener('viola_storage_update', fetchQueue);
  }, [activeClerkId]);

  const playSequentially = async (dataUri: string) => {
    audioQueue.current.push(dataUri);
    
    if (isPlayingAudio.current) return;

    isPlayingAudio.current = true;
    while (audioQueue.current.length > 0) {
      const nextUri = audioQueue.current.shift();
      if (nextUri) {
        try {
          const audio = new Audio(nextUri);
          await new Promise((resolve) => {
            audio.onended = resolve;
            audio.onerror = resolve;
            audio.play().catch(resolve);
          });
        } catch (e) {
          console.error("Gagal memutar audio:", e);
        }
      }
    }
    isPlayingAudio.current = false;
  };

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
    if (isCalling) return;

    const clerk = clerks.find(c => c.id === activeClerkId);
    if (!clerk) {
      toast({ variant: "destructive", title: "Petugas Belum Dipilih", description: "Silakan pilih petugas loket terlebih dahulu." });
      return;
    }

    // Aktifkan cooldown 10 detik
    setIsCalling(true);
    setCooldown(10);
    
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimeout(() => {
      setIsCalling(false);
    }, 10000);

    updateParticipantStatus(p.id, 'Being Served', clerk.name);
    
    try {
      const result = await adminQueueCallAnnouncement({
        queueNumber: p.queueNumber,
        participantName: p.fullName
      });

      if (result.error === 'QUOTA_EXHAUSTED') {
        toast({ 
          variant: "destructive", 
          title: "Batas Pemanggilan Tercapai", 
          description: "Sistem suara mencapai batas kuota sementara. Mohon tunggu sekitar 1 menit sebelum memanggil lagi." 
        });
        return;
      }
      
      if (result.audioDataUri) {
        playSequentially(result.audioDataUri);
        toast({ title: "Memanggil Antrian", description: `Memanggil ${p.queueNumber} - ${p.fullName} oleh ${clerk.name}` });
      }
      
    } catch (error: any) {
      console.error("Gagal memanggil:", error);
      toast({ 
        variant: "destructive", 
        title: "Gagal Memanggil", 
        description: "Terjadi kesalahan pada sistem suara." 
      });
    }
  };

  const handleFinish = (id: string) => {
    updateParticipantStatus(id, 'Finished');
    toast({ title: "Layanan Selesai", description: "Peserta telah dipindahkan ke daftar selesai." });
  };

  const handleAddClerk = () => {
    const newClerk: CounterClerk = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Petugas ${clerks.length + 1}`
    };
    setClerks([...clerks, newClerk]);
  };

  const handleRemoveClerk = (id: string) => {
    if (clerks.length <= 1) {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: "Minimal harus ada satu petugas loket." });
      return;
    }
    setClerks(clerks.filter(c => c.id !== id));
  };

  const handleClerkNameChange = (id: string, name: string) => {
    setClerks(clerks.map(c => c.id === id ? { ...c, name } : c));
  };

  const handleSaveSettings = () => {
    saveSettings({ dailyQuota, zoomLink, clerks });
    toast({ title: "Pengaturan Disimpan", description: `Pengaturan sistem VIOLA telah diperbarui.` });
    setActiveTab('dashboard');
  };

  const handleResetQueueAction = () => {
    clearQueueData();
    setParticipants([]);
    setShowResetConfirm(false);
    toast({ title: "Antrian Direset", description: "Seluruh data antrian hari ini telah dihapus secara permanen." });
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
      p.staffName || "-"
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

  const beingServedList = participants.filter(p => p.status === 'Being Served');

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
            <Button 
              variant={activeTab === 'settings' ? 'secondary' : 'outline'} 
              onClick={() => setActiveTab(activeTab === 'dashboard' ? 'settings' : 'dashboard')} 
              className="rounded-xl flex gap-2"
            >
              <Settings className="w-4 h-4" /> Setting
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
            <Card className="md:col-span-2 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
                <div className="space-y-1">
                  <CardTitle className="font-headline text-lg">Daftar Antrian Hari Ini</CardTitle>
                  <CardDescription>Kelola panggilan dan status layanan peserta.</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loket Aktif Anda</p>
                    <Select value={activeClerkId} onValueChange={setActiveClerkId}>
                      <SelectTrigger className="h-9 w-[180px] bg-muted/50 font-bold border-none rounded-lg mt-1">
                        <SelectValue placeholder="Pilih Petugas" />
                      </SelectTrigger>
                      <SelectContent>
                        {clerks.map(c => (
                          <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge variant="outline" className="rounded-full px-4 h-8">{participants.length} Antrian</Badge>
                </div>
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
                              <div className="flex flex-col gap-1">
                                <Badge className={
                                  p.status === 'Waiting' ? 'bg-yellow-500' : 
                                  p.status === 'Being Served' ? 'bg-blue-600' : 'bg-green-600'
                                }>
                                  {p.status === 'Waiting' ? 'Menunggu' : 
                                   p.status === 'Being Served' ? 'Melayani' : 'Selesai'}
                                </Badge>
                                {p.staffName && (
                                  <span className="text-[10px] text-muted-foreground italic">Oleh: {p.staffName}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {p.status === 'Waiting' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleCall(p)} 
                                    disabled={isCalling}
                                    className="bg-blue-600 hover:bg-blue-700 h-8 w-24"
                                  >
                                    {isCalling ? (
                                      <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {cooldown}s</span>
                                    ) : (
                                      <span className="flex items-center"><Play className="w-3 h-3 mr-1" /> Panggil</span>
                                    )}
                                  </Button>
                                )}
                                {p.status === 'Being Served' && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => handleCall(p)} 
                                      disabled={isCalling}
                                      className="h-8 w-24"
                                    >
                                      {isCalling ? (
                                        <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {cooldown}s</span>
                                      ) : (
                                        <span className="flex items-center"><Play className="w-3 h-3 mr-1" /> Ulangi</span>
                                      )}
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
              <Card className="shadow-sm border-l-4 border-l-primary overflow-hidden">
                <CardHeader className="bg-primary/5 p-4 border-b">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Play className="w-4 h-4" /> Sedang Dilayani
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
                              {p.staffName}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-30">
                      <User className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada layanan aktif</p>
                    </div>
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
        ) : (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
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
                  {/* Quota Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="quota" className="text-sm font-black text-primary uppercase tracking-wider">Kuota Antrian Harian</Label>
                    <p className="text-xs text-muted-foreground">Maksimal pendaftar per hari.</p>
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

                  {/* Zoom Link Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="zoom" className="text-sm font-black text-primary uppercase tracking-wider">Link Zoom Layanan</Label>
                    <p className="text-xs text-muted-foreground">Link yang akan dikirim ke WhatsApp peserta.</p>
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

                {/* Clerks/Staff Setting */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-black text-primary uppercase tracking-wider">Manajemen Petugas Loket</Label>
                      <p className="text-xs text-muted-foreground">Daftarkan nama petugas untuk setiap loket layanan.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAddClerk} className="rounded-full border-primary text-primary hover:bg-primary/5">
                      <Plus className="w-4 h-4 mr-2" /> Tambah Loket
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clerks.map((clerk, index) => (
                      <div key={clerk.id} className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border group transition-all hover:bg-white hover:shadow-md">
                        <div className="bg-primary/10 text-primary w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Nama Petugas</Label>
                          <Input 
                            value={clerk.name}
                            onChange={(e) => handleClerkNameChange(clerk.id, e.target.value)}
                            placeholder="Contoh: Budi Santoso"
                            className="h-10 border-none bg-transparent p-0 focus-visible:ring-0 text-sm font-bold"
                          />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveClerk(clerk.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t space-y-6">
                  <Button onClick={handleSaveSettings} className="w-full h-14 bg-primary hover:bg-primary/90 rounded-xl text-lg font-bold flex gap-2 shadow-md">
                    <Save className="w-5 h-5" /> Simpan Pengaturan
                  </Button>

                  <div className="pt-4">
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowResetConfirm(true)} 
                      className="w-full h-12 rounded-xl text-sm font-bold flex gap-2 opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus Seluruh Antrian Hari Ini
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center mt-2 font-medium">Tindakan ini akan menghapus semua data pendaftar hari ini secara permanen.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit mb-2">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <AlertDialogTitle className="text-2xl font-black text-center">Reset Seluruh Antrian?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              Apakah Anda yakin ingin menghapus <strong>seluruh data antrian hari ini</strong> secara permanen? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="rounded-xl h-12 font-bold flex-1">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetQueueAction}
              className="bg-destructive hover:bg-destructive/90 rounded-xl h-12 font-bold flex-1 border-none"
            >
              Ya, Hapus Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
