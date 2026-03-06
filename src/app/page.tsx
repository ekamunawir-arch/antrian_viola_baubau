"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Users, Phone, FileText, CheckCircle2, Video, AlertCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { addParticipant, getQueueData } from '@/lib/queue-store';
import { ServiceType, ZOOM_LINK, DAILY_QUOTA, Participant } from '@/lib/queue-types';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

const formSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  whatsapp: z.string().regex(/^08[0-9]{8,11}$/, "Format nomor WhatsApp tidak valid (contoh: 081234567890)"),
  serviceType: z.enum(['Pendaftaran Peserta', 'Perubahan data', 'Informasi & Pengaduan']),
});

export default function ParticipantIntake() {
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [tempData, setTempData] = useState<z.infer<typeof formSchema> | null>(null);
  const [finalQueue, setFinalQueue] = useState<Participant | null>(null);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const { participants } = getQueueData();
    if (participants.length >= DAILY_QUOTA) {
      setIsFull(true);
    }
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      whatsapp: '',
      serviceType: 'Pendaftaran Peserta',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setTempData(values);
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (!tempData) return;
    const result = addParticipant(tempData);
    if (result) {
      setFinalQueue(result);
      setStep('success');
      toast({
        title: "Antrian Berhasil Diambil",
        description: "Pesan konfirmasi telah dikirim ke WhatsApp Anda.",
      });
    } else {
      setIsFull(true);
      toast({
        variant: "destructive",
        title: "Gagal Mengambil Antrian",
        description: "Mohon maaf, kuota hari ini sudah penuh.",
      });
    }
  };

  if (isFull && step !== 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-t-4 border-t-destructive">
          <CardContent className="pt-10 pb-10 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-bold font-headline">Kuota Hari Ini Penuh</h1>
            <p className="text-muted-foreground">Mohon maaf, kuota 20 antrian untuk hari ini telah habis. Silakan mencoba kembali besok pagi.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success' && finalQueue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
        <Card className="max-w-md w-full border-t-8 border-t-primary shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold font-headline">Antrian Anda</CardTitle>
            <CardDescription>Simpan nomor antrian Anda untuk layanan Virtual Office</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="bg-primary/5 rounded-2xl py-8 text-center">
              <span className="text-6xl font-black text-primary tracking-tighter block">{finalQueue.queueNumber}</span>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-2 block">{finalQueue.serviceType}</span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                <Users className="w-6 h-6 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Nama Peserta</p>
                  <p className="font-semibold">{finalQueue.fullName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                <Video className="w-6 h-6 text-primary" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs text-muted-foreground font-medium uppercase">Link Layanan Zoom</p>
                  <a href={ZOOM_LINK} target="_blank" className="font-semibold text-primary truncate block hover:underline">
                    {ZOOM_LINK}
                  </a>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground italic">
              "Silakan standby di Zoom sesuai nomor antrian Anda. Pesan notifikasi juga telah dikirim ke WhatsApp: {finalQueue.whatsapp}"
            </p>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black text-primary font-headline tracking-tight">VIOLA</h1>
          <p className="text-muted-foreground font-medium">Virtual Office Layanan Peserta</p>
        </div>

        {step === 'form' ? (
          <Card className="shadow-xl border-none">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-xl">
              <CardTitle className="font-headline">Ambil Antrian Baru</CardTitle>
              <CardDescription className="text-primary-foreground/80">Silakan lengkapi data diri Anda di bawah ini.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Lengkap</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Users className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input className="pl-10" placeholder="Contoh: Budi Santoso" {...field} />
                          </div>
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
                        <FormLabel>Nomor WhatsApp</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input className="pl-10" placeholder="Contoh: 08123456789" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Layanan</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="relative">
                              <FileText className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground hidden sm:block" />
                              <span className="sm:ml-8"><SelectValue placeholder="Pilih Layanan" /></span>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pendaftaran Peserta">Pendaftaran Peserta</SelectItem>
                            <SelectItem value="Perubahan data">Perubahan data</SelectItem>
                            <SelectItem value="Informasi & Pengaduan">Informasi & Pengaduan</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 py-6 text-lg font-bold rounded-xl shadow-lg">
                    Lanjutkan Konfirmasi
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl border-2 border-primary animate-in slide-in-from-right-10 duration-300">
            <CardHeader>
              <CardTitle className="font-headline text-center">Konfirmasi Data</CardTitle>
              <CardDescription className="text-center">Pastikan nomor WhatsApp Anda sudah benar untuk menerima notifikasi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">Nama</span>
                  <span className="font-bold">{tempData?.fullName}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-sm">WhatsApp</span>
                  <span className="font-bold text-primary">{tempData?.whatsapp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Layanan</span>
                  <span className="font-bold">{tempData?.serviceType}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 py-6 rounded-xl" onClick={() => setStep('form')}>Edit Data</Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90 py-6 text-lg font-bold rounded-xl shadow-lg" onClick={handleConfirm}>Ya, Sudah Benar</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Toaster />
    </div>
  );
}