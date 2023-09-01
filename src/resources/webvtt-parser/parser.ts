export interface WebVTTCue {
  startTime: number;
  endTime: number;
  text: string[];
}

export function parseWebVTT(text: string): WebVTTCue[] {
  text = text.replace(/(\r\n|\n|\r)/g, '\n');
  text = text.replace('(', '- ');
  text = text.replace(')', ' -');

  // tokenize
  let tokens = text.split('\n');

  // shave off some fat
  const exlusions = ['WEBVTT', ''];
  tokens = tokens.filter((t) => !exlusions.includes(t));

  // create cues
  const cues: WebVTTCue[] = [];
  let currentCue: WebVTTCue | undefined = undefined;
  let consumingCueText = false;
  for (const token of tokens) {
    if (token.includes('-->')) {
      if (currentCue !== undefined) {
        cues.push(currentCue);
      }

      const split = token.split('-->');
      split.forEach((s) => s.trim());
      currentCue = {
        startTime: convertTimeString(split[0]),
        endTime: convertTimeString(split[1]),
        text: [],
      };
      consumingCueText = true;
      continue;
    } else {
      const val = token.replace('- ', '');
      currentCue?.text.push(val);
    }
  }

  if (currentCue !== undefined) {
    cues.push(currentCue);
  }

  return cues;
}

function convertTimeString(timeStr: string): number {
  const split = timeStr.split(':');
  if (split?.length === 3) {
    const hours = Number(split[0]);
    const min = Number(split[1]);
    const sec = Number(split[2]);

    return hours * 3600 + min * 60 + sec;
  } else if (split?.length === 2) {
    const min = Number(split[0]);
    const sec = Number(split[1]);

    return min * 60 + sec;
  }

  return 0;
}
