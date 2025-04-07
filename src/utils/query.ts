exports.generateQuery = {
  /**
   * DDL
   */
  table: {
    create: (tables: any): string => {
      let query = '';
    
      for (const name in tables) {
        query += `CREATE TABLE IF NOT EXISTS ${name} (\n`;
    
        for (const column in tables[name]) {
          if (column === 'timestamps') {
            query += '\tcreated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n';
            query += '\tupdated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n';
            query += '\tdeleted_at TIMESTAMP,\n';
          } else {
            query += `\t${column} ${tables[name][column]},\n`;
          }
        }
    
        query += ');\n';
      }
    
      return query;
    },

    drop: (tables: any): string => {
      let query = '';
    
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
