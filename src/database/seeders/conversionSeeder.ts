/**
 * Conversion Data Seeder
 *
 * Creates sample conversion analytics data for testing and development
 * @module database/seeders/conversionSeeder
 */

import pool from '../../config/database';
import { Conversion } from '../../interfaces/Conversion';

/**
 * Sample custom data values for conversions
 */
const SAMPLE_CUSTOM_DATA = [
  { product_id: 1, quantity: 1, price: 29.99 },
  { product_id: 2, quantity: 2, price: 19.95 },
  { product_id: 3, quantity: 1, price: 99.0 },
  { product_id: 4, quantity: 3, price: 12.5 },
  { product_id: 5, quantity: 1, price: 149.99 },
  { subscription_plan: 'basic', duration_months: 1 },
  { subscription_plan: 'premium', duration_months: 12 },
  { subscription_plan: 'enterprise', duration_months: 6 },
  { service_id: 1, hours: 2 },
  { service_id: 2, hours: 5 },
  { form_name: 'contact', fields_filled: 6 },
  { form_name: 'registration', fields_filled: 8 },
  { download_id: 'whitepaper-2023', file_size: '2.4MB' },
  { download_id: 'product-catalog', file_size: '5.7MB' },
  { event_name: 'webinar', participants: 1 },
];

/**
 * Sample conversion values
 */
const SAMPLE_CONVERSION_VALUES = [
  0, 0, 9.99, 19.99, 29.99, 39.99, 49.99, 59.99, 69.99, 79.99, 89.99, 99.99, 149.99, 199.99, 299.99,
];

/**
 * ConversionSeeder class - Responsible for creating sample conversion data
 */
export class ConversionSeeder {
  private clickIds: Array<{ id: number; url_id: number; clicked_at: Date }> = [];
  private goalIds: number[] = [];
  private totalConversions: number = 100;

  /**
   * Seeds the database with sample conversion data
   * @returns {Promise<void>}
   * @throws {Error} If there is an error creating the data
   */
  public async seed(): Promise<void> {
    try {
      // Get available click IDs and goal IDs from the database
      await Promise.all([this.getClickIds(), this.getGoalIds()]);

      // Adjust total conversions based on available click data
      this.totalConversions = Math.min(
        Math.floor(this.clickIds.length * 0.4), // Convert ~40% of clicks
        Math.max(70, Math.min(150, this.clickIds.length)), // Between 70-150 conversions
      );

      console.log(`Creating ${this.totalConversions} sample conversions...`);

      // Shuffle click IDs to randomize which clicks get conversions
      this.shuffleArray(this.clickIds);

      // Generate and insert conversion data
      const selectedClicks = this.clickIds.slice(0, this.totalConversions);

      for (let i = 0; i < selectedClicks.length; i++) {
        const conversion = this.generateRandomConversion(selectedClicks[i]);
        await this.insertConversion(conversion);

        if ((i + 1) % 20 === 0) {
          console.log(`Created ${i + 1} conversions...`);
        }
      }

      console.log(`Successfully created ${this.totalConversions} sample conversions.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error creating sample conversions: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Gets click IDs from the database
   * @private
   * @returns {Promise<void>}
   */
  private async getClickIds(): Promise<void> {
    try {
      const result = await pool.query(
        'SELECT id, url_id, clicked_at FROM clicks ORDER BY clicked_at',
      );

      if (result.rows.length === 0) {
        throw new Error('No clicks found in the database. Please run the click seeder first.');
      }

      this.clickIds = result.rows;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error getting click IDs: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Gets goal IDs from the database
   * @private
   * @returns {Promise<void>}
   */
  private async getGoalIds(): Promise<void> {
    try {
      const result = await pool.query('SELECT id FROM conversion_goals');

      if (result.rows.length === 0) {
        console.log('No conversion goals found. Some conversions will not have associated goals.');
      } else {
        this.goalIds = result.rows.map(row => row.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error getting goal IDs: ${errorMessage}`);
      // Don't throw error, just proceed without goals
      this.goalIds = [];
    }
  }

  /**
   * Generates a random conversion record
   * @private
   * @param {Object} clickData - The click data to base the conversion on
   * @returns {Conversion} A random conversion record
   */
  private generateRandomConversion(clickData: {
    id: number;
    url_id: number;
    clicked_at: Date;
  }): Conversion {
    // Convert after 0-60 minutes
    const convertedAt = new Date(clickData.clicked_at);

    // Add a random delay (0-60 minutes)
    convertedAt.setTime(convertedAt.getTime() + Math.floor(Math.random() * 60 * 60 * 1000));

    // Determine if we should include a goal (70% chance if goals exist)
    const includeGoal = this.goalIds.length > 0 && Math.random() < 0.7;
    const goalId = includeGoal
      ? this.goalIds[Math.floor(Math.random() * this.goalIds.length)]
      : undefined;

    // 60% chance to include a conversion value
    const includeValue = Math.random() < 0.6;
    const conversionValue = includeValue
      ? SAMPLE_CONVERSION_VALUES[Math.floor(Math.random() * SAMPLE_CONVERSION_VALUES.length)]
      : undefined;

    // 40% chance to include custom data
    const includeCustomData = Math.random() < 0.4;
    const customData = includeCustomData
      ? SAMPLE_CUSTOM_DATA[Math.floor(Math.random() * SAMPLE_CUSTOM_DATA.length)]
      : undefined;

    return {
      click_id: clickData.id,
      url_id: clickData.url_id,
      goal_id: goalId,
      conversion_value: conversionValue,
      converted_at: convertedAt,
      custom_data: customData,
    };
  }

  /**
   * Inserts a conversion record into the database
   * @private
   * @param {Conversion} conversionData - The conversion data to insert
   * @returns {Promise<void>}
   */
  private async insertConversion(conversionData: Conversion): Promise<void> {
    try {
      const query = `
        INSERT INTO conversions (
          click_id,
          url_id,
          goal_id,
          conversion_value,
          converted_at,
          custom_data
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await pool.query(query, [
        conversionData.click_id,
        conversionData.url_id,
        conversionData.goal_id,
        conversionData.conversion_value,
        conversionData.converted_at,
        conversionData.custom_data ? JSON.stringify(conversionData.custom_data) : null,
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error inserting conversion data: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Shuffles an array in place using Fisher-Yates algorithm
   * @private
   * @param {Array} array - The array to shuffle
   */
  private shuffleArray(array: any[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

// Allow direct execution of this seeder
if (require.main === module) {
  (async () => {
    try {
      const conversionSeeder = new ConversionSeeder();
      await conversionSeeder.seed();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed conversion data:', error);
      process.exit(1);
    }
  })();
}
