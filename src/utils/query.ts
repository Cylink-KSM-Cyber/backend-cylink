exports.generateQuery = {
  /**
   * DDL
   */
  tables: {
    create: (tables: any): string => {
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

        const columns = Object.keys(tables[name]);
        columns.forEach((column, index) => {
          if (column === 'timestamps') {
            query += '\tcreated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n';
            query += '\tupdated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n';
            query += '\tdeleted_at TIMESTAMP\n';
          } else {
            const columnDefinition = `${column} ${tables[name][column]}`;

            query += `\t${columnDefinition}${index === columns.length - 1 ? '' : ','}\n`;
          }
        });
    
        query += ');\n';
      }
    
      return query;
    },

    drop: (tables: any): string => {
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
    }
  },

  /**
   * DML
   */
  select: () => {},

  insert: () => {},

  update: () => {},

  delete: () => {},
};
