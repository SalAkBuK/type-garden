// Layout Engine: Word tokenization, font metrics, line wrapping, and token persistence
import { WordToken, CharMetric, DocumentLayout } from './types';
import { BOTANICAL_CONFIG } from './config';
import {
  createBotanicalInstance,
  updateBotanicalInstanceForWord,
  BotanicalLifecycleManager,
} from './botanicalEngine';

export interface MeasureContext {
  measureText: (text: string) => { width: number };
}

// Fallback serif proportional character widths relative to fontSize
const CHAR_WIDTH_RATIOS: Record<string, number> = {
  i: 0.28,
  l: 0.28,
  j: 0.28,
  f: 0.32,
  t: 0.35,
  r: 0.38,
  s: 0.42,
  c: 0.44,
  e: 0.45,
  o: 0.52,
  a: 0.48,
  b: 0.52,
  d: 0.54,
  h: 0.52,
  k: 0.50,
  n: 0.52,
  p: 0.52,
  q: 0.52,
  u: 0.52,
  v: 0.48,
  g: 0.50,
  x: 0.48,
  y: 0.48,
  z: 0.45,
  w: 0.72,
  m: 0.78,
  ' ': 0.30,
  '.': 0.25,
  ',': 0.25,
  ';': 0.25,
  ':': 0.25,
  '!': 0.28,
  '?': 0.45,
  '-': 0.35,
};

export function measureChar(char: string, fontSize: number, ctx?: MeasureContext): number {
  if (ctx) {
    return ctx.measureText(char).width;
  }
  const lower = char.toLowerCase();
  const ratio = CHAR_WIDTH_RATIOS[lower] ?? (char >= 'A' && char <= 'Z' ? 0.65 : 0.48);
  return ratio * fontSize;
}

export class DocumentModel {
  private words: WordToken[] = [];
  public lifecycleManager: BotanicalLifecycleManager;
  public fullText: string = '';
  public cursorIndex: number = 0;

  constructor() {
    this.lifecycleManager = new BotanicalLifecycleManager();
  }

  setText(text: string, cursorIndex: number, measureCtx?: MeasureContext): DocumentLayout {
    this.fullText = text;
    this.cursorIndex = Math.max(0, Math.min(cursorIndex, text.length));
    return this.relayout(measureCtx);
  }

