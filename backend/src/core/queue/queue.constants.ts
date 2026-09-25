export const QUEUE_NAMES = {
  EMAIL: 'simantap_email_queue',
  AUDIT: 'simantap_audit_queue',
  NOTIFICATION: 'simantap_notification_queue',
} as const;

export const JOB_NAMES = {
  SEND_WELCOME_EMAIL: 'send_welcome_email',
  SEND_DEVIASI_ALERT: 'send_deviasi_alert',
  SEND_PASSWORD_RESET: 'send_password_reset',
  PROCESS_AUDIT_LOG: 'process_audit_log',
} as const;
