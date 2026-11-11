/** The Toast Overview's messages (React and Vue): each type's title, its short description and its action */
export const TOAST_MESSAGES = {
  default: { title: 'Changes saved', description: 'Your profile is live for everyone on the team.', action: 'Undo' },
  success: { title: 'Inquiry ID copied', description: 'Paste it into the support form.', action: 'Open' },
  error: { title: 'Failed to assign owner', description: 'The owner has left the workspace.', action: 'Retry' },
  warning: { title: 'Session expires in 2 minutes', description: 'Unsaved changes will be lost.', action: 'Stay' },
  info: { title: 'New version available', description: 'Reload to get the latest features.', action: 'Reload' },
} as const;

/** A description long enough to wrap */
export const TOAST_LONG_DESCRIPTION = 'This is a long message to show how the toast handles multi-line content without clipping or awkward wrapping. The title and description should both wrap cleanly.';