  public relayout(measureCtx?: MeasureContext): DocumentLayout {
    const fontSize = BOTANICAL_CONFIG.baseFontSize;
    const lineHeight = fontSize * BOTANICAL_CONFIG.lineHeightMultiplier;
    const maxLineWidth = BOTANICAL_CONFIG.lineWidth;

    // Tokenize text into words preserving character indices
    interface RawWord {
      text: string;
      startIndex: number;
      endIndex: number;
    }

    const rawWords: RawWord[] = [];
    let currentWordStart = -1;

    for (let i = 0; i <= this.fullText.length; i++) {
      const char = this.fullText[i];
      const isWhitespace = !char || /\s/.test(char);

      if (!isWhitespace) {
        if (currentWordStart === -1) {
          currentWordStart = i;
        }
      } else {
        if (currentWordStart !== -1) {
          rawWords.push({
            text: this.fullText.substring(currentWordStart, i),
            startIndex: currentWordStart,
            endIndex: i,
          });
          currentWordStart = -1;
        }
      }
    }

    // Optimal alignment between old tokens and new raw words (Needleman-Wunsch / LCS)
    const m = this.words.length;
    const n = rawWords.length;

    // DP table for alignment
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    const calcMatchScore = (oldToken: WordToken, raw: RawWord): number => {
      if (oldToken.text === raw.text) return 100;
      // Common prefix (typing mid-word or backspacing)
      let prefix = 0;
      const minLen = Math.min(oldToken.text.length, raw.text.length);
      while (prefix < minLen && oldToken.text[prefix] === raw.text[prefix]) {
        prefix++;
      }
      if (prefix >= 3 || prefix === minLen) {
        return 50 + prefix * 5;
      }
      return 0;
    };

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const score = calcMatchScore(this.words[i - 1], rawWords[j - 1]);
        if (score > 0) {
          dp[i][j] = dp[i - 1][j - 1] + score;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find aligned pairs
    const alignedPairs = new Map<number, number>(); // newWordIndex -> oldWordIndex
    let bi = m;
    let bj = n;
    while (bi > 0 && bj > 0) {
      const score = calcMatchScore(this.words[bi - 1], rawWords[bj - 1]);
      if (score > 0 && dp[bi][bj] === dp[bi - 1][bj - 1] + score) {
        alignedPairs.set(bj - 1, bi - 1);
        bi--;
        bj--;
      } else if (dp[bi - 1][bj] >= dp[bi][bj - 1]) {
        bi--;
      } else {
        bj--;
      }
    }

    const newWordTokens: WordToken[] = [];
    const usedOldTokens = new Set<string>();

    for (let j = 0; j < rawWords.length; j++) {
      const rw = rawWords[j];
      const oldIdx = alignedPairs.get(j);
      let matchedToken: WordToken | undefined = undefined;

      if (oldIdx !== undefined) {
        matchedToken = this.words[oldIdx];
        usedOldTokens.add(matchedToken.id);
        matchedToken.text = rw.text;
        matchedToken.startIndex = rw.startIndex;
        matchedToken.endIndex = rw.endIndex;
      } else {
        // Create new token
        const botanical = createBotanicalInstance(rw.text);
        matchedToken = {
          id: `word-${Date.now()}-${j}-${Math.random().toString(36).substring(2, 6)}`,
          text: rw.text,
          startIndex: rw.startIndex,
          endIndex: rw.endIndex,
          lineIndex: 0,
          x: 0,
          y: 0,
          width: 0,
          height: fontSize,
          charMetrics: [],
          botanicalInstance: botanical,
        };
      }

      // Compute character metrics for this word
      const metrics: CharMetric[] = [];
      let wordWidth = 0;
      for (let c = 0; c < rw.text.length; c++) {
        const char = rw.text[c];
        const w = measureChar(char, fontSize, measureCtx);
        metrics.push({
          char,
          x: wordWidth,
          y: 0,
          width: w,
        });
        wordWidth += w;
      }
      matchedToken.charMetrics = metrics;
      matchedToken.width = wordWidth;
      matchedToken.height = fontSize;

      // Determine if word is currently being typed (cursor is inside or immediately after this word)
      const isWordActive =
        this.cursorIndex >= rw.startIndex && this.cursorIndex <= rw.endIndex;

      // Update botanical instance
      updateBotanicalInstanceForWord(
        matchedToken.botanicalInstance,
        rw.text,
        metrics,
        fontSize,
        isWordActive
      );

      newWordTokens.push(matchedToken);
    }

    // Any previous tokens that were not matched are deleted: initiate retraction!
    for (const oldToken of this.words) {
      if (!usedOldTokens.has(oldToken.id)) {
        this.lifecycleManager.startRetraction(oldToken, 350);
      }
    }

    this.words = newWordTokens;

    // Line wrapping layout pass
    const lines: {
      lineIndex: number;
      words: WordToken[];
      y: number;
      height: number;
      width: number;
    }[] = [];

    let currentLineWords: WordToken[] = [];
    let currentLineWidth = 0;
    let currentLineIndex = 0;
    const spaceWidth = measureChar(' ', fontSize, measureCtx);

    const commitLine = () => {
      const baselineY = (currentLineIndex + 1) * lineHeight;
      let curX = 0;
      for (const wt of currentLineWords) {
        wt.lineIndex = currentLineIndex;
        wt.x = curX;
        wt.y = baselineY;
        curX += wt.width + spaceWidth;
      }
      lines.push({
        lineIndex: currentLineIndex,
        words: [...currentLineWords],
        y: baselineY,
        height: lineHeight,
        width: Math.max(0, curX - spaceWidth),
      });
      currentLineIndex++;
      currentLineWords = [];
      currentLineWidth = 0;
    };

    for (let i = 0; i < this.words.length; i++) {
      const wt = this.words[i];
      const neededWidth = currentLineWidth === 0 ? wt.width : currentLineWidth + spaceWidth + wt.width;

      if (currentLineWords.length > 0 && neededWidth > maxLineWidth) {
        // Line wrap
        commitLine();
      }

      currentLineWords.push(wt);
      currentLineWidth = currentLineWidth === 0 ? wt.width : currentLineWidth + spaceWidth + wt.width;
    }

    // Commit trailing line
    commitLine();

    // Compute cursor position in canvas document space
    let cursorPos = { lineIndex: 0, charIndexInDoc: this.cursorIndex, x: 0, y: lineHeight };

    // Find active word or cursor coordinates
    let foundCursor = false;
    for (const line of lines) {
      for (let w = 0; w < line.words.length; w++) {
        const wt = line.words[w];
        if (this.cursorIndex >= wt.startIndex && this.cursorIndex <= wt.endIndex) {
          // Cursor is in this word
          const offsetInWord = this.cursorIndex - wt.startIndex;
          let cx = wt.x;
          for (let c = 0; c < offsetInWord; c++) {
            cx += wt.charMetrics[c]?.width || 0;
          }
          cursorPos = {
            lineIndex: line.lineIndex,
            charIndexInDoc: this.cursorIndex,
            x: cx,
            y: line.y,
          };
          foundCursor = true;
          break;
        }
      }
      if (foundCursor) break;
    }

    if (!foundCursor && lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      cursorPos = {
        lineIndex: lastLine.lineIndex,
        charIndexInDoc: this.cursorIndex,
        x: lastLine.width,
        y: lastLine.y,
      };
    }

    const totalHeight = lines.length * lineHeight;

    return {
      lines,
      words: this.words,
      totalHeight,
      cursorPos,
    };
  }

  getWords(): WordToken[] {
    return this.words;
  }
}
