import { mailer } from '../config/mailer.js';

export const notificationService = {
  async sendFollowUpReminder(userEmail, jobTitle, company) {
    return await mailer.sendMail({
      to: userEmail,
      subject: `Follow-up Reminder: ${jobTitle} at ${company}`,
      html: `<p>Time to check in on your application for <strong>${jobTitle}</strong> at <strong>${company}</strong>.</p>`
    });
  }
};
