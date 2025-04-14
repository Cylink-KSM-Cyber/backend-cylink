/**
 * Click Data Seeder
 *
 * Creates sample click analytics data for testing and development
 * @module database/seeders/clickSeeder
 */

import pool from '@/config/database';

/**
 * Sample IP addresses for generating click data
 */
const SAMPLE_IPS = [
  '192.168.1.1',
  '10.0.0.1',
  '172.16.0.1',
  '127.0.0.1',
  '45.123.45.67',
  '87.65.43.21',
  '203.0.113.1',
  '198.51.100.1',
  '2001:db8::1',
  '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
];

/**
 * Sample user agents for generating click data
 */
const SAMPLE_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/89.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36 Edg/91.0.864.59',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36 OPR/77.0.4054.277',
];

/**
 * Sample referrers for generating click data
 */
const SAMPLE_REFERRERS = [
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://duckduckgo.com/',
  'https://www.yahoo.com/',
  'https://www.facebook.com/',
  'https://twitter.com/',
  'https://www.linkedin.com/',
  'https://www.instagram.com/',
  'https://www.reddit.com/',
  null, // Direct traffic (no referrer)
];

/**
 * Sample countries for generating click data
 */
const SAMPLE_COUNTRIES = [
  'US', // United States
  'GB', // United Kingdom
  'ID', // Indonesia
  'CA', // Canada
  'AU', // Australia
  'DE', // Germany
  'FR', // France
  'JP', // Japan
  'IN', // India
  'BR', // Brazil
  null, // Unknown
];

/**
 * Sample device types for generating click data
 */
const SAMPLE_DEVICE_TYPES = ['desktop', 'mobile', 'tablet', 'unknown'];

/**
 * Sample browsers for generating click data
 */
const SAMPLE_BROWSERS = [
  'Chrome',
  'Firefox',
  'Safari',
  'Edge',
  'Opera',
  'Internet Explorer',
  'Samsung Browser',
  'unknown',
];

/**
 * Click Seeder class - Responsible for creating sample click data
 */
export class ClickSeeder {
  private urlIds: number[] = [];
  private totalClicks: number = 150;

  /**
   * Seeds sample click data to the database
   * @returns {Promise<void>}
   * @throws {Error} If there is an error creating the data
   */
  public async seed(): Promise<void> {
    try {
      // Get all URL IDs
      await this.getUrlIds();

      console.log(`Creating ${this.totalClicks} sample click records...`);

      // Generate and insert click data
      for (let i = 0; i < this.totalClicks; i++) {
        const clickData = this.generateRandomClick();
        await this.insertClick(clickData);

        if ((i + 1) % 25 === 0) {
          console.log(`Created ${i + 1} click records...`);
        }
      }

      console.log(`Successfully created ${this.totalClicks} sample click records.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error creating sample click data: ${errorMessage}`);
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
   * Generates a random click data object
   * @private
   * @returns {Object} Random click data
   */
  private generateRandomClick(): any {
    // Select a random URL ID (some URLs will get more clicks than others)
    // Using a normal-like distribution to simulate real-world patterns
    const urlIndex = Math.min(
      Math.floor(Math.abs(this.normalRandom()) * this.urlIds.length),
      this.urlIds.length - 1,
    );

    // Generate a random date within the last 90 days
    const clickedAt = new Date();
    clickedAt.setDate(clickedAt.getDate() - Math.floor(Math.random() * 90));

    // 20% chance of having null for optional fields to simulate incomplete data
    const includeOptional = Math.random() >= 0.2;

    return {
      url_id: this.urlIds[urlIndex],
      clicked_at: clickedAt,
      ip_address: this.getRandomItem(SAMPLE_IPS),
      user_agent: this.getRandomItem(SAMPLE_USER_AGENTS),
      referrer: includeOptional ? this.getRandomItem(SAMPLE_REFERRERS) : null,
      country: includeOptional ? this.getRandomItem(SAMPLE_COUNTRIES) : null,
      device_type: includeOptional ? this.getRandomItem(SAMPLE_DEVICE_TYPES) : 'unknown',
      browser: includeOptional ? this.getRandomItem(SAMPLE_BROWSERS) : 'unknown',
    };
  }

  /**
   * Inserts a click record into the database
   * @private
   * @param {Object} clickData - The click data to insert
   * @returns {Promise<number>} The ID of the inserted click record
   */
  private async insertClick(clickData: any): Promise<number> {
    try {
      const query = `
        INSERT INTO clicks (
          url_id,
          clicked_at,
          ip_address,
          user_agent,
          referrer,
          country,
          device_type,
          browser
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const result = await pool.query(query, [
        clickData.url_id,
        clickData.clicked_at,
        clickData.ip_address,
        clickData.user_agent,
        clickData.referrer,
        clickData.country,
        clickData.device_type,
        clickData.browser,
      ]);

      return result.rows[0].id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error inserting click data: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Gets a random item from an array
   * @private
   * @param {Array} array - The array to select from
   * @returns {any} A random item from the array
   */
  private getRandomItem(array: any[]): any {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generates a random number with a roughly normal distribution
   * @private
   * @returns {number} A random number from a normal-like distribution
   */
  private normalRandom(): number {
    // Approximation of normal distribution using the central limit theorem
    return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
  }
}

// Allow direct execution of this seeder
if (require.main === module) {
  (async () => {
    try {
      const clickSeeder = new ClickSeeder();
      await clickSeeder.seed();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed click data:', error);
      process.exit(1);
    }
  })();
}
