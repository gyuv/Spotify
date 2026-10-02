import type { IconName } from '../components/icons';
import type { View } from '../lib/store';

export const NAV: { name: View['name']; label: string; icon: IconName }[] = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'search', label: 'Search', icon: 'search' },
  { name: 'library', label: 'Library', icon: 'library' },
  { name: 'party', label: 'Party', icon: 'party' },
  { name: 'stats', label: 'Stats', icon: 'stats' },
];
