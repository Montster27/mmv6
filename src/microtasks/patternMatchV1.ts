const SYMBOLS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type PatternMatchRound = {
  sequence: string;
  options: string[];
  correctIndex: number;
};

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomSequence(length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SYMBOLS[randomInt(SYMBOLS.length)];
  }
  return out;
}

function mutateSequence(sequence: string): string {
  const chars = sequence.split("");
  const idx = randomInt(chars.length);
  let next = chars[idx];
  while (next === chars[idx]) {
    next = SYMBOLS[randomInt(SYMBOLS.length)];
  }
  chars[idx] = next;
  return chars.join("");
}

function buildOptions(sequence: string): { options: string[]; correctIndex: number } {
  const optionSet = new Set<string>();
  optionSet.add(sequence);
  while (optionSet.size < 3) {
    optionSet.add(mutateSequence(sequence));
  }
  const options = Array.from(optionSet);
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, correctIndex: options.indexOf(sequence) };
}

export function createPatternMatchRounds(count = 3): PatternMatchRound[] {
  const rounds: PatternMatchRound[] = [];
  for (let i = 0; i < count; i += 1) {
    const length = 6 + randomInt(3);
    const sequence = randomSequence(length);
    const { options, correctIndex } = buildOptions(sequence);
    rounds.push({ sequence, options, correctIndex });
  }
  return rounds;
}
