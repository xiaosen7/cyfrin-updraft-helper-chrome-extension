import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

export interface IUpdraftOpenAIOptions {
  apiKey: string;
  baseURL?: string;
}

export enum EUpdraftOpenAIModels {
  GPT_4 = 'gpt-4',
  GPT_4_32K = 'gpt-4-32k',
  GPT_4_0613 = 'gpt-4-0613',
  GPT_4_32K_0613 = 'gpt-4-32k-0613',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  GPT_3_5_TURBO_0613 = 'gpt-3.5-turbo-0613',
  GPT_3_5_TURBO_16K = 'gpt-3.5-turbo-16k',
  GPT_4O_MINI = 'gpt-4o-mini',
}

export class UpdraftOpenAI {
  openAI: OpenAI;
  constructor(options: IUpdraftOpenAIOptions) {
    this.openAI = new OpenAI({
      dangerouslyAllowBrowser: true,
      ...options,
    });
  }

  async translateJSON<T extends object, V extends ZodTypeAny>(
    json: T,
    validation: V,
    model: EUpdraftOpenAIModels = EUpdraftOpenAIModels.GPT_4O_MINI,
  ) {
    const ResponseValidation = z.object({
      translated: validation,
    });

    const completion = await this.openAI.beta.chat.completions.parse({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的英语学习助手，请翻译下面的JSON文件',
        },
        {
          role: 'user',
          content: JSON.stringify(json, null, 2),
        },
      ],
      response_format: zodResponseFormat(ResponseValidation, 'math_reasoning'),
    });

    const parsed = completion.choices[0].message.parsed;
    if (!parsed) {
      throw new Error(`No parsed response`);
    }

    return parsed.translated as T;
  }
}
