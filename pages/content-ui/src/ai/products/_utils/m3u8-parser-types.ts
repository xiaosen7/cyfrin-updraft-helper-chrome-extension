export interface IM3u8ParserManifest {
  allowCache: boolean;
  discontinuityStarts: any[];
  dateRanges: any[];
  iFramePlaylists: any[];
  segments: ISegment[];
  version: number;
  independentSegments: boolean;
  mediaGroups: MediaGroups;
  playlists: Playlist[];
}

interface ISegment {
  duration: number;
  uri: string;
  timeline: number;
}

interface Playlist {
  attributes: Attributes;
  uri: string;
  timeline: number;
}

interface Attributes {
  SUBTITLES: string;
  'CLOSED-CAPTIONS': string;
  RESOLUTION: RESOLUTION;
  CODECS: string;
  'AVERAGE-BANDWIDTH': string;
  BANDWIDTH: number;
}

interface RESOLUTION {
  width: number;
  height: number;
}

interface MediaGroups {
  AUDIO: AUDIO;
  VIDEO: AUDIO;
  'CLOSED-CAPTIONS': AUDIO;
  SUBTITLES: SUBTITLES;
}

interface SUBTITLES {
  [name: string]: Sub;
}

interface Sub {
  [label: string]: SubContent;
}

export interface SubContent {
  default: boolean;
  autoselect: boolean;
  language: string;
  uri: string;
  characteristics: string;
  forced: boolean;
}

interface AUDIO {}
