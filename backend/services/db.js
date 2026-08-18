import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('🔌 Connected to Supabase Database successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client, running in local fallback mode:', err.message);
  }
} else {
  console.log('⚠️ Supabase environment variables not set. Running in local JSON database mode.');
}

// Fallback JSON DB configuration
const FALLBACK_DB_PATH = path.join(__dirname, '..', 'data', 'db_fallback.json');

// Initialize fallback JSON file
function initializeFallbackDb() {
  const dir = path.dirname(FALLBACK_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(FALLBACK_DB_PATH)) {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify({
      applications: [],
      sync_accounts: [],
      sync_logs: []
    }, null, 2), 'utf8');
  }
}

// Read fallback DB
function readFallbackDb() {
  initializeFallbackDb();
  try {
    const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read fallback database:', e);
    return { applications: [], sync_accounts: [], sync_logs: [] };
  }
}

// Write fallback DB
function writeFallbackDb(data) {
  initializeFallbackDb();
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write to fallback database:', e);
  }
}

// Database methods
export const dbService = {
  // --- USERS & AUTHENTICATION ---
  async getUserByEmail(email) {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
        if (!error && data) return data;
      } catch (e) {}
    }
    const db = readFallbackDb();
    if (!db.users) db.users = [];
    return db.users.find(u => u.email && u.email.toLowerCase().trim() === cleanEmail) || null;
  },

  async createUser(email, rawPassword, displayName) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const existing = await this.getUserByEmail(cleanEmail);
    if (existing) {
      const err = new Error('An account already exists with this email address.');
      err.code = 'auth/email-already-in-use';
      throw err;
    }
    
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(rawPassword, salt, 1000, 64, 'sha512').toString('hex');
    
    const user = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      displayName: displayName || cleanEmail.split('@')[0],
      salt,
      hash,
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from('users').insert([user]);
      } catch (err) {
        console.warn('Supabase user insert skipped, writing to fallback db:', err.message);
      }
    }

    const db = readFallbackDb();
    if (!db.users) db.users = [];
    db.users.push(user);
    writeFallbackDb(db);
    return {
      uid: user.id,
      email: user.email,
      displayName: user.displayName,
      created_at: user.created_at
    };
  },

  async validateUserPassword(email, rawPassword) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = await this.getUserByEmail(cleanEmail);
    if (!user) return null;
    
    let isValid = false;
    if (user.hash && user.salt) {
      const checkHash = crypto.pbkdf2Sync(rawPassword, user.salt, 1000, 64, 'sha512').toString('hex');
      isValid = (checkHash === user.hash);
    } else if (user.password) {
      isValid = (user.password === rawPassword);
    }

    if (!isValid) return null;

    return {
      uid: user.id || user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0]
    };
  },

  // --- APPLICATIONS ---
  async getApplications(userId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      return db.applications.filter(app => app.user_id === userId);
    }
  },

  async addApplication(userId, appData) {
    const record = {
      user_id: userId,
      company: appData.company,
      role: appData.role,
      status: appData.status || 'Applied',
      date_applied: appData.dateApplied || new Date().toISOString().split('T')[0],
      deadline: appData.deadline || null,
      notes: appData.notes || '',
      job_url: appData.jobUrl || '',
      location: appData.location || '',
      source: appData.source || 'Manual',
      snippet: appData.snippet || ''
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('applications')
        .insert([record])
        .select();
      if (error) throw error;
      return data[0];
    } else {
      const db = readFallbackDb();
      const newRecord = {
        id: crypto.randomUUID(),
        ...record,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.applications.push(newRecord);
      writeFallbackDb(db);
      return newRecord;
    }
  },

  async updateApplication(userId, companyName, roleName, status, updates = {}) {
    if (supabase) {
      const { data, error } = await supabase
        .from('applications')
        .update({ status, ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .ilike('company', companyName)
        .ilike('role', roleName)
        .select();
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      const cleanCompany = companyName.toLowerCase().trim();
      const cleanRole = roleName.toLowerCase().trim();
      let updated = [];

      db.applications = db.applications.map(app => {
        if (app.user_id === userId &&
            app.company.toLowerCase().trim() === cleanCompany &&
            app.role.toLowerCase().trim() === cleanRole) {
          const updatedApp = {
            ...app,
            status,
            ...updates,
            updated_at: new Date().toISOString()
          };
          updated.push(updatedApp);
          return updatedApp;
        }
        return app;
      });

      writeFallbackDb(db);
      return updated;
    }
  },

  // --- SYNC ACCOUNTS ---
  async getSyncAccount(userId, provider, email) {
    if (supabase) {
      const { data, error } = await supabase
        .from('sync_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      return db.sync_accounts.find(
        acc => acc.user_id === userId && acc.provider === provider && acc.email === email
      ) || null;
    }
  },

  async getSyncAccounts(userId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('sync_accounts')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      return db.sync_accounts.filter(acc => acc.user_id === userId);
    }
  },

  async saveSyncAccount(userId, provider, email, tokenData) {
    const record = {
      user_id: userId,
      provider,
      email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expiry_date: tokenData.expiry_date || null
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('sync_accounts')
        .upsert([record], { onConflict: 'user_id,provider,email' })
        .select();
      if (error) throw error;
      return data[0];
    } else {
      const db = readFallbackDb();
      const existingIdx = db.sync_accounts.findIndex(
        acc => acc.user_id === userId && acc.provider === provider && acc.email === email
      );

      const recordWithTimestamps = {
        id: existingIdx >= 0 ? db.sync_accounts[existingIdx].id : crypto.randomUUID(),
        ...record,
        created_at: existingIdx >= 0 ? db.sync_accounts[existingIdx].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        db.sync_accounts[existingIdx] = recordWithTimestamps;
      } else {
        db.sync_accounts.push(recordWithTimestamps);
      }

      writeFallbackDb(db);
      return recordWithTimestamps;
    }
  },

  async deleteSyncAccount(userId, provider, email) {
    if (supabase) {
      const { error } = await supabase
        .from('sync_accounts')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('email', email);
      if (error) throw error;
      return true;
    } else {
      const db = readFallbackDb();
      db.sync_accounts = db.sync_accounts.filter(
        acc => !(acc.user_id === userId && acc.provider === provider && acc.email === email)
      );
      writeFallbackDb(db);
      return true;
    }
  },

  // --- SYNC LOGS ---
  async getSyncLogs(userId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    } else {
      const db = readFallbackDb();
      return db.sync_logs
        .filter(log => log.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);
    }
  },

  async addSyncLog(userId, eventType, status, message, details = {}) {
    const record = {
      user_id: userId,
      event_type: eventType,
      status,
      message,
      details
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('sync_logs')
        .insert([record])
        .select();
      if (error) throw error;
      return data[0];
    } else {
      const db = readFallbackDb();
      const newLog = {
        id: crypto.randomUUID(),
        ...record,
        created_at: new Date().toISOString()
      };
      db.sync_logs.push(newLog);
      writeFallbackDb(db);
      return newLog;
    }
  }
};
