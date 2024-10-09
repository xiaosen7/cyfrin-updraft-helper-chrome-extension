import { useStorage } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { UpdraftHelperUI } from './components/updraft-helper-ui';

export default function App() {
  const theme = useStorage(exampleThemeStorage);

  return <UpdraftHelperUI />;
}
