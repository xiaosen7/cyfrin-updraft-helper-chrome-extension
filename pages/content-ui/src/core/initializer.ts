import { M3u8Downloader } from '@/utils/m3u8-to-mp4-downloader';
import { combineVttContent } from '@/utils/vtt-parser';
import Emittery from 'emittery';
import { once } from 'lodash-es';

export enum EUpdraftInitializerEvents {
  Change = 'Change',
  Error = 'Error',
}

interface ELearnEnglishVideo2EventPayloads {
  [EUpdraftInitializerEvents.Change]: {
    description: string;
    video: HTMLVideoElement;
    title: string;
    sentences: any[];
    text: string;
  };
  [EUpdraftInitializerEvents.Error]: Error;
}

export type IUpdraftInitializerListener<T extends EUpdraftInitializerEvents> = (
  args: ELearnEnglishVideo2EventPayloads[T],
) => void;

export class UpdraftInitializer extends Emittery<ELearnEnglishVideo2EventPayloads> {
  static Events = EUpdraftInitializerEvents;
  Events = EUpdraftInitializerEvents;

  #src = '';

  init = once(() => {
    const fetchVideo = () => {
      const hlsVideo = document.getElementsByTagName('hls-video')[0] as unknown as HTMLVideoElement | null;
      const video = hlsVideo?.shadowRoot?.querySelector('video');
      const title = document.querySelector('#lesson-content h2')?.textContent;
      const description = document.querySelector('#lesson-content h2 + p')?.textContent;
      const src = hlsVideo?.getAttribute('src') ?? '';

      if (hlsVideo && src && src !== this.#src && video && title && description) {
        const downloader = new M3u8Downloader({
          contentOrUrl: src,
          tasks: {
            subtitle: {
              selector: s =>
                Object.keys(s.sub1)
                  .filter(x => /chinese|english/i.test(x))
                  .map(x => s.sub1[x]),
            },
          },
        });

        downloader
          .parse()
          .then(transcriptions => {
            this.#src = src;
            const { sentences, text } = combineVttContent(transcriptions['en'], transcriptions['zh-CN']);
            this.emit(EUpdraftInitializerEvents.Change, {
              description,
              video,
              title,
              sentences,
              text,
            });
          })
          .catch(error => {
            this.emit(EUpdraftInitializerEvents.Error, error);
          })
          .finally(() => {
            setTimeout(fetchVideo, 1000);
          });

        return;
      }

      console.log({
        hlsVideo,
        video,
        title,
        description,
        src,
      });

      setTimeout(fetchVideo, 1000);
    };

    fetchVideo();
  });
}
