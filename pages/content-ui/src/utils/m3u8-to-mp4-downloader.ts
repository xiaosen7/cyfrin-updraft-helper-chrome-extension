import { Parser as M3u8Parser } from 'm3u8-parser';
import type { IM3u8ParserManifest, SubContent } from './m3u8-parser-types';
import { promisePool } from '.';

interface IM3u8DownloaderOptions {
  contentOrUrl: string;
  tasks: {
    subtitle: {
      selector: (subtitles: IM3u8ParserManifest['mediaGroups']['SUBTITLES']) => SubContent[];
    };
  };
}

export class M3u8Downloader {
  #completedSubtitles: Record<string, string> = {};

  constructor(private options: IM3u8DownloaderOptions) {}

  async parse() {
    const result = await this.#parse(this.options.contentOrUrl);

    if (Object.keys(result.mediaGroups?.SUBTITLES ?? {}).length > 0) {
      const selected = this.options.tasks.subtitle.selector(result.mediaGroups.SUBTITLES);

      await promisePool(
        selected,
        subContent => {
          return fetchContent(subContent.uri)
            .then(this.#parse)
            .then(this.#downloadSubtitle)
            .then(content => {
              this.#completedSubtitles[subContent.language] = content;
            });
        },
        3,
      );
    }

    return this.#completedSubtitles;
  }

  #parse = async (contentOrUrl: string) => {
    const parser = new M3u8Parser();
    const content = await fetchContent(contentOrUrl);
    parser.push(content);

    const manifest = parser.manifest as IM3u8ParserManifest;
    return manifest;
  };

  #downloadSubtitle = async (manifest: IM3u8ParserManifest) => {
    const contents = [] as string[];

    await promisePool(
      manifest.segments,
      async (segment, index) => {
        const content = await fetchContent(segment.uri);
        contents[index] = content;
      },
      8,
    );

    return contents.join('\n');
  };

  fetchContent = fetchContent;
}

async function fetchContent(contentOrUrl: string) {
  if (contentOrUrl.startsWith('http')) {
    return fetch(contentOrUrl).then(res => res.text());
  }

  return contentOrUrl;
}
