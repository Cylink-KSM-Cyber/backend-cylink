const router = require('express').Router();

const {
  createQrCode,
  getQrCodeById,
  getQrCodeByShortCode,
  updateQrCode,
  downloadQrCodeByIdController,
  downloadQrCodeByShortCodeController,
  getQrCodeColorOptions,
  getQrCodesByUser,
  deleteQrCodeById,
} = require('../controllers/qrCodeController');
const validate = require('../utils/validator');
const qrCodeValidator = require('../validators/qrCodeValidator');
const { accessToken } = require('../middlewares/authMiddleware');

/**
 * QR Code Routes
 *
 * Defines API endpoints for QR code generation and management
 * @module routes/qrCodeRoutes
 */

/**
 * @swagger
 * /api/v1/qr-codes:
 *   get:
 *     summary: Get all QR codes for the authenticated user
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, url_id, color, include_logo, size]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Order of sorting
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter results
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *           format: hex-color
 *         description: Filter by specific color (hex code)
 *       - in: query
 *         name: includeLogo
 *         schema:
 *           type: boolean
 *         description: Filter by whether logo is included
 *       - in: query
 *         name: includeUrl
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Whether to include detailed URL data
 *     responses:
 *       200:
 *         description: Successfully retrieved QR codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: QR codes retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       url_id:
 *                         type: number
 *                       short_code:
 *                         type: string
 *                       short_url:
 *                         type: string
 *                       qr_code_url:
 *                         type: string
 *                       png_url:
 *                         type: string
 *                       svg_url:
 *                         type: string
 *                       color:
 *                         type: string
 *                         format: hex-color
 *                       background_color:
 *                         type: string
 *                         format: hex-color
 *                       include_logo:
 *                         type: boolean
 *                       logo_size:
 *                         type: number
 *                       size:
 *                         type: number
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       url:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           original_url:
 *                             type: string
 *                           title:
 *                             type: string
 *                           clicks:
 *                             type: number
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 28
 *                     page:
 *                       type: number
 *                       example: 1
 *                     limit:
 *                       type: number
 *                       example: 10
 *                     total_pages:
 *                       type: number
 *                       example: 3
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', accessToken, validate({ query: qrCodeValidator.listQrCodes }), getQrCodesByUser);

/**
 * @swagger
 * /api/v1/qr-codes/colors:
 *   get:
 *     summary: Get predefined QR code color options
 *     tags: [QR Codes]
 *     responses:
 *       200:
 *         description: Successfully retrieved color options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Successfully retrieved QR code color options
 *                 data:
 *                   type: object
 *                   properties:
 *                     foreground_colors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           hex:
 *                             type: string
 *                     background_colors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           hex:
 *                             type: string
 *       500:
 *         description: Internal server error
 */
router.get('/colors', getQrCodeColorOptions);

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
router.post('/', validate({ fields: qrCodeValidator.createQrCode }), createQrCode);

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
router.put('/:id', validate({ fields: qrCodeValidator.updateQrCode }), updateQrCode);

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

/**
 * @swagger
 * /api/v1/qr-codes/{id}:
 *   delete:
 *     summary: Delete a QR code (soft delete)
 *     tags: [QR Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The QR code ID
 *     responses:
 *       200:
 *         description: QR code deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: QR code deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                       example: 45
 *                     deleted_at:
 *                       type: string
 *                       format: date-time
 *                       example: 2023-04-18T15:30:00Z
 *       400:
 *         description: Invalid QR code ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You do not have permission to delete this QR code
 *       404:
 *         description: QR code not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', accessToken, deleteQrCodeById);

module.exports = router;
