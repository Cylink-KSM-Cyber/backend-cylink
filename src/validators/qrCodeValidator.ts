/**
 * QR Code Validator
 *
 * Defines validation rules for QR code-related operations
 * @module validators/qrCodeValidator
 */

module.exports = {
  /**
   * Validation rules for creating a QR code
   */
  createQrCode: [
    {
      name: 'url_id',
      type: 'number',
      required: false,
      customValidation: (value: any, body: any) => {
        // Either url_id or short_code must be provided
        if (!value && !body.short_code) {
          return 'Either url_id or short_code is required';
        }
        return null;
      },
    },
    {
      name: 'short_code',
      type: 'string',
      required: false,
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      customValidation: (value: string) => {
        if (value && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Color must be a valid hex code';
        }
        return null;
      },
    },
    {
      name: 'background_color',
      type: 'string',
      required: false,
      customValidation: (value: string) => {
        if (value && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Background color must be a valid hex code';
        }
        return null;
      },
    },
    {
      name: 'include_logo',
      type: 'boolean',
      required: false,
    },
    {
      name: 'logo_size',
      type: 'number',
      required: false,
      customValidation: (value: number) => {
        if (value !== undefined && (value < 0.1 || value > 0.3)) {
          return 'Logo size must be between 0.1 and 0.3';
        }
        return null;
      },
    },
    {
      name: 'size',
      type: 'number',
      required: false,
      customValidation: (value: number) => {
        if (value !== undefined && (value < 100 || value > 1000)) {
          return 'Size must be between 100 and 1000 pixels';
        }
        return null;
      },
    },
  ],

  /**
   * Validation rules for updating a QR code
   */
  updateQrCode: [
    {
      name: 'color',
      type: 'string',
      required: false,
      customValidation: (value: string) => {
        if (value && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Color must be a valid hex code';
        }
        return null;
      },
    },
    {
      name: 'background_color',
      type: 'string',
      required: false,
      customValidation: (value: string) => {
        if (value && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Background color must be a valid hex code';
        }
        return null;
      },
    },
    {
      name: 'include_logo',
      type: 'boolean',
      required: false,
    },
    {
      name: 'logo_size',
      type: 'number',
      required: false,
      customValidation: (value: number) => {
        if (value !== undefined && (value < 0.1 || value > 0.3)) {
          return 'Logo size must be between 0.1 and 0.3';
        }
        return null;
      },
    },
    {
      name: 'size',
      type: 'number',
      required: false,
      customValidation: (value: number) => {
        if (value !== undefined && (value < 100 || value > 1000)) {
          return 'Size must be between 100 and 1000 pixels';
        }
        return null;
      },
    },
  ],

  /**
   * Validation rules for listing QR codes
   */
  listQrCodes: [
    {
      name: 'page',
      type: 'integer',
      required: false,
      customValidation: (value: number) => {
        if (value !== undefined && value < 1) {
          return 'Page must be greater than or equal to 1';
        }
        return null;
      },
    },
    {
      name: 'limit',
      type: 'integer',
      required: false,
      customValidation: (value: number) => {
        if (value !== undefined && (value < 1 || value > 100)) {
          return 'Limit must be between 1 and 100';
        }
        return null;
      },
    },
    {
      name: 'sortBy',
      type: 'string',
      required: false,
      customValidation: (value: string) => {
        if (!value) return null;

        // Normalize the value
        const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');

        // Define valid options including common variations
        const validOptions = [
          'created_at',
          'createdat',
          'created',
          'date',
          'url_id',
          'urlid',
          'url',
          'color',
          'include_logo',
          'includelogo',
          'logo',
          'size',
        ];

        if (!validOptions.includes(normalized)) {
          return `sortBy must be one of: created_at, url_id, color, include_logo, size (received: ${value})`;
        }

        return null;
      },
    },
    {
      name: 'sortOrder',
      type: 'string',
      required: false,
      customValidation: (value: string) => {
        if (!value) return null;

        // Normalize and check
        const normalized = value.toLowerCase().trim();
        if (
          normalized !== 'asc' &&
          normalized !== 'desc' &&
          normalized !== 'ascending' &&
          normalized !== 'descending'
        ) {
          return `sortOrder must be "asc" or "desc" (received: ${value})`;
        }

        return null;
      },
    },
    {
      name: 'search',
      type: 'string',
      required: false,
    },
    {
      name: 'color',
      type: 'string',
      required: false,
      customValidation: (value: string) => {
        if (value && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Color must be a valid hex code';
        }
        return null;
      },
    },
    {
      name: 'includeLogo',
      type: 'string',
      required: false,
      customValidation: (value: string) => {
        if (value !== undefined && value !== 'true' && value !== 'false') {
          return 'includeLogo must be "true" or "false"';
        }
        return null;
      },
    },
    {
      name: 'includeUrl',
      type: 'string',
      required: false,
      customValidation: (value: string) => {
        if (value !== undefined && value !== 'true' && value !== 'false') {
          return 'includeUrl must be "true" or "false"';
        }
        return null;
      },
    },
  ],
};
