/**
 * Query Utility
 *
 * Provides functions for generating SQL queries
 * @module utils/query
 */

/**
 * Table schema interface
 */
interface TableSchema {
  [columnName: string]: string | boolean | string[];
}

/**
 * Database schema interface
 */
interface DatabaseSchema {
  [tableName: string]: TableSchema;
}

exports.generateQuery = {
  /**
   * DDL (Data Definition Language) queries
   */
  tables: {
    /**
     * Generate a CREATE TABLE query from schema definition
     * @param {DatabaseSchema} tables - Tables schema definition
     * @returns {string} SQL query for creating tables
     */
    create: (tables: DatabaseSchema): string => {
      let query = '';

      // create types
      for (const name in tables) {
        for (const column in tables[name]) {
          const columnType = String(tables[name][column]);

          if (columnType.startsWith('ENUM')) {
            const enumValues = columnType.slice(5, -1);

            query += `CREATE TYPE ${name}_${column} AS ENUM (${enumValues});\n`;

            tables[name][column] = `${name}_${column}`;
          }
        }
      }

      // create tables
      for (const name in tables) {
        query += `CREATE TABLE IF NOT EXISTS ${name} (\n`;

        // Collect standard columns and special constraints separately
        const standardColumns: string[] = [];
        let uniqueConstraints = '';

        // First pass - Categorize columns vs constraints
        for (const column in tables[name]) {
          if (column === 'timestamps') {
            standardColumns.push('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            standardColumns.push('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            standardColumns.push('deleted_at TIMESTAMP');
          } else if (column === 'unique') {
            // Handle unique constraints
            const uniqueColumns = tables[name][column];
            if (Array.isArray(uniqueColumns)) {
              uniqueConstraints = `UNIQUE(${uniqueColumns.join(', ')})`;
            }
          } else {
            standardColumns.push(`${column} ${tables[name][column]}`);
          }
        }

        // Second pass - Build the query
        for (let i = 0; i < standardColumns.length; i++) {
          const isLast = i === standardColumns.length - 1 && !uniqueConstraints;
          query += `\t${standardColumns[i]}${isLast ? '' : ','}\n`;
        }

        // Add unique constraints if any
        if (uniqueConstraints) {
          query += `\t${uniqueConstraints}\n`;
        }

        query += ');\n';
      }

      return query;
    },

    /**
     * Generate a DROP TABLE query from schema definition
     * @param {DatabaseSchema} tables - Tables schema definition
     * @returns {string} SQL query for dropping tables
     */
    drop: (tables: DatabaseSchema): string => {
      let query = '';

      // drop types
      for (const name in tables) {
        for (const column in tables[name]) {
          const columnType = String(tables[name][column]);

          if (columnType.startsWith('ENUM')) {
            query += `DROP TYPE IF EXISTS ${name}_${column};\n`;
          }
        }
      }

      // drop tables
      for (const name in tables) {
        query += `DROP TABLE IF EXISTS ${name};\n`;
      }

      return query;
    },
  },

  /**
   * DML (Data Manipulation Language) queries
   */
  select: () => {},

  insert: () => {},

  update: () => {},

  delete: () => {},
};
