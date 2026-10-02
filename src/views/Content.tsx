import { useStore } from '../lib/store';
import { ArtistView } from './Artist';
import { Home } from './Home';
import { Library } from './Library';
import { Party } from './Party';
import { PlaylistView } from './Playlist';
import { Search } from './Search';
import { Stats } from './Stats';

export function Content() {
  const v = useStore((s) => s.view);
  switch (v.name) {
    case 'home':
      return <Home />;
    case 'search':
      return <Search />;
    case 'library':
      return <Library />;
    case 'party':
      return <Party />;
    case 'stats':
      return <Stats />;
    case 'playlist':
      return <PlaylistView key={v.id} id={v.id} title={v.title} />;
    case 'artist':
      return <ArtistView key={v.id} id={v.id} title={v.title} />;
  }
}
