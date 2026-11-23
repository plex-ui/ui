/**
 * The Toast Overview's messages (React, Vue and React Native): each type's title, its short description, a long one
 * that wraps to two lines, and its action
 */
export const TOAST_MESSAGES = {
  default: {
    title: 'Changes saved',
    description: 'Your profile is live for everyone on the team.',
    long: 'Your profile is live for everyone on the team. Anna Kim and 3 others will see your new photo and title.',
    action: 'Undo',
  },
  success: {
    title: 'Inquiry ID copied',
    description: 'Paste it into the support form.',
    long: 'Paste it into the support form so we can find your case. We usually reply within one business day.',
    action: 'Open',
  },
  error: {
    title: 'Failed to assign owner',
    description: 'The owner has left the workspace.',
    long: 'Anna Kim has left the workspace. Choose another owner for “Q3 roadmap” or invite her back first.',
    action: 'Retry',
  },
  warning: {
    title: 'Session expires in 2 minutes',
    description: 'Unsaved changes will be lost.',
    long: 'Unsaved changes to “Q3 roadmap” will be lost. Stay signed in to keep editing.',
    action: 'Stay',
  },
  info: {
    title: 'New version available',
    description: 'Reload to get the latest features.',
    long: 'Version 2.4 adds shared folders and faster search. Reload to get the latest features.',
    action: 'Reload',
  },
} as const;
