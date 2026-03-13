export type ServiceType = 'Pendaftaran Peserta' | 'Perubahan data' | 'Informasi & Pengaduan';

export type QueueStatus = 'Waiting' | 'Being Served' | 'Finished' | 'Called' | 'called';

export interface Participant {
  id: string;
  fullName: string;
  whatsapp: string;
  serviceType: ServiceType;
  queueNumber: string;
  timestamp: string;
  status: QueueStatus;
  staffName?: string;
  servedBy?: string;
  serveStartTime?: string;
  serveEndTime?: string;
  whatsappSentAt?: string;
  calledAt?: string; 
  finishedAt?: string; 
  finishAt?: string;
}

export interface CounterClerk {
  id: string;
  name: string;
}

export interface SystemSettings {
  dailyQuota: number;
  zoomLink: string;
  clerks: CounterClerk[];
  videoUrl?: string;
  operatingDays: number[]; // 0: Sunday, 1: Monday, ..., 6: Saturday
  startTime: string; // Jam Mulai Pendaftaran
  endTime: string;   // Jam Selesai Pendaftaran
  serviceStartTime: string; // Jam Layanan Dimulai (Display)
  holidays: string[]; // Daftar tanggal libur format "YYYY-MM-DD"
}

export const DEFAULT_ZOOM_LINK = "https://zoom.us/j/viola-virtual-office";
export const DAILY_QUOTA = 20;
export const DEFAULT_OPERATING_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri
export const DEFAULT_START_TIME = "08:00";
export const DEFAULT_END_TIME = "15:00";
export const DEFAULT_SERVICE_START_TIME = "09:00";

export const DEFAULT_CLERKS: CounterClerk[] = [
  { id: '1', name: 'Petugas 1' }
];
