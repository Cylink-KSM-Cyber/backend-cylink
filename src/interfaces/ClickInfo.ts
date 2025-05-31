import { Request } from 'express';

/**
 * Click information interface
 */
export interface ClickInfo {
  ipAddress: string | string[] | undefined;
  userAgent: string | undefined;
  referrer: string | null;
  country: string | null;
  deviceType: string;
  browser: string;
  clickId?: number; // Added for conversion tracking
  trackingId?: string; // Added for conversion tracking
}

export interface ClickTrackingRequest extends Request {
  clickInfo: ClickInfo;
}
