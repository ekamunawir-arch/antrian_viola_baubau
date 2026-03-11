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
import { addParticipant, getQueueData, getSettings, refreshQueueData } from '@/lib/queue-store';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    
    // Filter untuk menampilkan yang sedang dilayani atau dipanggil (Called)
    const activeParticipants = participants.filter(p => 
      p.status === 'Being Served' || 
      p.status === 'Called' || 
      p.status === 'called'
    );

    setQueueInfo({
      total: participants.length,
      waiting: participants.filter(p => p.status === 'Waiting').length,
      served: participants.filter(p => p.status === 'Finished').length,
      absent: 0, 
      current: activeParticipants.slice(0, 3),
      lastFinished: [...participants].reverse().find(p => p.status === 'Finished') || null
    });
  };

  useEffect(() => {
    setMounted(true);
    updateQueueInfo();
    
    const syncInterval = setInterval(() => {
      refreshQueueData();
    }, 15000);

    window.addEventListener('viola_storage_update', updateQueueInfo);
    return () => {
      clearInterval(syncInterval);
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

  const handleFinalSubmit = async () => {
    if (!pendingData || isSubmitting) return;
    setIsSubmitting(true);

    const result = await addParticipant({
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
    
    setIsSubmitting(false);
    setShowConfirm(false);
    setPendingData(null);
  };

  const remainingQuota = Math.max(0, dailyQuota - queueInfo.total);

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <header className="bg-[#005a78] text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white text-[#005a78] p-2 rounded-xl font-black text-2xl">Q</div>
          <div>
            <h1 className="font-bold text-xl leading-tight tracking-tight">Sistem Antrian VIOLA</h1>
            <p className="text-[10px] opacity-70 uppercase tracking-[0.2em]">Virtual Office Layanan Peserta</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => router.push('/')} className="bg-sky-900 hover:bg-sky-800 text-white border-none rounded-xl h-10 px-4">
            <Home className="w-4 h-4 mr-2" /> Beranda
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="text-white hover:bg-white/10 rounded-xl h-10 px-4">
            <Settings className="w-4 h-4 mr-2" /> Admin
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          {step === 'form' ? (
            <Card className="shadow-2xl border-none rounded-3xl overflow-hidden bg-white">
              <CardHeader className="text-center pt-10 pb-6 space-y-4">
                <CardTitle className="text-4xl font-black text-[#005a78] leading-tight">
                  Selamat Datang di <span className="text-primary">Layanan VIOLA</span>
                </CardTitle>
                <div className="space-y-4">
                  <CardDescription className="text-base font-bold text-primary tracking-[0.3em] uppercase">
                    Sistem Antrian Online
                  </CardDescription>
                  
                  <div className="bg-amber-100 border-2 border-amber-300 py-3 px-6 rounded-2xl w-fit mx-auto flex items-center gap-3 shadow-md animate-pulse">
                    <Ticket className="w-6 h-6 text-amber-600" />
                    <div className="text-left">
                      <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest leading-none mb-1">Sisa Kuota Hari Ini</p>
                      <p className="text-3xl font-black text-amber-700 leading-none">
                        {remainingQuota} <span className="text-xs font-bold text-amber-800 uppercase">Antrian</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-8 pb-10">
                {isFull ? (
                  <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-8 text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
                    <h3 className="text-2xl font-black text-rose-700">Kuota Hari Ini Penuh</h3>
                    <p className="text-rose-600 font-medium">Mohon maaf, silakan coba lagi besok hari atau hubungi petugas kami.</p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-bold text-[#005a78]">Nama Lengkap Sesuai KTP :</FormLabel>
                            <FormControl>
                              <Input className="h-14 px-6 text-lg rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all" placeholder="Masukkan nama lengkap Anda" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-bold text-[#005a78]">Nomor WhatsApp Aktif :</FormLabel>
                            <FormControl>
                              <Input className="h-14 px-6 text-lg rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all" placeholder="Contoh: 081234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <FormLabel className="text-base font-bold text-[#005a78]">Pilih Jenis Layanan</FormLabel>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {['Pendaftaran Peserta', 'Perubahan data', 'Informasi & Pengaduan'].map((type) => (
                            <Button
                              key={type}
                              type="button"
                              variant={form.watch('serviceType') === type ? 'default' : 'outline'}
                              className={`h-auto py-4 px-2 text-xs font-bold rounded-xl border-2 transition-all text-center leading-snug ${
                                form.watch('serviceType') === type 
                                ? 'bg-[#005a78] border-[#005a78] text-white shadow-lg scale-[1.02]' 
                                : 'border-[#005a78] text-[#005a78] hover:bg-slate-50'
                              }`}
                              onClick={() => form.setValue('serviceType', type as any)}
                            >
                              {type}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <Button type="submit" disabled={isSubmitting} className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 rounded-2xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.98] uppercase tracking-widest">
                        {isSubmitting ? 'Memproses...' : 'Ambil Nomor Antrian'}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-2xl border-none rounded-3xl overflow-hidden bg-white animate-in zoom-in duration-500">
              <CardContent className="p-12 text-center space-y-8">
                <div className="bg-emerald-100 p-6 rounded-full w-fit mx-auto">
                  <CheckCircle2 className="w-16 h-16 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-[#005a78]">Nomor Antrian Berhasil Diambil</h2>
                  <p className="text-muted-foreground font-medium">Simpan nomor antrian Anda dan tunggu panggilan petugas.</p>
                </div>
                
                <div className="bg-slate-50 rounded-3xl p-10 space-y-4 border-2 border-dashed border-primary/30">
                  <span className="text-8xl font-black text-primary tracking-tighter block">{finalQueue?.queueNumber}</span>
                  <Badge className="bg-[#005a78] text-white px-6 py-2 text-lg font-bold rounded-full uppercase">
                    {finalQueue?.serviceType}
                  </Badge>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-3">
                  <div className="flex items-center gap-2 justify-center text-primary">
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-bold">Konfirmasi WhatsApp</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Kami akan mengirimkan link Zoom ke nomor <span className="font-black text-[#005a78]">{finalQueue?.whatsapp}</span> saat giliran Anda tiba.
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <Button variant="outline" onClick={() => setStep('form')} className="w-full h-12 rounded-xl font-bold border-2">
                    Kembali ke Halaman Pendaftaran
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-[#005a78] font-headline tracking-tight">Informasi Antrian</h2>
              <p className="text-sm text-muted-foreground font-medium">
                {mounted ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()) : '...'}
              </p>
            </div>
            <Badge variant="outline" className="mb-1 bg-white border-none shadow-sm flex gap-2 py-1.5 px-3">
              <RefreshCcw className="w-3 h-3 text-primary animate-spin" style={{ animationDuration: '3s' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Live Sync</span>
            </Badge>
          </div>

          <div className="space-y-4">
            <Card className="bg-white/40 border-none shadow-md backdrop-blur-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-primary mb-4">
                  <RefreshCcw className="w-5 h-5" />
                  <span className="font-bold text-xs uppercase tracking-[0.2em]">Sedang Diproses (Maks. 3)</span>
                </div>
                <div className="space-y-4">
                  {queueInfo.current.length > 0 ? (
                    queueInfo.current.map((p) => (
                      <div key={p.id} className="flex items-center justify-between border-b border-primary/10 pb-3 last:border-0 last:pb-0">
                        <span className="text-4xl font-black text-[#005a78]">{p.queueNumber}</span>
                        <div className="text-right">
                          <span className="font-bold text-lg block truncate max-w-[200px]">{p.fullName}</span>
                          <Badge variant="outline" className="text-[10px] font-bold uppercase py-0.5">{p.serviceType}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground italic">Belum ada antrian yang sedang diproses.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50 border-none shadow-md overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-emerald-600 mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-xs uppercase tracking-[0.2em]">Terakhir Selesai</span>
                </div>
                {queueInfo.lastFinished ? (
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-emerald-700">{queueInfo.lastFinished.queueNumber}</span>
                    <span className="font-bold text-lg truncate max-w-[200px]">{queueInfo.lastFinished.fullName}</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Belum ada antrian yang selesai hari ini.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total Antrian', value: `${queueInfo.total}`, icon: Users, color: 'text-blue-600' },
              { label: 'Menunggu', value: queueInfo.waiting, icon: Clock, color: 'text-teal-600' },
              { label: 'Selesai', value: queueInfo.served, icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'Absen', value: '0', icon: XCircle, color: 'text-rose-500' },
            ].map((stat, i) => (
              <Card key={i} className="bg-white border-none shadow-md text-center group hover:scale-[1.02] transition-all">
                <CardContent className="p-3 flex flex-col items-center gap-1.5">
                  <div className="bg-slate-50 p-1.5 rounded-lg group-hover:bg-white transition-colors">
                    <stat.icon className={`w-4 h-4 ${stat.color} opacity-70`} />
                  </div>
                  <span className={`text-xl font-black ${stat.color}`}>{stat.value}</span>
                  <span className="text-[8px] leading-tight uppercase font-bold text-muted-foreground tracking-tighter">{stat.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-[2.5rem] max-w-[420px] p-8 border-none shadow-2xl overflow-hidden">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="text-center text-3xl font-black text-[#005a78] tracking-tight">
              Konfirmasi Nomor
            </AlertDialogTitle>
            <AlertDialogDescription asChild className="text-center">
              <div className="space-y-6">
                <p className="text-slate-500 font-medium">Apakah nomor WhatsApp Anda sudah benar?</p>
                
                <div className="py-5 px-4 bg-primary/5 rounded-[2rem] border-2 border-primary/20 flex items-center justify-center gap-3 shadow-inner group transition-all hover:bg-primary/10">
                  <div className="bg-primary/10 p-2 rounded-xl group-hover:scale-110 transition-transform shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-primary tabular-nums break-all">
                    {pendingData?.whatsapp}
                  </span>
                </div>
                
                <div className="text-sm leading-relaxed text-slate-500 px-2">
                  Sangat penting untuk memastikan nomor ini aktif karena <strong className="text-[#005a78]">Link Zoom</strong> layanan akan kami kirimkan ke nomor ini.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-3 mt-8 sm:flex-col sm:space-x-0">
            <AlertDialogAction 
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="w-full h-14 bg-primary hover:bg-primary/90 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98] border-none"
            >
              {isSubmitting ? 'Memproses...' : 'Ya, Sudah Benar'}
            </AlertDialogAction>
            <AlertDialogCancel disabled={isSubmitting} className="w-full h-14 bg-slate-50 hover:bg-slate-100 border-none rounded-2xl font-bold text-slate-500 transition-all hover:text-slate-700">
              Ubah Nomor
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="bg-emerald-500 text-white p-3 text-center text-xs font-bold tracking-widest shadow-inner mt-12">
        VIOLA Virtual Office Layanan Peserta © 2024 - BPJS Kesehatan
      </footer>
      <Toaster />
    </div>
  );
}
