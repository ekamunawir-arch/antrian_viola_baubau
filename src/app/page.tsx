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
  LayoutDashboard, 
  Settings,
  Home,
  AlertCircle
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
import { addParticipant, getQueueData } from '@/lib/queue-store';
import { DAILY_QUOTA, Participant } from '@/lib/queue-types';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  whatsapp: z.string().regex(/^08[0-9]{8,11}$/, "Format nomor WhatsApp tidak valid (contoh: 081234567890)"),
  serviceType: z.enum(['Administrasi', 'Informasi', 'Pengaduan']),
});

export default function ParticipantIntake() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [finalQueue, setFinalQueue] = useState<Participant | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [queueInfo, setQueueInfo] = useState({
    total: 0,
    waiting: 0,
    served: 0,
    absent: 0,
    current: null as Participant | null,
    lastFinished: null as Participant | null
  });

  const updateQueueInfo = () => {
    const { participants } = getQueueData();
    setIsFull(participants.length >= DAILY_QUOTA);
    setQueueInfo({
      total: participants.length,
      waiting: participants.filter(p => p.status === 'Waiting').length,
      served: participants.filter(p => p.status === 'Finished').length,
      absent: 0, // Mock for absent
      current: participants.find(p => p.status === 'Being Served') || null,
      lastFinished: [...participants].reverse().find(p => p.status === 'Finished') || null
    });
  };

  useEffect(() => {
    updateQueueInfo();
    const interval = setInterval(updateQueueInfo, 30000); // Auto refresh info every 30s
    return () => clearInterval(interval);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      whatsapp: '',
      serviceType: 'Administrasi',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const result = addParticipant({
      fullName: values.fullName,
      whatsapp: values.whatsapp,
      serviceType: values.serviceType as any
    });

    if (result) {
      setFinalQueue(result);
      setStep('success');
      updateQueueInfo();
      toast({ title: "Berhasil", description: "Nomor antrian Anda telah didaftarkan." });
    } else {
      setIsFull(true);
      toast({ variant: "destructive", title: "Penuh", description: "Kuota antrian hari ini sudah habis." });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bpjs flex flex-col font-body">
      {/* Header Bar */}
      <header className="bg-[#005a78] text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white text-[#005a78] p-1.5 rounded-lg font-black text-xl">Q</div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Sistem Antrian VIOLA</h1>
            <p className="text-[10px] opacity-70 uppercase tracking-widest">Layanan Online</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push('/')} className="bg-sky-900 hover:bg-sky-800 text-white border-none rounded-lg h-10 px-4">
            <Home className="w-4 h-4 mr-2" /> Beranda
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')} className="text-white hover:bg-white/10 rounded-lg h-10">
            <Settings className="w-4 h-4 mr-2" /> Admin
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Queue Information */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#005a78] font-headline">Informasi Antrian Hari Ini</h2>
            <p className="text-muted-foreground font-medium">
              {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
            </p>
            <Badge variant="outline" className="mt-2 bg-white/50 border-none flex w-fit gap-2 py-1.5 px-3">
              <RefreshCcw className="w-3 h-3 text-primary animate-spin-slow" />
              <span className="text-xs">Refresh dalam 30 detik</span>
            </Badge>
          </div>

          <div className="space-y-4">
            <Card className="bg-white/40 border-none shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-primary mb-2">
                  <RefreshCcw className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-wider">Sedang Diproses</span>
                </div>
                {queueInfo.current ? (
                  <div className="flex items-center justify-between">
                    <span className="text-4xl font-black text-[#005a78]">{queueInfo.current.queueNumber}</span>
                    <span className="font-bold text-lg">{queueInfo.current.fullName}</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-sm">Tidak ada antrian yang sedang diproses</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/40 border-none shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-emerald-600 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-wider">Terakhir Selesai Dilayani</span>
                </div>
                {queueInfo.lastFinished ? (
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-emerald-700">{queueInfo.lastFinished.queueNumber}</span>
                    <span className="font-bold">{queueInfo.lastFinished.fullName}</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic text-sm">Belum ada antrian selesai</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total', value: queueInfo.total, icon: Users, color: 'text-blue-600' },
              { label: 'Menunggu', value: queueInfo.waiting, icon: Clock, color: 'text-teal-600' },
              { label: 'Selesai', value: queueInfo.served, icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'Tidak Hadir', value: queueInfo.absent, icon: XCircle, color: 'text-rose-500' },
            ].map((stat, i) => (
              <Card key={i} className="bg-white border-none shadow-sm text-center">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <stat.icon className={`w-5 h-5 ${stat.color} opacity-70`} />
                  <span className={`text-2xl font-black ${stat.color}`}>{stat.value}</span>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">{stat.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Form or Success */}
        <div className="lg:col-span-7">
          {step === 'form' ? (
            <Card className="shadow-2xl border-none rounded-3xl overflow-hidden bg-white">
              <CardHeader className="text-center pt-10 pb-6 space-y-2">
                <CardTitle className="text-4xl font-black text-[#005a78] leading-tight">
                  Selamat Datang di <span className="text-primary">Layanan VIOLA</span>
                </CardTitle>
                <CardDescription className="text-lg font-bold text-primary tracking-widest uppercase">
                  Sistem Antrian Online
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-10">
                {isFull ? (
                  <div className="bg-rose-50 border-2 border-rose-100 rounded-2xl p-8 text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
                    <h3 className="text-2xl font-black text-rose-700">Kuota Hari Ini Penuh</h3>
                    <p className="text-rose-600 font-medium">Mohon maaf, kuota harian telah mencapai batas. Silakan coba lagi besok.</p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-bold text-[#005a78]">Nama :</FormLabel>
                            <FormControl>
                              <Input className="h-14 px-6 text-lg rounded-xl bg-slate-50 border-slate-200" placeholder="Masukkan nama Anda" {...field} />
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
                            <FormLabel className="text-base font-bold text-[#005a78]">Nomor WhatsApp :</FormLabel>
                            <FormControl>
                              <Input className="h-14 px-6 text-lg rounded-xl bg-slate-50 border-slate-200" placeholder="0812XXXXXXXX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4">
                        <FormLabel className="text-base font-bold text-[#005a78]">Jenis <span className="text-primary">Layanan</span></FormLabel>
                        <div className="grid grid-cols-3 gap-3">
                          {['Administrasi', 'Informasi', 'Pengaduan'].map((type) => (
                            <Button
                              key={type}
                              type="button"
                              variant={form.watch('serviceType') === type ? 'default' : 'outline'}
                              className={`h-16 text-base font-bold rounded-xl border-2 transition-all ${
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

                      <Button type="submit" className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all uppercase tracking-widest">
                        Ambil Nomor Antrian
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-2xl border-none rounded-3xl overflow-hidden bg-white animate-in zoom-in duration-300">
              <CardContent className="p-12 text-center space-y-8">
                <div className="bg-emerald-100 p-6 rounded-full w-fit mx-auto">
                  <CheckCircle2 className="w-20 h-20 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-[#005a78]">Nomor Antrian Anda</h2>
                  <p className="text-muted-foreground font-medium">Pendaftaran berhasil, silakan simpan nomor ini.</p>
                </div>
                
                <div className="bg-slate-50 rounded-3xl p-10 space-y-4 border-2 border-dashed border-primary/30">
                  <span className="text-8xl font-black text-primary tracking-tighter block">{finalQueue?.queueNumber}</span>
                  <Badge className="bg-[#005a78] text-white px-6 py-2 text-lg font-bold rounded-full uppercase tracking-widest">
                    {finalQueue?.serviceType}
                  </Badge>
                </div>

                <div className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground italic font-medium">
                    "Mohon bersiap di area tunggu. Panggilan akan dilakukan sesuai urutan nomor."
                  </p>
                  <Button variant="outline" onClick={() => setStep('form')} className="w-full h-14 rounded-xl text-lg font-bold border-2">
                    Ambil Antrian Baru
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer Bar */}
      <footer className="bg-emerald-500 text-white p-4 text-center font-bold tracking-wide shadow-inner">
        Sistem Antrian Layanan VIOLA Virtual Office Online
      </footer>
      <Toaster />
    </div>
  );
}