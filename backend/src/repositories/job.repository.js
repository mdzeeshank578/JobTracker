import { pgPool, readFallbackDb, writeFallbackDb } from '../config/db.js';
import { createJobApplicationEntity } from '../models/JobApplication.js';

export const jobRepository = {
  async findAllByUserId(userId, options = {}) {
    const { status, sortBy = 'appliedDate', order = 'DESC' } = options;
    const safeUserId = userId;

    if (pgPool) {
      try {
        let query = 'SELECT * FROM job_applications WHERE user_id = $1';
        const params = [safeUserId];

        if (status) {
          params.push(status.toUpperCase());
          query += ` AND UPPER(status) = $${params.length}`;
        }

        query += ` ORDER BY date_applied ${order === 'ASC' ? 'ASC' : 'DESC'}, created_at DESC`;
        const res = await pgPool.query(query, params);
        return res.rows.map(createJobApplicationEntity);
      } catch (err) {
        // Fallback for view/legacy table
        try {
          let query = 'SELECT * FROM applications WHERE user_id = $1';
          const params = [safeUserId];
          if (status) {
            params.push(status.toUpperCase());
            query += ` AND UPPER(status) = $${params.length}`;
          }
          query += ` ORDER BY date_applied ${order === 'ASC' ? 'ASC' : 'DESC'}, created_at DESC`;
          const res = await pgPool.query(query, params);
          return res.rows.map(createJobApplicationEntity);
        } catch (e) {}
      }
    }

    const db = readFallbackDb();
    let jobs = (db.applications || [])
      .filter(app => app.user_id === safeUserId || app.userId === safeUserId)
      .map(createJobApplicationEntity);

    if (status) {
      jobs = jobs.filter(j => j.status.toUpperCase() === status.toUpperCase());
    }

    jobs.sort((a, b) => {
      const dateA = new Date(a.appliedDate || a.createdAt);
      const dateB = new Date(b.appliedDate || b.createdAt);
      return order === 'ASC' ? dateA - dateB : dateB - dateA;
    });

    return jobs;
  },

  async findByIdAndUserId(id, userId) {
    const safeUserId = userId;

    if (pgPool) {
      try {
        const res = await pgPool.query(
          'SELECT * FROM job_applications WHERE (id = $1 OR id = $2) AND user_id = $3 LIMIT 1',
          [id, id, safeUserId]
        );
        if (res.rows.length > 0) return createJobApplicationEntity(res.rows[0]);
      } catch (err) {
        try {
          const res = await pgPool.query(
            'SELECT * FROM applications WHERE (id = $1 OR id = $2) AND user_id = $3 LIMIT 1',
            [id, id, safeUserId]
          );
          if (res.rows.length > 0) return createJobApplicationEntity(res.rows[0]);
        } catch (e) {}
      }
    }

    const db = readFallbackDb();
    const found = (db.applications || []).find(
      app => (app.id === id || app._id === id) && (app.user_id === safeUserId || app.userId === safeUserId)
    );
    return found ? createJobApplicationEntity(found) : null;
  },

  async create(jobData) {
    const job = createJobApplicationEntity(jobData);

    if (pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO job_applications (id, user_id, company, role, status, date_applied, deadline, notes, job_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [job._id, job.userId, job.companyName, job.jobTitle, job.status, job.appliedDate, job.deadline || null, job.notes, job.jobUrl, job.createdAt, job.updatedAt]
        );
        return job;
      } catch (err) {
        try {
          await pgPool.query(
            `INSERT INTO applications (id, user_id, company, role, status, date_applied, deadline, notes, job_url, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [job._id, job.userId, job.companyName, job.jobTitle, job.status, job.appliedDate, job.deadline || null, job.notes, job.jobUrl, job.createdAt, job.updatedAt]
          );
          return job;
        } catch (e) {}
      }
    }

    const db = readFallbackDb();
    if (!db.applications) db.applications = [];
    db.applications.unshift({
      _id: job._id,
      id: job._id,
      userId: job.userId,
      user_id: job.userId,
      companyName: job.companyName,
      company: job.companyName,
      jobTitle: job.jobTitle,
      role: job.jobTitle,
      status: job.status,
      jobUrl: job.jobUrl,
      appliedDate: job.appliedDate,
      date_applied: job.appliedDate,
      notes: job.notes,
      createdAt: job.createdAt,
      created_at: job.createdAt,
      updatedAt: job.updatedAt,
      updated_at: job.updatedAt
    });
    writeFallbackDb(db);
    return job;
  },

  async update(id, userId, updates) {
    const safeUserId = userId;

    if (pgPool) {
      try {
        const res = await pgPool.query(
          `UPDATE job_applications 
           SET company = COALESCE($1, company),
               role = COALESCE($2, role),
               status = COALESCE($3, status),
               notes = COALESCE($4, notes),
               job_url = COALESCE($5, job_url),
               updated_at = NOW()
           WHERE (id = $6 OR id = $7) AND user_id = $8 RETURNING *`,
          [updates.companyName || updates.company || null, updates.jobTitle || updates.role || null, updates.status || null, updates.notes || null, updates.jobUrl || null, id, id, safeUserId]
        );
        if (res.rows.length > 0) return createJobApplicationEntity(res.rows[0]);
      } catch (err) {}
    }

    const db = readFallbackDb();
    let updatedJob = null;
    db.applications = (db.applications || []).map(app => {
      if ((app.id === id || app._id === id) && (app.user_id === safeUserId || app.userId === safeUserId)) {
        updatedJob = {
          ...app,
          ...(updates.companyName || updates.company ? { companyName: updates.companyName || updates.company, company: updates.companyName || updates.company } : {}),
          ...(updates.jobTitle || updates.role ? { jobTitle: updates.jobTitle || updates.role, role: updates.jobTitle || updates.role } : {}),
          ...(updates.status ? { status: updates.status.toUpperCase() } : {}),
          ...(updates.jobUrl !== undefined ? { jobUrl: updates.jobUrl, job_url: updates.jobUrl } : {}),
          ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
          updatedAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        return updatedJob;
      }
      return app;
    });

    if (updatedJob) writeFallbackDb(db);
    return updatedJob ? createJobApplicationEntity(updatedJob) : null;
  },

  async delete(id, userId) {
    const safeUserId = userId;

    if (pgPool) {
      try {
        const res = await pgPool.query('DELETE FROM job_applications WHERE (id = $1 OR id = $2) AND user_id = $3', [id, id, safeUserId]);
        return res.rowCount > 0;
      } catch (err) {
        try {
          const res = await pgPool.query('DELETE FROM applications WHERE (id = $1 OR id = $2) AND user_id = $3', [id, id, safeUserId]);
          return res.rowCount > 0;
        } catch (e) {}
      }
    }

    const db = readFallbackDb();
    const initialLength = db.applications.length;
    db.applications = (db.applications || []).filter(
      app => !( (app.id === id || app._id === id) && (app.user_id === safeUserId || app.userId === safeUserId) )
    );
    writeFallbackDb(db);
    return db.applications.length < initialLength;
  }
};
