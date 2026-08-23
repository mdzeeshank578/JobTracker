import { logger } from '../utils/logger.js';

export const mailer = {
  async sendMail({ to, subject, html, text }) {
    logger.info(`[Mailer Transporter] Dispatching email to ${to} with subject "${subject}"`);
    return { success: true, messageId: `msg_${Date.now()}` };
  }
};
