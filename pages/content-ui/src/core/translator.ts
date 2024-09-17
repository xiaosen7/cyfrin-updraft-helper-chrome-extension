import { EdgeSpeechTTS } from '@lobehub/tts';
import Emittery from 'emittery';
import { once } from 'lodash-es';
import { filter, firstValueFrom } from 'rxjs';
import { EAIProcessStatusNames } from '../../abstracts/base';
import { JSONTranslator } from '../../processors/json-translator';
import type { ITranscriberOutput } from '../../processors/transcriber/types';
import type { IUpdraftInputOptions } from './input';
import { UpdraftInput } from './input';

enum EVideoTranslatorEventNames {
  Preparing = 'preparing',
  Processing = 'Processing',
  Preloading = 'Preloading',
  Preloaded = 'Preloaded',
  Timeupdate = 'timeupdate',
  TranscribeUpdate = 'TranscribeUpdate',
  TranslatedChange = 'TranslatedChange',
}

interface EVideoTranslatorEventPayloads {
  [EVideoTranslatorEventNames.Preparing]: number;
  [EVideoTranslatorEventNames.Processing]: undefined;
  [EVideoTranslatorEventNames.Preloading]: number;
  [EVideoTranslatorEventNames.Preloaded]: undefined;
  [EVideoTranslatorEventNames.Timeupdate]: number;
  [EVideoTranslatorEventNames.TranscribeUpdate]: ITranscriberOutput;
  [EVideoTranslatorEventNames.TranslatedChange]: Map<number, string>;
}

export class Translator extends UpdraftInput {
  static Events = EVideoTranslatorEventNames;

  constructor(options: IUpdraftInputOptions) {
    super(options);

    this.#translator = new JSONTranslator({});

    this.#textTrack = this.video.addTextTrack('subtitles', 'Translated', 'chinese');
    this.video.volume = 0;
    this.#textTrack.mode = 'showing';
    this.video.addEventListener('timeupdate', this.#update);
  }

  #update = () => {
    this.#preloadSentences();
    this.#playSentence();
  };

  /**
   * Preload audio for upcoming sentences
   * This helps to ensure smooth playback by preparing audio in advance
   * We'll preload audio for sentences that start within the next 10 seconds
   */
  async #preloadSentences() {
    if (this.#preloading) {
      return;
    }

    this.#preloading = true;
    const { video } = this;
    const { sentences } = this.#transcribeResult;
    const currentTime = video.currentTime;
    // 提前 30 秒请求后面一分钟的数据
    if (currentTime + 30 < this.#lastEnd) {
      this.#preloading = false;
      return;
    }

    const preloadSentences = sentences.filter(
      x => !this.#preloadStarts.has(x.start) && x.start - this.#lastEnd >= 0 && x.start - this.#lastEnd < 60,
    );

    this.#lastEnd = preloadSentences[preloadSentences.length - 1]?.end ?? this.#lastEnd;

    if (!this.#firstPreloaded) {
      this.events.emit(EVideoTranslatorEventNames.Preloading, 0);

      if (preloadSentences.length === 0) {
        this.#firstPreloaded = true;
        this.events.emit(EVideoTranslatorEventNames.Preloaded);
      }
    }

    if (preloadSentences.length === 0) {
      this.#preloading = false;
      return;
    }

    const translated = await firstValueFrom(
      this.#translator
        .process({
          data: preloadSentences,
          srcLang: 'eng_Latn',
          tgtLang: 'zh-CN',
          prompt: this.options.translation.getPrompt(),
        })
        .pipe(filter(x => x.status === EAIProcessStatusNames.COMPLETED)),
    );
    translated.data.forEach(({ start, text }) => {
      this.#startToTranslated.set(start, text);
    });

    this.events.emit(EVideoTranslatorEventNames.TranslatedChange, this.#startToTranslated);

    const promises: Promise<void>[] = [];
    translated.data.forEach(({ start, text, end }) => {
      console.log(`start load audio ${start} ${text}`);
      this.#textTrack?.addCue(new VTTCue(start, end, text));
      const audio = new SentenceAudio(start, end, text);
      this.#audios.set(start, audio);
      promises.push(audio.generateAudio());
    });

    if (!this.#firstPreloaded) {
      const total = promises.length;
      let loaded = 0;
      promises.forEach(p => {
        p.then(() => {
          loaded++;
          const progress = (loaded / total) * 100;
          this.events.emit(EVideoTranslatorEventNames.Preloading, progress);
        }).catch(console.error);
      });
    }

    await Promise.allSettled(promises);
    this.#preloading = false;
  }

  #playSentence() {
    const { video } = this;
    const { sentences } = this.#transcribeResult;
    const currentTime = video.currentTime;
    const currentSentenceIndex = sentences.findIndex(x => x.start <= currentTime && x.end >= currentTime);

    if (currentSentenceIndex >= 0) {
      const currentSentence = sentences[currentSentenceIndex];
      const currentAudio = this.#audios.get(currentSentence.start);
      if (currentAudio && currentAudio.shouldPlay(currentTime)) {
        if (this.#lastPlayedAudio) {
          this.#lastPlayedAudio.pause();
        }
        this.#lastPlayedAudio = currentAudio;
        currentAudio.play();
      }
    }
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
  audio?: HTMLAudioElement;
  constructor(
    private start: number,
    private end: number,
    private text: string,
  ) {}

  #generateAudio = once(async () => {
    this.audio = await textToSpeech(this.text);
    console.log(`generated audio ${this.start} ${this.text}`);

    this.audio.onloadedmetadata = () => {
      if (this.audio!.duration > this.end - this.start) {
        const playbackRate = this.audio!.duration / (this.end - this.start);
        this.audio!.playbackRate = playbackRate;
      }
    };
  });

  generateAudio() {
    return this.#generateAudio();
  }

  shouldPlay(time: number) {
    return time > this.start && time - this.start < 1;
  }

  play() {
    this.audio?.play();
  }

  pause() {
    this.audio?.pause();
  }
}
