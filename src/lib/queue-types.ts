export type ServiceType = 'Pendaftaran Peserta' | 'Perubahan data' | 'Informasi & Pengaduan';

export type QueueStatus = 'Waiting' | 'Being Served' | 'Finished';

export interface Participant {
  id: string;
  fullName: string;
  whatsapp: string;
  serviceType: ServiceType;
  queueNumber: string;
  timestamp: string;
  status: QueueStatus;
  serveStartTime?: string;
  serveEndTime?: string;
}

export const ZOOM_LINK = "https://zoom.us/j/viola-virtual-office";
export const DAILY_QUOTA = 20;