const router = require('express').Router();

const { createQrCode } = require('@/controllers/qrCodeController');
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

module.exports = router;
