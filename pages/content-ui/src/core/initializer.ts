import { M3u8Downloader } from '@src/ai/products/_utils/m3u8-to-mp4-downloader';
import { combineVttContent } from '@src/ai/products/_utils/vtt-parser';
import Emittery from 'emittery';
import { once } from 'lodash-es';

enum EUpdraftInitializerEventNames {
  Change = 'Change',
  Error = 'Error',
}

interface ELearnEnglishVideo2EventPayloads {
  [EUpdraftInitializerEventNames.Change]: {
    description: string;
    video: HTMLVideoElement;
    title: string;
    sentences: any[];
    text: string;
  };
  [EUpdraftInitializerEventNames.Error]: Error;
}

export class UpdraftInitializer extends Emittery<ELearnEnglishVideo2EventPayloads> {
  static Events = EUpdraftInitializerEventNames;
  Events = EUpdraftInitializerEventNames;

  #src = '';

  init = once(() => {
    const fetchVideo = () => {
      const hlsVideo = document.getElementsByTagName('hls-video')[0] as unknown as HTMLVideoElement | null;
      const video = hlsVideo?.shadowRoot?.querySelector('video');
      const title = document.querySelector('#lesson-content div.flex.flex-col.p-1.pb-3.space-y-2 > h2')?.textContent;
      const description = document.querySelector(
        '#lesson-content div.flex.flex-col.p-1.pb-3.space-y-2 > p',
      )?.textContent;
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
            this.emit(EUpdraftInitializerEventNames.Change, {
              description,
              video,
              title,
              sentences,
              text,
            });
          })
          .catch(error => {
            this.emit(EUpdraftInitializerEventNames.Error, error);
          })
          .finally(() => {
            setTimeout(fetchVideo, 1000);
          });

        return;
      }

      setTimeout(fetchVideo, 1000);
    };

    fetchVideo();
  });
}
