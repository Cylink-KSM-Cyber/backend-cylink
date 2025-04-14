/**
 * QR Code Seeder
 *
 * Creates sample QR code data for testing and development
 * @module database/seeders/qrCodeSeeder
 */

import pool from '../../config/database';
import { foregroundColors, backgroundColors } from '../../config/qrCodeColors';

/**
 * QR Code Seeder class - Responsible for creating sample QR codes
 */
export class QrCodeSeeder {
  private urlIds: number[] = [];
  private totalQrCodes: number = 0;

  /**
   * Seeds sample QR code data to the database
   * @returns {Promise<void>}
   * @throws {Error} If there is an error creating the data
   */
  public async seed(): Promise<void> {
    try {
      // Get all URL IDs
      await this.getUrlIds();

      // Set the number of QR codes to create (80% of URLs will have a QR code)
      this.totalQrCodes = Math.floor(this.urlIds.length * 0.8);

      console.log(`Creating ${this.totalQrCodes} sample QR codes...`);

      // Shuffle URL IDs to randomize which URLs get QR codes
      this.shuffleArray(this.urlIds);

      // Generate and insert QR codes
      for (let i = 0; i < this.totalQrCodes; i++) {
        const qrCode = this.generateRandomQrCode(i);
        await this.insertQrCode(qrCode);

        if ((i + 1) % 20 === 0) {
          console.log(`Created ${i + 1} QR codes...`);
        }
      }

      console.log(`Successfully created ${this.totalQrCodes} sample QR codes.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error creating sample QR codes: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Gets all URL IDs from the database
   * @private
   * @returns {Promise<void>}
   */
  private async getUrlIds(): Promise<void> {
    try {
      const result = await pool.query('SELECT id FROM urls WHERE is_active = TRUE');
      this.urlIds = result.rows.map(row => row.id);

      if (this.urlIds.length === 0) {
        throw new Error('No active URLs found. Please run the URL seeder first.');
      }

      console.log(`Found ${this.urlIds.length} active URLs.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error getting URL IDs: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generates a random QR code data object
   * @private
   * @param {number} index - The index of the QR code being generated
   * @returns {Object} Random QR code data
   */
  private generateRandomQrCode(index: number): any {
    // Select a foreground color from the predefined list or use default black
    const foregroundColor =
      Math.random() < 0.7
        ? foregroundColors[Math.floor(Math.random() * foregroundColors.length)].hex
        : '#000000';

    // Select a background color from the predefined list or use default white
    const backgroundColor =
      Math.random() < 0.7
        ? backgroundColors[Math.floor(Math.random() * backgroundColors.length)].hex
        : '#FFFFFF';

    // Determine if QR code includes logo (70% include logo)
    const includeLogo = Math.random() < 0.7;

    // Generate random logo size between 0.1 and 0.3
    const logoSize = includeLogo ? (0.1 + Math.random() * 0.2).toFixed(2) : 0.2;

    // Generate random size between 200 and 500
    const size = Math.floor(200 + Math.random() * 300);

    return {
      url_id: this.urlIds[index],
      color: foregroundColor,
      background_color: backgroundColor,
      include_logo: includeLogo,
      logo_size: parseFloat(logoSize.toString()),
      size,
    };
  }

  /**
   * Inserts a QR code into the database
   * @private
   * @param {Object} qrCodeData - The QR code data to insert
   * @returns {Promise<number>} The ID of the inserted QR code
   */
  private async insertQrCode(qrCodeData: any): Promise<number> {
    try {
      const query = `
        INSERT INTO qr_codes (
          url_id,
          color,
          background_color,
          include_logo,
          logo_size,
          size
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const result = await pool.query(query, [
        qrCodeData.url_id,
        qrCodeData.color,
        qrCodeData.background_color,
        qrCodeData.include_logo,
        qrCodeData.logo_size,
        qrCodeData.size,
      ]);

      return result.rows[0].id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error inserting QR code: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Shuffles an array in place
   * @private
   * @param {Array} array - The array to shuffle
   * @returns {Array} The shuffled array
   */
  private shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// Allow direct execution of this seeder
if (require.main === module) {
  (async () => {
    try {
      const qrCodeSeeder = new QrCodeSeeder();
      await qrCodeSeeder.seed();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed QR codes:', error);
      process.exit(1);
    }
  })();
}
