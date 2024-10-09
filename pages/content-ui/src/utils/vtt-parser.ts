interface ISentence {
  start: number;
  end: number;
  en: string;
  'zh-CN': string;
}

const splitReg = /[.!?。？！]/;
const sentenceIsEndReg = /[.!?。？！]$/;

export function combineVttContent(en: string, zh: string) {
  const sentences = getFlattedSentences(en, zh);
  return combineSentences(sentences);
}

function combineSentences(s: ISentence[]) {
  return s.reduce(
    (ret, cur) => {
      const currentSentence = ret.sentences[ret.sentences.length - 1];
      if (sentenceIsEndReg.test(currentSentence.en)) {
        ret.sentences.push(cur);
      } else {
        currentSentence.en += ' ' + cur.en;
        currentSentence['zh-CN'] += cur['zh-CN'];
        currentSentence.end = cur.end;
      }

      ret.text += cur.en;
      return ret;
    },
    {
      text: '',
      sentences: [
        {
          start: 0,
          end: 0,
          en: '',
          'zh-CN': '',
        },
      ],
    } as {
      text: string;
      sentences: ISentence[];
    },
  );
}

function getFlattedSentences(en: string, zh: string) {
  const enLines = splitLines(en);
  const zhLines = splitLines(zh);

  const sentences: ISentence[] = [];

  let i = 0;

  while (i < enLines.length) {
    const line = enLines[i].trim();
    if (parseInt(line)) {
      const [start, end] = enLines[i + 1].split('-->').map(t => convertTimestampToSeconds(t.trim()));
      const en = enLines[i + 2] ?? '';
      const zh = zhLines[i + 2] ?? '';

      sentences.push(...splitToSentences(en, zh, start, end));

      i += 3;
    } else {
      i++;
    }
  }

  return sentences;
}

function splitToSentences(enText: string, zhText: string, start: number, end: number) {
  if (end === start || enText.length === 0) {
    return [];
  }

  const zhTexts = zhText.split(splitReg);
  const enTexts = enText.split(splitReg);

  const zhIsValid = enTexts.length !== zhTexts.length;

  const sentences: ISentence[] = [];

  let startIndex = 0;

  if (enTexts[enTexts.length - 1] === '') {
    enTexts.pop();
  }

  enTexts.forEach((text, index) => {
    const endCharIndex = startIndex + text.length;
    const textStart = (startIndex / enText.length) * (end - start) + start;
    const textEnd = ((startIndex + text.length + 1) / enText.length) * (end - start) + start;

    sentences.push({
      start: textStart,
      end: textEnd,
      en: (text + (enText[endCharIndex] ?? '')).trim(),
      'zh-CN': zhIsValid ? (zhTexts[index]?.trim() ?? '') : '',
    });

    startIndex += text.length + 1;
  });

  return sentences;
}

function splitLines(content: string) {
  let lines = content.split('\n');
  const startLineIndex = lines.findIndex(x => !!parseInt(x));
  lines = lines.slice(startLineIndex);
  return lines;
}

// Helper function to convert timestamp to seconds
function convertTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':');
  const seconds = parseFloat(parts[2]); // Get seconds
  const minutes = parseFloat(parts[1]) * 60; // Convert minutes to seconds
  const hours = parseFloat(parts[0]) * 3600; // Convert minutes to seconds
  return hours + minutes + seconds; // Total seconds
}
