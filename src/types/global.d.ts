/**
 * Global Type Declarations
 * ========================
 * 
 * Type definitions for global variables used in Next.js
 */

import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../lib/schema';

declare global {
  var _drizzleDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}
