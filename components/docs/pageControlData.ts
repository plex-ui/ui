/**
 * The Page Control examples' pages, one onboarding of a photo app on React, Vue and React Native: a symbol (an icon's
 * name, each framework draws its own), a title and a line. The example shows the first two to twelve.
 */
export type OnboardingCard = { icon: string; title: string; text: string };

export const ONBOARDING_CARDS: OnboardingCard[] = [
  { icon: 'Images', title: 'All your photos', text: 'Every photo from your devices, in one library.' },
  { icon: 'Search', title: 'Find any photo', text: 'Search by place, date or who is in the photo.' },
  { icon: 'Folders', title: 'Albums', text: 'Keep a trip or an event together in an album.' },
  { icon: 'Users', title: 'Shared albums', text: 'Invite family and friends to add their photos.' },
  { icon: 'Sparkles', title: 'Memories', text: 'A look back at your best moments, every day.' },
  { icon: 'Pencil', title: 'Quick edits', text: 'Crop, straighten and fix the light in a tap.' },
  { icon: 'MapPin', title: 'Places', text: 'See on a map where each photo was taken.' },
  { icon: 'Heart', title: 'Favorites', text: 'Keep the photos you love one tap away.' },
  { icon: 'Video', title: 'Videos too', text: 'Trim a video and share it in full quality.' },
  { icon: 'ShieldCheck', title: 'Backed up', text: 'Your library comes with you to a new phone.' },
  { icon: 'LockKeyHole', title: 'Private by default', text: 'No one sees a photo until you share it.' },
  { icon: 'RemoveTrash', title: 'Recently deleted', text: 'Deleted photos stay for 30 days.' },
];
