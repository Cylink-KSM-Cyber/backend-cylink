/**
 * URL Seeder
 *
 * Creates sample URL data for testing and development
 * @module database/seeders/urlSeeder
 */

import pool from '@/config/database';

const { hash } = require('@/utils/crypto');

/**
 * Sample website domains for generating URLs
 */
const SAMPLE_DOMAINS = [
  'example.com',
  'google.com',
  'github.com',
  'stackoverflow.com',
  'youtube.com',
  'twitter.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'medium.com',
  'dev.to',
  'freecodecamp.org',
  'wikipedia.org',
  'reddit.com',
  'amazon.com',
];

/**
 * Sample URL paths for generating URLs
 */
const SAMPLE_PATHS = [
  '/home',
  '/about',
  '/products',
  '/services',
  '/blog',
  '/contact',
  '/pricing',
  '/faq',
  '/terms',
  '/privacy',
  '/news',
  '/events',
  '/gallery',
  '/team',
  '/careers',
];

/**
 * Sample URL titles for generating URLs
 */
const SAMPLE_TITLES = [
  'Home Page',
  'About Us',
  'Our Products',
  'Services Offered',
  'Blog Posts',
  'Contact Information',
  'Pricing Plans',
  'Frequently Asked Questions',
  'Terms and Conditions',
  'Privacy Policy',
  'Latest News',
  'Upcoming Events',
  'Photo Gallery',
  'Our Team',
  'Career Opportunities',
];

/**
 * URL Seeder class - Responsible for creating sample URLs
 */
export class UrlSeeder {
  private totalUrls: number = 100;
  private adminUserId: number = 0;
  private generatedShortCodes: Set<string> = new Set();

  /**
   * Seeds sample URL data to the database
   * @returns {Promise<void>}
   * @throws {Error} If there is an error creating the data
   */
  public async seed(): Promise<void> {
    try {
      // Get admin user ID
      await this.getAdminUserId();

      console.log(`Creating ${this.totalUrls} sample URLs...`);

      // Generate and insert URLs
      for (let i = 0; i < this.totalUrls; i++) {
        const url = this.generateRandomUrl(i);
        await this.insertUrl(url);

        if ((i + 1) % 20 === 0) {
          console.log(`Created ${i + 1} URLs...`);
        }
      }

      console.log(`Successfully created ${this.totalUrls} sample URLs.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error creating sample URLs: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Gets the admin user ID from the database
   * @private
   * @returns {Promise<void>}
   */
  private async getAdminUserId(): Promise<void> {
    try {
      const result = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@cylink.id']);
      if (result.rows.length > 0) {
        this.adminUserId = result.rows[0].id;
      } else {
        throw new Error('Admin user not found. Please run the admin seeder first.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error getting admin user ID: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Generates a random URL data object
   * @private
   * @param {number} index - The index of the URL being generated
   * @returns {Object} Random URL data
   */
  private generateRandomUrl(index: number): any {
    const domain = SAMPLE_DOMAINS[Math.floor(Math.random() * SAMPLE_DOMAINS.length)];
    const path = SAMPLE_PATHS[Math.floor(Math.random() * SAMPLE_PATHS.length)];
    const originalUrl = `https://${domain}${path}`;

    // Generate a unique short code
    let shortCode;
    do {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      shortCode = '';
      for (let i = 0; i < 6; i++) {
        shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.generatedShortCodes.has(shortCode));

    this.generatedShortCodes.add(shortCode);

    // Determine if URL has password (1 in 10 chance)
    const hasPassword = Math.random() < 0.1;

    // Generate expiry date (30% of URLs have an expiry date)
    const hasExpiry = Math.random() < 0.3;
    const expiry = hasExpiry
      ? new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000)
      : null;

    // Random title from array or a generic one
    const title =
      Math.random() < 0.8
        ? SAMPLE_TITLES[Math.floor(Math.random() * SAMPLE_TITLES.length)]
        : `URL ${index + 1}`;

    return {
      user_id: this.adminUserId,
      original_url: originalUrl,
      short_code: shortCode,
      title,
      expiry_date: expiry,
      is_active: Math.random() < 0.9, // 90% are active
      has_password: hasPassword,
      password_hash: hasPassword ? 'password123' : null, // Will be hashed during insertion
      redirect_type: Math.random() < 0.8 ? '302' : '301', // 80% are 302, 20% are 301
    };
  }

  /**
   * Inserts a URL into the database
   * @private
   * @param {Object} urlData - The URL data to insert
   * @returns {Promise<void>}
   */
  private async insertUrl(urlData: any): Promise<void> {
    try {
      // Hash password if present
      if (urlData.has_password && urlData.password_hash) {
        urlData.password_hash = await hash(urlData.password_hash);
      }

      // Insert into database
      const query = `
        INSERT INTO urls (
          user_id, 
          original_url, 
          short_code, 
          title, 
          expiry_date, 
          is_active, 
          has_password, 
          password_hash, 
          redirect_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      const result = await pool.query(query, [
        urlData.user_id,
        urlData.original_url,
        urlData.short_code,
        urlData.title,
        urlData.expiry_date,
        urlData.is_active,
        urlData.has_password,
        urlData.password_hash,
        urlData.redirect_type,
      ]);

      return result.rows[0].id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error inserting URL: ${errorMessage}`);
      throw error;
    }
  }
}

// Allow direct execution of this seeder
if (require.main === module) {
  (async () => {
    try {
      const urlSeeder = new UrlSeeder();
      await urlSeeder.seed();
      process.exit(0);
    } catch (error) {
      console.error('Failed to seed URLs:', error);
      process.exit(1);
    }
  })();
}
