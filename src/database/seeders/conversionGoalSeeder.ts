/**
 * Conversion Goal Seeder
 *
 * Creates sample conversion goals for testing and development
 * @module database/seeders/conversionGoalSeeder
 */

import pool from '../../config/database';
import { ConversionGoal, UrlConversionGoal } from '../../interfaces/Conversion';

/**
 * Sample conversion goal names
 */
const SAMPLE_GOAL_NAMES = [
  'Purchase Completion',
  'Form Submission',
  'Newsletter Signup',
  'Free Trial Registration',
  'Account Creation',
  'Demo Request',
  'Content Download',
  'Video View',
  'Product View',
  'Add to Cart',
  'Checkout Initiated',
  'Subscription Purchase',
  'Contact Request',
  'Price Quote Request',
  'Webinar Registration',
];

/**
 * Sample conversion goal descriptions
 */
const SAMPLE_GOAL_DESCRIPTIONS = [
  'Tracks completed purchases through the checkout process',
  'Tracks form submissions for lead generation',
  'Tracks newsletter signups to grow email list',
  'Tracks free trial registrations for potential conversions',
  'Tracks new account creations on the platform',
  'Tracks requests for product demos',
  'Tracks downloads of PDF files, brochures, and whitepapers',
  'Tracks when users watch a video to completion',
  'Tracks detailed product page views',
  'Tracks when users add items to their shopping cart',
  'Tracks when users start the checkout process',
  'Tracks subscription sign-ups and renewals',
  'Tracks contact form submissions for sales team',
  'Tracks requests for custom price quotes',
  'Tracks webinar and event registrations',
];

/**
 * ConversionGoalSeeder class - Responsible for creating sample conversion goals
 */
export class ConversionGoalSeeder {
  private adminUserId: number | null = null;
  private urlIds: number[] = [];
  private totalGoals: number = 10;

  /**
   * Seeds the database with sample conversion goals
   * @returns {Promise<void>}
   * @throws {Error} If there is an error creating the data
   */
  public async seed(): Promise<void> {
    try {
      // First get the admin user ID
      await this.getAdminUserId();

      // Get URL IDs to associate with goals
      await this.getUrlIds();

      console.log(`Creating ${this.totalGoals} sample conversion goals...`);

      const createdGoalIds: number[] = [];

      // Create conversion goals
      for (let i = 0; i < this.totalGoals; i++) {
        const goalData = this.generateRandomGoal(i);
        const goal = await this.insertGoal(goalData);
        createdGoalIds.push(goal.id!);

        if ((i + 1) % 5 === 0) {
          console.log(`Created ${i + 1} conversion goals...`);
        }
      }

      // Associate goals with URLs
      const totalAssociations = Math.min(this.urlIds.length, createdGoalIds.length * 3);
      console.log(`Creating ${totalAssociations} goal-URL associations...`);

      let associationsCreated = 0;
      for (const goalId of createdGoalIds) {
        // Associate each goal with 2-3 random URLs
        const numAssociations = 2 + Math.floor(Math.random() * 2);

        // Shuffle URL IDs to get random ones
        this.shuffleArray(this.urlIds);

        for (let i = 0; i < Math.min(numAssociations, this.urlIds.length); i++) {
          await this.associateGoalWithUrl({
            goal_id: goalId,
            url_id: this.urlIds[i],
          });
          associationsCreated++;
        }
      }

      console.log(
        `Successfully created ${createdGoalIds.length} conversion goals and ${associationsCreated} associations.`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error creating sample conversion goals: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Gets the admin user ID from the database
   * @private
   * @returns {Promise<void>}
   * @throws {Error} If admin user is not found
   */
  private async getAdminUserId(): Promise<void> {
    try {
      const result = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");

      if (result.rows.length === 0) {
        throw new Error('Admin user not found. Please run the admin seeder first.');
      }

      this.adminUserId = result.rows[0].id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error getting admin user ID: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Gets URL IDs from the database
   * @private
   * @returns {Promise<void>}
   */
  private async getUrlIds(): Promise<void> {
    try {
      const result = await pool.query('SELECT id FROM urls');

      if (result.rows.length === 0) {
        throw new Error('No URLs found in the database. Please run the URL seeder first.');
      }

      this.urlIds = result.rows.map(row => row.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error getting URL IDs: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generates a random conversion goal
   * @private
   * @param {number} index - Index to use for selecting name and description
   * @returns {ConversionGoal} A random conversion goal
   */
  private generateRandomGoal(index: number): ConversionGoal {
    const nameIndex = index % SAMPLE_GOAL_NAMES.length;
    const descriptionIndex = index % SAMPLE_GOAL_DESCRIPTIONS.length;

    return {
      user_id: this.adminUserId!,
      name: SAMPLE_GOAL_NAMES[nameIndex],
      description: SAMPLE_GOAL_DESCRIPTIONS[descriptionIndex],
    };
  }

  /**
   * Inserts a conversion goal into the database
   * @private
   * @param {ConversionGoal} goalData - The goal data to insert
   * @returns {Promise<ConversionGoal>} The inserted goal with its ID
   */
  private async insertGoal(goalData: ConversionGoal): Promise<ConversionGoal> {
    try {
      const query = `
        INSERT INTO conversion_goals (
          user_id,
          name,
          description
        ) VALUES ($1, $2, $3)
        RETURNING *
      `;

      const result = await pool.query(query, [
        goalData.user_id,
        goalData.name,
        goalData.description,
      ]);

      return result.rows[0];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error inserting conversion goal: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Associates a goal with a URL
   * @private
   * @param {UrlConversionGoal} associationData - The association data
   * @returns {Promise<UrlConversionGoal>} The created association
   */
  private async associateGoalWithUrl(
    associationData: UrlConversionGoal,
  ): Promise<UrlConversionGoal> {
    try {
      const query = `
        INSERT INTO url_conversion_goals (
          url_id,
          goal_id
        ) VALUES ($1, $2)
        RETURNING *
      `;

      const result = await pool.query(query, [associationData.url_id, associationData.goal_id]);

      return result.rows[0];
    } catch (error) {
      // Skip if the association already exists (unique constraint violation)
      if (error instanceof Error && error.message.includes('duplicate key')) {
        return { url_id: associationData.url_id, goal_id: associationData.goal_id };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error associating goal with URL: ${errorMessage}`);
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
      const goalSeeder = new ConversionGoalSeeder();
      await goalSeeder.seed();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed conversion goal data:', error);
      process.exit(1);
    }
  })();
}
