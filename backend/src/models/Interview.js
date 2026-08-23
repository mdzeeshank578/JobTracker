export function createInterviewEntity(data) {
  return {
    id: data.id || `interview_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    user_id: data.user_id || data.userId,
    job_id: data.job_id || data.jobId,
    round_name: data.round_name || data.roundName || 'General Round',
    scheduled_at: data.scheduled_at || data.scheduledAt || new Date().toISOString(),
    status: data.status || 'Scheduled',
    notes: data.notes || '',
    meeting_link: data.meeting_link || data.meetingLink || '',
    created_at: new Date().toISOString()
  };
}
