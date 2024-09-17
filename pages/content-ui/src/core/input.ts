interface ISentence {
  start: number;
  end: number;
  en: string;
  'zh-CN': string;
}

export interface IUpdraftInputOptions {
  video: HTMLVideoElement;
  text: string;
  sentences: ISentence[];
}

export class UpdraftInput {
  public video: HTMLVideoElement;
  public text: string;
  public sentences: ISentence[];

  constructor(options: IUpdraftInputOptions) {
    const { video, text, sentences } = options;

    this.video = video;
    this.text = text;
    this.sentences = sentences;
  }
}
