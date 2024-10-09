import { useUpdate } from 'ahooks';
import { useEffect } from 'react';

const defaultOptions = {
  size: {
    width: 800,
    height: 300,
  },
  position: {
    x: 0,
    y: 0,
  },
  preDubCount: 5,
  postTranslateCount: 10,
  isMini: false,
  opacity: 1,
  openAI: {
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  tab: 'options',
};

const createStorage = <T>(defaultOptions: T) => {
  const save = (key: string, value: T) => {
    localStorage.setItem(`UpdraftHelper_${key}`, JSON.stringify(value));
  };

  const load = (key: string) => {
    const value = localStorage.getItem(`UpdraftHelper_${key}`);
    if (!value) {
      return defaultOptions[key as keyof T];
    }
    return JSON.parse(value) as T;
  };

  const subs = {
    subs: new Set<() => void>(),
    add(fn: () => void) {
      this.subs.add(fn);
    },
    remove(fn: () => void) {
      this.subs.delete(fn);
    },
    notify() {
      this.subs.forEach(fn => fn());
    },
  };

  return new Proxy(
    {},
    {
      get(target, key) {
        if (key === 'subscribe') {
          return (fn: () => void) => {
            subs.add(fn);
            return () => {
              subs.remove(fn);
            };
          };
        }

        const loaded = load(key as string);

        return loaded;
      },
      set(target, key, value) {
        save(key as string, value);
        subs.notify();
        return true;
      },
    },
  ) as T & {
    subscribe: (fn: () => void) => () => void;
  };
};

export const storage = createStorage(defaultOptions);

export const useStorage = () => {
  const update = useUpdate();

  useEffect(() => {
    return storage.subscribe(update);
  }, [update]);

  return storage;
};
