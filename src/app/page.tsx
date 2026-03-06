"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw, 
  Home,
  Settings,
  AlertCircle,
  Ticket,
  MessageSquare,
  Info,
  Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { addParticipant, getQueueData, getSettings } from '@/lib/queue-store';
import { Participant, ServiceType } from '@/lib/queue-types';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  whatsapp: z.string().regex(/^08[0-9]{8,11}$/, "Format nomor WhatsApp tidak valid (contoh: 081234567890)"),
  serviceType: z.enum(['Pendaftaran Peserta', 'Perubahan data', 'Informasi & Pengaduan']),
});

type FormValues = z.infer<typeof formSchema>;

export default function ParticipantIntake() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [finalQueue, setFinalQueue] = useState<Participant | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dailyQuota, setDailyQuota] = useState(20);
  
  // States for confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);

  const [queueInfo, setQueueInfo] = useState({
    total: 0,
    waiting: 0,
    served: 0,
    absent: 0, 
    current: [] as Participant[],
    lastFinished: null as Participant | null
  });

  const updateQueueInfo = () => {
    const { participants } = getQueueData();
    const settings = getSettings();
    setDailyQuota(settings.dailyQuota);
    setIsFull(participants.length >= settings.dailyQuota);
    setQueueInfo({
      total: participants.length,
      waiting: participants.filter(p => p.status === 'Waiting').length,
      served: participants.filter(p => p.status === 'Finished').length,
      absent: 0, 
      // Ambil 3 antrian yang sedang dilayani agar tidak memanjangkan layar
      current: participants.filter(p => p.status === 'Being Served').slice(0, 3),
      lastFinished: [...participants].reverse().find(p => p.status === 'Finished') || null
    });
  };

  useEffect(() => {
    setMounted(true);
    updateQueueInfo();
    const interval = setInterval(updateQueueInfo, 30000);
    window.addEventListener('viola_storage_update', updateQueueInfo);
    return () => {
      clearInterval(interval);
      window.removeEventListener('viola_storage_update', updateQueueInfo);
    };
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      whatsapp: '',
      serviceType: 'Pendaftaran Peserta',
    },
  });

  const onSubmit = (values: FormValues) => {
    setPendingData(values);
    setShowConfirm(true);
  };

  const handleFinalSubmit = () => {
    if (!pendingData) return;

    const result = addParticipant({
      fullName: pendingData.fullName,
      whatsapp: pendingData.whatsapp,
      serviceType: pendingData.serviceType as ServiceType
    });

    if (result.success && result.participant) {
      setFinalQueue(result.participant);
      setStep('success');
      updateQueueInfo();
      toast({ title: "Berhasil", description: "Nomor antrian Anda telah didaftarkan." });
    } else {
      toast({ variant: "destructive", title: "Pendaftaran Gagal", description: result.error || "Terjadi kesalahan." });
    }
    
    setShowConfirm(false);
    setPendingData(null);
  };

  const remainingQuota = Math.max(0, dailyQuota - queueInfo.total);

  return (
    <div className="min-h-screen bg-background flex flex-col font-body overflow-hidden">
      {/* Header Bar - Dibuat lebih tipis */}
      <header className="bg-[#005a78] text-white p-3 flex justify-between items-center shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white text-[#005a78] p-1 rounded-lg font-black text-lg">Q</div>
          <div>
            <h1 className="font-bold text-base leading-tight">Sistem Antrian VIOLA</h1>
            <p className="text-[9px] opacity-70 uppercase tracking-widest">Layanan Online</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push('/')} className="bg-sky-900 hover:bg-sky-800 text-white border-none rounded-lg h-8 px-3 text-xs">
            <Home className="w-3.5 h-3.5 mr-1" /> Beranda
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="text-white hover:bg-white/10 rounded-lg h-8 text-xs">
            <Settings className="w-3.5 h-3.5 mr-1" /> Admin
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4 md:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start overflow-hidden">
        
        {/* Left Column: Form or Success */}
        <div className="lg:col-span-7 h-full">
          {step === 'form' ? (
            <Card className="shadow-xl border-none rounded-2xl overflow-hidden bg-white h-fit max-h-full">
              <CardHeader className="text-center pt-6 pb-4 space-y-2">
                <CardTitle className="text-3xl font-black text-[#005a78] leading-tight">
                  Selamat Datang di <span className="text-primary">Layanan VIOLA</span>
                </CardTitle>
                <div className="space-y-3">
                  <CardDescription className="text-sm font-bold text-primary tracking-widest uppercase">
                    Sistem Antrian Online
                  </CardDescription>
                  
                  <div className="bg-amber-100 border-2 border-amber-300 py-2 px-4 rounded-xl w-fit mx-auto flex items-center gap-2 shadow-sm">
                    <Ticket className="w-5 h-5 text-amber-600" />
                    <div className="text-left">
                      <p className="text-[9px] font-black text-amber-900 uppercase tracking-widest leading-none mb-0.5">Sisa Kuota Hari Ini</p>
                      <p className="text-2xl font-black text-amber-700 leading-none">
                        {remainingQuota} <span className="text-[10px] font-bold text-amber-800 uppercase">Antrian</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                {isFull ? (
                  <div className="bg-rose-50 border-2 border-rose-100 rounded-xl p-6 text-center space-y-3">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                    <h3 className="text-xl font-black text-rose-700">Kuota Hari Ini Penuh</h3>
                    <p className="text-rose-600 text-sm font-medium">Mohon maaf, silakan coba lagi besok.</p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-sm font-bold text-[#005a78]">Nama :</FormLabel>
                            <FormControl>
                              <Input className="h-11 px-4 text-base rounded-lg bg-slate-50 border-slate-200" placeholder="Masukkan nama Anda" {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-sm font-bold text-[#005a78]">Nomor WhatsApp :</FormLabel>
                            <FormControl>
                              <Input className="h-11 px-4 text-base rounded-lg bg-slate-50 border-slate-200" placeholder="0812XXXXXXXX" {...field} />
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <FormLabel className="text-sm font-bold text-[#005a78]">Jenis Layanan</FormLabel>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {['Pendaftaran Peserta', 'Perubahan data', 'Informasi & Pengaduan'].map((type) => (
                            <Button
                              key={type}
                              type="button"
                              variant={form.watch('serviceType') === type ? 'default' : 'outline'}
                              className={`h-auto py-2 px-1 text-[11px] font-bold rounded-lg border-2 transition-all text-center leading-tight ${
                                form.watch('serviceType') === type 
                                ? 'bg-[#005a78] border-[#005a78] text-white' 
                                : 'border-[#005a78] text-[#005a78] hover:bg-slate-50'
                              }`}
                              onClick={() => form.setValue('serviceType', type as any)}
                            >
                              {type}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-12 text-lg font-black bg-primary hover:bg-primary/90 rounded-xl shadow-md transition-all uppercase tracking-widest mt-2">
                        Ambil Nomor Antrian
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-2xl border-none rounded-2xl overflow-hidden bg-white animate-in zoom-in duration-300">
              <CardContent className="p-8 text-center space-y-6">
                <div className="bg-emerald-100 p-4 rounded-full w-fit mx-auto">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-[#005a78]">Nomor Antrian Anda</h2>
                  <p className="text-xs text-muted-foreground font-medium">Pendaftaran berhasil, silakan simpan nomor ini.</p>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-6 space-y-2 border-2 border-dashed border-primary/30">
                  <span className="text-6xl font-black text-primary tracking-tighter block">{finalQueue?.queueNumber}</span>
                  <Badge className="bg-[#005a78] text-white px-4 py-1 text-sm font-bold rounded-full uppercase">
                    {finalQueue?.serviceType}
                  </Badge>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 justify-center text-primary">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-bold text-sm">Konfirmasi WhatsApp</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Link Zoom akan dikirimkan ke <span className="font-black text-[#005a78]">{finalQueue?.whatsapp}</span> saat Anda dipanggil.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <Button variant="outline" onClick={() => setStep('form')} className="w-full h-10 rounded-lg text-sm font-bold border-2">
                    Ambil Antrian Baru
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Queue Information - Dibuat Lebih Ringkas */}
        <div className="lg:col-span-5 space-y-4 h-full overflow-hidden">
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black text-[#005a78] font-headline">Informasi Antrian</h2>
            <p className="text-xs text-muted-foreground font-medium">
              {mounted ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()) : '...'}
            </p>
            <Badge variant="outline" className="mt-1 bg-white/50 border-none flex w-fit gap-2 py-1 px-2">
              <RefreshCcw className="w-2.5 h-2.5 text-primary animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-[9px]">Refresh 30s</span>
            </Badge>
          </div>

          <div className="space-y-3">
            <Card className="bg-white/40 border-none shadow-sm overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <RefreshCcw className="w-4 h-4" />
                  <span className="font-bold text-[10px] uppercase tracking-wider">Sedang Diproses (Maks. 3)</span>
                </div>
                <div className="space-y-3">
                  {queueInfo.current.length > 0 ? (
                    queueInfo.current.map((p) => (
                      <div key={p.id} className="flex items-center justify-between border-b border-primary/10 pb-2 last:border-0 last:pb-0">
                        <span className="text-3xl font-black text-[#005a78]">{p.queueNumber}</span>
                        <div className="text-right">
                          <span className="font-bold text-sm block truncate max-w-[150px]">{p.fullName}</span>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 h-4">{p.serviceType}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic text-[11px]">Belum ada antrian aktif</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/40 border-none shadow-sm overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold text-[10px] uppercase tracking-wider">Terakhir Selesai</span>
                </div>
                {queueInfo.lastFinished ? (
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-emerald-700">{queueInfo.lastFinished.queueNumber}</span>
                    <span className="font-bold text-sm truncate max-w-[150px]">{queueInfo.lastFinished.fullName}</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-[11px]">Belum ada</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total', value: `${queueInfo.total}`, icon: Users, color: 'text-blue-600' },
              { label: 'Tunggu', value: queueInfo.waiting, icon: Clock, color: 'text-teal-600' },
              { label: 'Lulus', value: queueInfo.served, icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'Absen', value: '0', icon: XCircle, color: 'text-rose-500' },
            ].map((stat, i) => (
              <Card key={i} className="bg-white border-none shadow-sm text-center">
                <CardContent className="p-2 flex flex-col items-center gap-1">
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color} opacity-70`} />
                  <span className={`text-base font-black ${stat.color}`}>{stat.value}</span>
                  <span className="text-[8px] uppercase font-bold text-muted-foreground">{stat.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl font-black text-[#005a78]">Konfirmasi Nomor</AlertDialogTitle>
            <AlertDialogDescription asChild className="text-center pt-2">
              <div className="text-sm text-muted-foreground">
                Apakah nomor WhatsApp Anda sudah benar?
                <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20 flex items-center justify-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-black tracking-wider text-primary">{pendingData?.whatsapp}</span>
                </div>
                <div className="mt-3 text-[11px] leading-relaxed">
                  Pastikan nomor aktif untuk menerima <strong>Link Zoom</strong>.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col mt-4">
            <AlertDialogAction 
              onClick={handleFinalSubmit}
              className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-bold"
            >
              Ya, Sudah Benar
            </AlertDialogAction>
            <AlertDialogCancel className="w-full h-12 border-2 rounded-xl font-bold">
              Ubah Nomor
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Footer Bar - Dibuat lebih tipis */}
      <footer className="bg-emerald-500 text-white p-2 text-center text-[10px] font-bold tracking-wide shadow-inner mt-auto shrink-0">
        VIOLA Virtual Office Online © 2024
      </footer>
      <Toaster />
    </div>
  );
}
