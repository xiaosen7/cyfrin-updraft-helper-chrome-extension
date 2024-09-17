import type { UpdraftOpenAI } from './ai';
import type { UpdraftInput } from './input';

export class UpdraftContext {
  openAI: UpdraftOpenAI;
  input: UpdraftInput;

  constructor(openAI: UpdraftOpenAI, input: UpdraftInput) {
    this.openAI = openAI;
    this.input = input;
  }
}
