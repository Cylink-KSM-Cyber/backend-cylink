const router = require('express').Router();

const {
  createQrCode,
  getQrCodeById,
  getQrCodeByShortCode,
  updateQrCode,
  downloadQrCodeByIdController,
  downloadQrCodeByShortCodeController,
} = require('@/controllers/qrCodeController');
const { validate } = require('@/middlewares/validator');
const qrCodeValidator = require('@/validators/qrCodeValidator');

/**
 * QR Code Routes
 *
 * Defines API endpoints for QR code generation and management
 * @module routes/qrCodeRoutes
 */

/**
 * @swagger
 * /api/v1/qr-codes:
 *   post:
 *     summary: Generate a QR code for a shortened URL
 *     tags: [QR Codes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url_id:
 *                 type: integer
 *                 description: ID of the shortened URL
 *               short_code:
 *                 type: string
 *                 description: Short code of the URL (alternative to url_id)
 *               color:
 *                 type: string
 *                 description: Foreground color (hex code)
 *                 default: "#000000"
 *               background_color:
 *                 type: string
 *                 description: Background color (hex code)
 *                 default: "#FFFFFF"
 *               include_logo:
 *                 type: boolean
 *                 description: Whether to include the logo
 *                 default: true
 *               logo_size:
 *                 type: number
 *                 description: Logo size as proportion of QR code (0.1-0.3)
 *                 default: 0.2
 *               size:
 *                 type: integer
 *                 description: Size in pixels
 *                 default: 300
 *     responses:
 *       201:
 *         description: QR code generated successfully
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: URL not found
 *       500:
 *         description: Internal server error
 */
router.post('/', validate(qrCodeValidator.createQrCode), createQrCode);

/**
 * @swagger
 * /api/v1/qr-codes/{id}:
 *   put:
 *     summary: Update an existing QR code
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: QR code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               color:
 *                 type: string
 *                 description: Foreground color (hex code)
 *               background_color:
 *                 type: string
 *                 description: Background color (hex code)
 *               include_logo:
 *                 type: boolean
 *                 description: Whether to include the logo
 *               logo_size:
 *                 type: number
 *                 description: Logo size as proportion of QR code (0.1-0.3)
 *               size:
 *                 type: integer
 *                 description: Size in pixels
 *     responses:
 *       200:
 *         description: QR code updated successfully
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', validate(qrCodeValidator.updateQrCode), updateQrCode);

/**
 * @swagger
 * /api/v1/qr-codes/{id}/download:
 *   get:
 *     summary: Download QR code by ID
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: QR code ID
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [png, svg]
 *           default: png
 *         description: Output format
 *       - in: query
 *         name: size
 *         required: false
 *         schema:
 *           type: integer
 *         description: Custom size in pixels
 *     responses:
 *       200:
 *         description: QR code file
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/svg+xml:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/download', downloadQrCodeByIdController);

/**
 * @swagger
 * /api/v1/qr-codes/code/{shortCode}/download:
 *   get:
 *     summary: Download QR code by short code
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Short code of the URL
 *       - in: query
 *         name: format
 *         required: false
 *         schema:
 *           type: string
 *           enum: [png, svg]
 *           default: png
 *         description: Output format
 *       - in: query
 *         name: size
 *         required: false
 *         schema:
 *           type: integer
 *         description: Custom size in pixels
 *     responses:
 *       200:
 *         description: QR code file
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/svg+xml:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Internal server error
 */
router.get('/code/:shortCode/download', downloadQrCodeByShortCodeController);

/**
 * @swagger
 * /api/v1/qr-codes/code/{shortCode}:
 *   get:
 *     summary: Get a QR code by short code
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Short code of the URL
 *     responses:
 *       200:
 *         description: QR code retrieved successfully
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Internal server error
 */
router.get('/code/:shortCode', getQrCodeByShortCode);

/**
 * @swagger
 * /api/v1/qr-codes/{id}:
 *   get:
 *     summary: Get a QR code by its ID
 *     tags: [QR Codes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: QR code ID
 *     responses:
 *       200:
 *         description: QR code retrieved successfully
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getQrCodeById);

module.exports = router;
