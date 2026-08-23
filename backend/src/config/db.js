import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pgPool = null;

if (env.DATABASE_URL) {
  try {
    const pgModule = await import('pg');
    const Pool = pgModule.default?.Pool || pgModule.Pool;
    if (Pool) {
      pgPool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      logger.info('Connected to PostgreSQL Database.');
    }
  } catch (err) {
    logger.warn(`PostgreSQL initialization notice: ${err.message}`);
  }
}

const FALLBACK_DB_PATH = path.join(__dirname, '..', '..', 'data', 'db_fallback.json');

export function initializeFallbackDb() {
  const dir = path.dirname(FALLBACK_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(FALLBACK_DB_PATH)) {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify({
      users: [],
      profiles: [],
      applications: [],
      interviews: [],
      contacts: [],
      documents: [],
      sync_accounts: [],
      sync_logs: []
    }, null, 2), 'utf8');
  }
}

export function readFallbackDb() {
  initializeFallbackDb();
  try {
    const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    return {
      users: Array.isArray(parsed.users) ? parsed.users.filter(Boolean) : [],
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles.filter(p => p && p.user_id) : [],
      applications: Array.isArray(parsed.applications) ? parsed.applications.filter(Boolean) : [],
      interviews: Array.isArray(parsed.interviews) ? parsed.interviews.filter(Boolean) : [],
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts.filter(Boolean) : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents.filter(Boolean) : [],
      sync_accounts: Array.isArray(parsed.sync_accounts) ? parsed.sync_accounts.filter(Boolean) : [],
      sync_logs: Array.isArray(parsed.sync_logs) ? parsed.sync_logs.filter(Boolean) : []
    };
  } catch (e) {
    logger.error('Failed to read fallback database file', { error: e.message });
    return { users: [], profiles: [], applications: [], interviews: [], contacts: [], documents: [], sync_accounts: [], sync_logs: [] };
  }
}

export function writeFallbackDb(data) {
  initializeFallbackDb();
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    logger.error('Failed to write to fallback database file', { error: e.message });
  }
}

export { pgPool };
