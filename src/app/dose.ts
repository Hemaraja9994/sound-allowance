/* Weekly sound-allowance maths, extracted from the original app. Equal-energy (3 dB) principle
   scaled to a 40-hour week, with an 80 dB(A) reference for adults and 75 dB(A) for children
   (WHO–ITU safe-listening). Logic kept separate from the sound/UI so it can be tested. */
import raw from "./data.json";

export type Lang = "en" | "kn" | "te" | "hi";
export interface Source { id: string; db: number; en: string; kn: string; te: string; hi: string }
interface Data {
  I18N: Record<Lang, Record<string, string>>; SOURCES: Source[];
  TIPS: Record<Lang, string[]>; SIGNS: Record<Lang, string[]>; CRACKERS: Record<Lang, string[]>;
  REF: { adult: number; child: number }; WEEK_H: number;
}
const data = raw as unknown as Data;
export const { SOURCES, TIPS, SIGNS, CRACKERS, REF, WEEK_H } = data;
export const strings = data.I18N;
export type Mode = "adult" | "child";

export const allowedHours = (level: number, mode: Mode): number => WEEK_H * Math.pow(10, (REF[mode] - level) / 10);
export const fraction = (level: number, minutes: number, mode: Mode): number => (minutes / 60) / allowedHours(level, mode);

const dayStart = (d: Date | string): number => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
export const daysAgo = (iso: string): number => Math.round((dayStart(new Date()) - dayStart(iso)) / 864e5);

export interface LogItem { id: string; date: string; src: string; db: number; min: number }
export const weekLog = (log: LogItem[]): LogItem[] => log.filter(e => daysAgo(e.date) >= 0 && daysAgo(e.date) <= 6);
export const weekFraction = (log: LogItem[], mode: Mode): number => weekLog(log).reduce((s, e) => s + fraction(e.db, e.min, mode), 0);
export const level = (f: number): "ok" | "mid" | "high" => f >= 1 ? "high" : f >= 0.75 ? "mid" : "ok";

export const LADDER = [75, 80, 85, 90, 95, 100, 105, 110];
export const pick = (o: Partial<Record<Lang, string>> | undefined, lang: Lang): string => o ? (o[lang] ?? o.en ?? "") : "";
