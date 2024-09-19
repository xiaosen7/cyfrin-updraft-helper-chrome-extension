import { EdgeSpeechTTS } from '@lobehub/tts';
import Emittery from 'emittery';
import { once, throttle } from 'lodash-es';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

export interface ILearnEnglishVideo2Options {
  video: HTMLVideoElement;
  sentences: ISentence[];
  title: string;
  description: string;
  autoPreTranslateSentenceCount?: number;
  autoPreDubSentenceCount?: number;
  text: string;
  openAI: {
    apiKey: string;
  };
}

export interface ISentence {
  start: number;
  end: number;
  en: string;
  'zh-CN': string;
  translated?: string;
  audio?: SentenceAudio;
  cue?: VTTCue;
}

enum ELearnEnglishVideo2EventNames {
  CurrentSentenceChange = 'CurrentSentenceChanged',

  TranslateSentenceChange = 'TranslateSentenceChange',
  TranslateSentencesStart = 'TranslateSentenceStart',
  TranslateSentencesEnd = 'TranslateSentenceEnd',

  DubSentencesStart = 'DubSentenceStart',
  DubSentencesEnd = 'DubSentenceEnd',

  TokenUsageChange = 'TokenUsageChange',
}

interface ELearnEnglishVideo2EventPayloads {
  [ELearnEnglishVideo2EventNames.CurrentSentenceChange]: number;
  /**
   * The index of sentence in the sentences array
   */
  [ELearnEnglishVideo2EventNames.TranslateSentenceChange]: number;
  /**
   * The indices of sentence in the sentences array
   */
  [ELearnEnglishVideo2EventNames.TranslateSentencesStart]: number[];
  /**
   * The indices of sentence in the sentences array
   */
  [ELearnEnglishVideo2EventNames.TranslateSentencesEnd]: number[];
  /**
   * The indices of sentence in the sentences array
   */
  [ELearnEnglishVideo2EventNames.DubSentencesStart]: number[];
  /**
   * The indices of sentence in the sentences array
   */
  [ELearnEnglishVideo2EventNames.DubSentencesEnd]: number[];
  /**
   * The number of tokens used by OpenAI
   */
  [ELearnEnglishVideo2EventNames.TokenUsageChange]: undefined;
}

export class UpdraftHelper extends Emittery<ELearnEnglishVideo2EventPayloads> {
  static Events = ELearnEnglishVideo2EventNames;
  Events = ELearnEnglishVideo2EventNames;

  sentences: ISentence[];

  currentSentence: ISentence | null = null;
  currentSentenceIndex: number = -1;

  lastSentenceIndex = -1;
  lastSentence: ISentence | null = null;

  autoPreTranslateSentenceCount = 0;
  autoPreDubSentenceCount = 0;
  tokenUsed = 0;

  constructor(private options: ILearnEnglishVideo2Options) {
    console.log({ options });
    super();

    this.autoPreDubSentenceCount = options.autoPreDubSentenceCount ?? 0;
    this.autoPreTranslateSentenceCount = options.autoPreTranslateSentenceCount ?? 0;

    this.sentences = options.sentences;

    let enTextTrack: TextTrack;
    let zhTextTrack: TextTrack;
    Array.from(this.options.video.textTracks).forEach(t => {
      t.mode = 'hidden';
      if (t.label === 'English by Updraft Helper') {
        enTextTrack = t;
      } else if (t.label === 'Chinese by Updraft Helper') {
        zhTextTrack = t;
      }
    });

    enTextTrack ??= this.options.video.addTextTrack('subtitles', 'English by Updraft Helper', 'en');
    this.sentences.forEach(sentence => {
      const { start, end, en } = sentence;
      enTextTrack.addCue(new VTTCue(start, end, en));
    });

    zhTextTrack ??= this.options.video.addTextTrack('subtitles', 'Chinese by Updraft Helper', 'zh');
    this.sentences.forEach(sentence => {
      const { start, end, 'zh-CN': zh, translated } = sentence;
      const cue = new VTTCue(start, end, translated || zh || '等待翻译...');
      sentence.cue = cue;
      zhTextTrack.addCue(cue);
    });
    zhTextTrack.mode = 'showing';

    this.#setupListeners();

    this.#updateCurrentSentenceImmediately();
  }

