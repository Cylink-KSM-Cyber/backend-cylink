/**
 * Impressions Table Seeder
 *
 * Generates random impression data for testing CTR functionality
 * @module database/seeders/impressionsSeeder
 */

import pool from '../../config/database';
import { faker } from '@faker-js/faker';

/**
 * Impressions Seeder class - Responsible for creating sample impression data
 */
export class ImpressionSeeder {
  private totalImpressions: number = 120;
  private sourceOptions: string[] = [
    'google.com',
    'facebook.com',
    'twitter.com',
    'linkedin.com',
    'instagram.com',
    'direct',
    'email',
    'github.com',
    'stackoverflow.com',
    'medium.com',
    'bing.com',
    'duckduckgo.com',
  ];

  private userAgentOptions: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36 OPR/67.0.3575.97',
  ];

  /**
   * Seeds sample impression data to the database
   * @returns {Promise<void>}
   * @throws {Error} If there is an error creating the data
   */
  public async seed(): Promise<void> {
    try {
      console.log(`Creating ${this.totalImpressions} sample impressions...`);

      // Get all URL IDs to properly link impressions
      const urlIds = await this.getUrlIds();

      if (urlIds.length === 0) {
        throw new Error('No URLs found. Please run the URL seeder first.');
      }

      // Generate impressions data
      const impressionsData = this.generateImpressionData(urlIds);

      // Insert impressions data in batches
      for (let i = 0; i < impressionsData.length; i++) {
        await this.insertImpression(impressionsData[i]);

        if ((i + 1) % 20 === 0) {
          console.log(`Created ${i + 1} impressions...`);
        }
      }

      console.log(`Successfully created ${this.totalImpressions} sample impressions.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error creating sample impressions: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Gets all URL IDs from the database
   * @private
   * @returns {Promise<number[]>} Array of URL IDs
   */
  private async getUrlIds(): Promise<number[]> {
    try {
      const result = await pool.query('SELECT id FROM urls');
      return result.rows.map(row => row.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error getting URL IDs: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generates random IP address
   * @private
   * @returns {string} Random IP address
   */
  private generateRandomIp(): string {
    return `${faker.number.int({ min: 1, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}.${faker.number.int({ min: 0, max: 255 })}`;
  }

  /**
   * Generates random impression data
   * @private
   * @param {number[]} urlIds - Array of URL IDs
   * @returns {Array<any>} Array of impression data objects
   */
  private generateImpressionData(urlIds: number[]): any[] {
    const impressionsData = [];

    // Starting date (30 days ago)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < this.totalImpressions; i++) {
      // Randomly select URL ID
      const urlId = urlIds[Math.floor(Math.random() * urlIds.length)];

      // Random timestamp within last 30 days
      const impressionDate = new Date(startDate);
      impressionDate.setDate(impressionDate.getDate() + faker.number.int({ min: 0, max: 30 }));
      impressionDate.setHours(
        faker.number.int({ min: 0, max: 23 }),
        faker.number.int({ min: 0, max: 59 }),
        faker.number.int({ min: 0, max: 59 }),
      );

      // Random source
      const source = this.sourceOptions[Math.floor(Math.random() * this.sourceOptions.length)];

      // Random user agent
      const userAgent =
        this.userAgentOptions[Math.floor(Math.random() * this.userAgentOptions.length)];

      // Random IP address
      const ipAddress = this.generateRandomIp();

      // Random referrer (sometimes null)
      const referrer = faker.datatype.boolean() ? `https://${source}/${faker.lorem.slug()}` : null;

      // Is it a unique impression? (70% chance)
      const isUnique = faker.datatype.boolean(0.7);

      impressionsData.push({
        url_id: urlId,
        timestamp: impressionDate,
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer,
        is_unique: isUnique,
        source: source,
      });
    }

    return impressionsData;
  }

  /**
   * Inserts an impression into the database
   * @private
   * @param {Object} impressionData - The impression data to insert
   * @returns {Promise<void>}
   */
  private async insertImpression(impressionData: any): Promise<void> {
    try {
      const query = `
        INSERT INTO impressions (
          url_id,
          timestamp,
          ip_address,
          user_agent,
          referrer,
          is_unique,
          source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await pool.query(query, [
        impressionData.url_id,
        impressionData.timestamp,
        impressionData.ip_address,
        impressionData.user_agent,
        impressionData.referrer,
        impressionData.is_unique,
        impressionData.source,
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error inserting impression: ${errorMessage}`);
      throw error;
    }
  }
}
