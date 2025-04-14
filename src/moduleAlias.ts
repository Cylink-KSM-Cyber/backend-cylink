/**
 * Module Alias Configuration
 *
 * Configures module-alias to handle path aliases correctly at runtime.
 * This is necessary because TypeScript path aliases are not automatically
 * resolved by Node.js at runtime.
 *
 * @module moduleAlias
 */

import * as path from 'path';
import moduleAlias from 'module-alias';

const isProd = process.env.NODE_ENV === 'production';
const baseDir = path.join(isProd ? '' : '..', isProd ? 'src' : 'dist')

// Register module aliases
moduleAlias.addAliases({
  '@': path.join(__dirname, baseDir),
});

export default moduleAlias;
