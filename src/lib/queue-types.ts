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
  serveStartTime?: string;
  serveEndTime?: string;
  whatsappSentAt?: string;
}

export interface CounterClerk {
  id: string;
  name: string;
}

export interface SystemSettings {
  dailyQuota: number;
  zoomLink: string;
  clerks: CounterClerk[];
}

export const DEFAULT_ZOOM_LINK = "https://zoom.us/j/viola-virtual-office";
export const DAILY_QUOTA = 20;
export const DEFAULT_CLERKS: CounterClerk[] = [
  { id: '1', name: 'Petugas 1' }
];
