/**
 * CyLink Conversion Tracking Script
 *
 * This script can be included on destination websites to easily track conversions
 * from CyLink shortened URLs. Simply include this script and call the trackConversion
 * function when a conversion event occurs.
 */

interface ConversionOptions {
  goalId?: number | null;
  value?: number | null;
  customData?: Record<string, any> | null;
  apiUrl?: string;
  clearAfterConversion?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

interface ConversionData {
  tracking_id: string;
  goal_id?: number;
  conversion_value?: number;
  custom_data?: Record<string, any>;
}

declare global {
  interface Window {
    trackCylinkConversion: (options?: ConversionOptions) => boolean;
  }
}

(function () {
  // Get the CyLink tracking ID from the URL
  function getCylinkTrackingId(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('cyt');
  }

  // Store the tracking ID in local storage to persist across page visits
  function storeTrackingId(): string | null {
    const trackingId = getCylinkTrackingId();
    if (trackingId) {
      localStorage.setItem('cylinkTrackingId', trackingId);
      return trackingId;
    }
    return localStorage.getItem('cylinkTrackingId');
  }

  // Track a conversion with the given goal ID and value
  window.trackCylinkConversion = function (options?: ConversionOptions): boolean {
    // Default options
    const defaults: ConversionOptions = {
      goalId: null,
      value: null,
      customData: null,
      apiUrl: 'https://cylink.id/api/v1/conversions',
    };

    // Merge options with defaults
    const settings = { ...defaults, ...options };

    // Get the tracking ID
    const trackingId = storeTrackingId();
    if (!trackingId) {
      console.warn('CyLink: No tracking ID found');
      return false;
    }

    // Prepare the conversion data
    const data: ConversionData = {
      tracking_id: trackingId,
    };

    // Add optional parameters
    if (settings.goalId) {
      data.goal_id = settings.goalId;
    }

    if (settings.value) {
      data.conversion_value = settings.value;
    }

    if (settings.customData) {
      data.custom_data = settings.customData;
    }

    // Send the conversion data to the API
    fetch(settings.apiUrl || (defaults.apiUrl as string), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to track conversion');
        }
        return response.json();
      })
      .then(result => {
        console.log('CyLink: Conversion tracked successfully', result);
        // Remove the tracking ID after successful conversion
        if (settings.clearAfterConversion) {
          localStorage.removeItem('cylinkTrackingId');
        }
        // Call the success callback if provided
        if (settings.onSuccess && typeof settings.onSuccess === 'function') {
          settings.onSuccess(result);
        }
      })
      .catch(error => {
        console.error('CyLink: Error tracking conversion', error);
        // Call the error callback if provided
        if (settings.onError && typeof settings.onError === 'function') {
          settings.onError(error instanceof Error ? error : new Error(String(error)));
        }
      });

    return true;
  };

  // Handle initial tracking ID
  document.addEventListener('DOMContentLoaded', storeTrackingId);
})();

export {}; // Add empty export to make this a module
