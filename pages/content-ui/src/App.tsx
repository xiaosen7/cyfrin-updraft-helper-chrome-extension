import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { UpdraftHelperUI } from './components/learn-english-video';

export default function App() {
  const theme = useStorage(exampleThemeStorage);

  return <UpdraftHelperUI />;
}