  #onPause = () => {
    this.lastSentence?.audio?.pause();
    this.currentSentence?.audio?.pause();
  };

  #setupListeners = once(() => {
    this.on(this.Events.CurrentSentenceChange, this.#updatePreTranslateSentences);
    this.on(this.Events.CurrentSentenceChange, this.#updatePreDubSentences);
    this.on(this.Events.TranslateSentenceChange, this.#updatePreDubSentences);

    this.options.video.addEventListener('timeupdate', this.#updateCurrentSentence);
    this.options.video.addEventListener('pause', this.#onPause);
    this.options.video.addEventListener('seeked', this.#updateCurrentSentence);
  });

  clearListeners() {
    super.clearListeners();

    this.options.video.removeEventListener('timeupdate', this.#updateCurrentSentence);
    this.options.video.removeEventListener('pause', this.#onPause);
    this.options.video.removeEventListener('seeked', this.#updateCurrentSentence);
  }

  activateSentenceByIndex(index: number) {
    const start = this.sentences[index].start;
    this.options.video.currentTime = start;
    this.emit(ELearnEnglishVideo2EventNames.CurrentSentenceChange, index);
  }

  #updateCurrentSentenceImmediately = () => {
    const currentTime = this.options.video.currentTime;

    for (let index = 0; index < this.sentences.length; index++) {
      const sentence = this.sentences[index];
      if (currentTime >= sentence.start && currentTime < sentence.end) {
        if (this.currentSentenceIndex !== index) {
          this.lastSentence = this.currentSentence;
          this.lastSentenceIndex = this.currentSentenceIndex;

          this.currentSentence = sentence;
          this.currentSentenceIndex = index;

          console.log(`Current sentence changed to ${index}`);
          this.emit(ELearnEnglishVideo2EventNames.CurrentSentenceChange, index);
        }
        break;
      }
    }
  };

  #updateCurrentSentence = throttle(this.#updateCurrentSentenceImmediately);

  #updatePreTranslateSentences = throttle(() => {
    if (this.autoPreTranslateSentenceCount <= 0 || this.currentSentenceIndex < 0) {
      return;
    }

    const startIndex = this.currentSentenceIndex;
    const endIndex = Math.min(startIndex + this.autoPreTranslateSentenceCount * 2, this.sentences.length - 1);
    const indices = Array.from({ length: endIndex - startIndex + 1 }, (_, i) => i + startIndex).filter(index => {
      return !this.sentences[index].translated;
    });

    if (indices.length < this.autoPreTranslateSentenceCount && endIndex + 1 < this.sentences.length) {
      // Optimize: Ensure the number of sentences is enough, so we can save tokens of OpenAI
      return;
    }

    console.log('Pre translate sentence indices', indices);

    this.translateSentences(indices);
  });

  #updatePreDubSentences = throttle(() => {
    if (this.autoPreDubSentenceCount <= 0 || this.currentSentenceIndex < 0) {
      return;
    }

    if (this.currentSentence?.audio && this.currentSentence.audio.shouldPlay(this.options.video.currentTime)) {
      this.lastSentence?.audio?.pause();
      this.currentSentence.audio.play();
    }

    const startIndex = this.currentSentenceIndex;
    const endIndex = Math.min(startIndex + this.autoPreDubSentenceCount * 2, this.sentences.length - 1);

    const indices = Array.from({ length: endIndex - startIndex + 1 }, (_, i) => i + startIndex).filter(index => {
      return (
        !this.sentences[index].audio ||
        this.sentences[index].audio.text !== (this.sentences[index].translated || this.sentences[index]['zh-CN'])
      );
    });

    if (indices.length < this.autoPreDubSentenceCount && endIndex + 1 < this.sentences.length) {
      return;
    }

    console.log('Pre dub sentence indices', indices);
    this.emit(ELearnEnglishVideo2EventNames.DubSentencesStart, indices);
    let finished = 0;
    indices.forEach(index => {
      const sentence = this.sentences[index];
      sentence.audio = new SentenceAudio(sentence.start, sentence.end, sentence.translated || sentence['zh-CN']);
      sentence.audio
        .generateAudio()
        .catch(() => {
          sentence.audio = undefined;
        })
        .finally(() => {
          if (++finished === indices.length) {
            this.emit(ELearnEnglishVideo2EventNames.DubSentencesEnd, indices);
          }
        });
    });
  });

  async translateSentences(indices: number[]) {
    indices = indices.filter(index => !this.sentences[index].translated);
    if (indices.length === 0) {
      return;
    }

    indices.forEach(index => {
      this.sentences[index].translated = 'Translating...';
    });

    this.emit(ELearnEnglishVideo2EventNames.TranslateSentencesStart, indices);

    const apiKey = this.options.openAI.apiKey;
    // const apiUrl = 'https://api.openai.com/v1/chat/completions';

    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const ResponseValidation = z.object({
      translated: z.array(z.string()),
    });

    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的英语学习助手，请翻译用户输入的 JSON 翻译成中文
          context:
            ${this.options.title}
            ${this.options.description}
          `,
        },
        {
          role: 'user',
          content: JSON.stringify(
            indices.map(i => this.sentences[i].en),
            null,
            2,
          ),
        },
      ],
      response_format: zodResponseFormat(ResponseValidation, 'math_reasoning'),
    });

    const parsed = completion.choices[0].message.parsed;

    if (completion.usage?.total_tokens) {
      this.tokenUsed += completion.usage?.total_tokens ?? 0;
      this.emit(ELearnEnglishVideo2EventNames.TokenUsageChange);
    }

    if (!parsed) {
      throw new Error(`No parsed response`);
    }

    const { translated: translatedSentences } = parsed;

    indices.forEach((sentenceIndex, i) => {
      this.sentences[sentenceIndex].translated = translatedSentences[i];
      if (this.sentences[sentenceIndex].cue) {
        this.sentences[sentenceIndex].cue.text = translatedSentences[i];
      }

      this.emit(ELearnEnglishVideo2EventNames.TranslateSentenceChange, sentenceIndex);
    });

    this.emit(ELearnEnglishVideo2EventNames.TranslateSentencesEnd, indices);
  }

  dispose() {
    this.sentences = [];

    this.currentSentence = null;
    this.currentSentenceIndex = -1;

    this.lastSentence = null;
    this.lastSentenceIndex = -1;

    this.clearListeners();
  }
}

const tts = new EdgeSpeechTTS({ locale: 'zh-CN' });
function textToSpeech(text: string) {
  const payload = {
    input: text,
    options: {
      /**
       * zh-CN-YunyangNeural：这是一种男性语音，适合用于多种场景。
zh-CN-YunxiaNeural：对应女性语音，声音自然流畅。
zh-CN-XiaomeiNeural：另一种女性语音，适合用于更柔和的表达。
zh-CN-XiaohuiNeural：也是女性语音，具有不同的音色特征。
       */
      // voice: "zh-CN-XiaoyiNeural",
      // voice: "zh-CN-XiaoxiaoNeural",
      voice: 'zh-CN-YunyangNeural',
    },
  };

  return tts
    .create(payload)
    .then(r => r.arrayBuffer())
    .then(r => {
      return new Audio(URL.createObjectURL(new Blob([r])));
    });
}

class SentenceAudio {
  #audio?: HTMLAudioElement;
  constructor(
    public start: number,
    public end: number,
    public text: string,
  ) {}

  #generateAudio = once(async () => {
    if (!this.text) {
      return;
    }

    this.#audio = await textToSpeech(this.text);
    this.#audio.onloadedmetadata = () => {
      if (this.#audio!.duration > this.end - this.start) {
        const playbackRate = this.#audio!.duration / (this.end - this.start);
        this.#audio!.playbackRate = playbackRate;
      }
    };
  });

  get generated() {
    return !!this.#audio;
  }

  generateAudio() {
    return this.#generateAudio();
  }

  shouldPlay(time: number) {
    return time > this.start && time - this.start < 1;
  }

  play() {
    console.log(`play audio ${this.start} ${this.text}`, this.#audio);
    this.#audio?.play();
  }

  pause() {
    this.#audio?.pause();
  }
}
