/* Sound Allowance: log loud-sound exposure (everyday sources, with a custom level option), see how
   much of the weekly safe allowance it uses on a gauge, read a "sound ladder", and safety notes on
   earphones, warning signs and firecrackers. Adult/child modes. Four languages. On-device. */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Ear, ListPlus, Sparkles } from "lucide-react";
import { AppShell, type Section } from "@/shell/AppShell";
import { Button, Callout, Empty, Field, Input, Panel, ResponsiveTable, Segmented, Select, cx } from "@/shell/ui";
import { usePersistent } from "@/shell/storage";
import { toast } from "@/shell/toast";
import { downloadCSV, todayISO, uid } from "@/shell/lib";
import { CRACKERS, LADDER, SIGNS, SOURCES, TIPS, allowedHours, daysAgo, fraction, level, pick, weekFraction, type Lang, type LogItem, type Mode } from "./dose";

export default function App() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const [tab, setTab] = useState("home");
  const [mode, setMode] = usePersistent<Mode>("sound-allowance-mode", "adult");
  const [log, setLog] = usePersistent<LogItem[]>("sound-allowance-log", []);
  const [srcId, setSrcId] = useState(SOURCES[0].id);
  const [customDb, setCustomDb] = useState("95");
  const [mins, setMins] = useState("30");
  const [when, setWhen] = useState("0");
  const [err, setErr] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const wf = useMemo(() => weekFraction(log, mode), [log, mode]);
  const pct = Math.round(wf * 100);
  const tone = level(wf);
  const curSrc = SOURCES.find(s => s.id === srcId);
  const curDb = srcId === "custom" ? Number(customDb) : curSrc?.db ?? 80;

  const sections: Section[] = [{ id: "home", label: "This week", icon: Ear }, { id: "add", label: t("add"), icon: ListPlus }, { id: "ladder", label: "Ladder", icon: Sparkles }, { id: "safety", label: "Safety", icon: AlertTriangle }];
  const go = (id: string) => { setTab(id); window.scrollTo({ top: 0 }); };

  const durTxt = (h: number): string => {
    if (h >= 1) { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return mm ? `${hh} ${t("h")} ${mm} ${t("min")}` : `${hh} ${t("h")}`; }
    const m = h * 60; if (m >= 1) return `${Math.round(m)} ${t("min")}`;
    return `${Math.max(1, Math.round(m * 60))} ${t("sec")}`;
  };
  const whenDate = (offset: number) => { const d = new Date(); d.setDate(d.getDate() - offset); return d.toISOString().slice(0, 10); };

  const add = () => {
    const mn = Number(mins);
    if (!(mn > 0 && mn <= 960)) { setErr(t("errMins")); return; }
    if (srcId === "custom" && !(curDb >= 40 && curDb <= 140)) { setErr(t("errDb")); return; }
    setErr("");
    setLog(l => [...l, { id: uid(), date: whenDate(Number(when)), src: srcId, db: curDb, min: mn }]);
    toast(t("added")); go("home");
  };
  const del = (id: string) => { setLog(l => l.filter(x => x.id !== id)); toast(t("deleted")); };
  const clear = () => { if (!confirmClear) { setConfirmClear(true); return; } setLog(() => []); setConfirmClear(false); toast(t("cleared")); };
  const srcName = (e: LogItem) => e.src === "custom" ? `${t("custom")} (${e.db} dBA)` : pick(SOURCES.find(s => s.id === e.src), lang) || e.src;
  const csv = () => downloadCSV([[t("colDay"), t("colSound"), t("colLevel"), t("colMin"), mode, t("colUse")], ...log.map(e => [e.date, e.src === "custom" ? "custom" : (SOURCES.find(s => s.id === e.src)?.en ?? ""), e.db, e.min, mode, (fraction(e.db, e.min, mode) * 100).toFixed(1)])], `sound-allowance-${todayISO()}.csv`);

  const dayLabel = (iso: string) => { const d = daysAgo(iso); return d === 0 ? t("today") : d === 1 ? t("yesterday") : t("daysAgo").replace("{n}", String(d)); };
  const gaugeColor = tone === "high" ? "var(--color-high)" : tone === "mid" ? "var(--color-mid)" : "var(--color-ok)";
  const C = 2 * Math.PI * 52, shown = Math.min(wf, 1);

  return (
    <AppShell title={t("appName")} subtitle={t("appSub")} sections={sections} active={tab} onSection={go}
      footer={<><p className="m-0">{t("disclaimer")}</p><p className="m-0">{t("reviewNote")}</p>
        <p className="m-0">{t("builtBy")}: Hemaraja Nayaka S, Department of Audiology & Speech-Language Pathology, Yenepoya Medical College Hospital, Mangaluru.</p></>}>
      <div className="mx-auto grid grid-cols-1 max-w-2xl gap-5">
        <div><Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: "adult", label: t("modeAdult") }, { value: "child", label: t("modeChild") }]} /></div>
        <Callout tone="info">{mode === "adult" ? t("noteAdult") : t("noteChild")}</Callout>

        {tab === "home" && (
          <>
            <Panel title={t("heroTitle")}>
              <p className="m-0 text-muted">{t("heroText")}</p>
              <div className="mt-4 flex flex-wrap items-center gap-5">
                <svg viewBox="0 0 120 120" className="h-32 w-32 flex-none" role="img" aria-label={`${pct}% ${t("ofWeek")}`}>
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-track)" strokeWidth="12" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={gaugeColor} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${C * shown} ${C}`} transform="rotate(-90 60 60)" />
                  <text x="60" y="56" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--color-ink)">{pct}%</text>
                  <text x="60" y="74" textAnchor="middle" fontSize="9" fill="var(--color-muted)">{t("ofWeek")}</text>
                </svg>
                <div className="min-w-48 flex-1">
                  <p className="m-0 text-[1.05rem] font-semibold" style={{ color: gaugeColor }}>{tone === "high" ? t("stHigh") : tone === "mid" ? t("stMid") : t("stOk")}</p>
                  <p className="m-0 mt-1 text-[0.9rem] text-muted">{t("used")}: {pct}% {t("ofWeek")}{wf >= 2 ? ` (≈ ${Math.round(wf)}×)` : ""}.</p>
                </div>
              </div>
            </Panel>
            <Panel title={t("recTitle")} action={log.length ? <div className="flex gap-2"><Button size="sm" onClick={csv}>{t("exportCsv")}</Button><Button size="sm" variant="danger" onClick={clear}>{confirmClear ? t("confirmClear") : t("clearAll")}</Button></div> : undefined}>
              <ResponsiveTable rows={[...log].sort((a, b) => b.date.localeCompare(a.date))} rowKey={e => e.id} empty={<Empty>{t("recEmpty")}</Empty>}
                columns={[
                  { header: t("colDay"), cell: dayRowLabel },
                  { header: t("colSound"), cell: srcName }, { header: t("colLevel"), cell: e => `${e.db} dBA`, className: "tabular-nums" },
                  { header: t("colMin"), cell: e => `${e.min} ${t("min")}`, className: "tabular-nums" },
                  { header: t("colUse"), cell: e => `${Math.round(fraction(e.db, e.min, mode) * 100)}%`, className: "tabular-nums" },
                  { header: "", cell: e => <Button size="sm" variant="danger" onClick={() => del(e.id)}>{t("del")}</Button> }]} />
            </Panel>
          </>
        )}

        {tab === "add" && (
          <Panel title={t("logTitle")}>
            <p className="m-0 text-[0.9rem] text-muted">{t("logIntro")}</p>
            <Field label={t("whatSound")}>{id => <Select id={id} value={srcId} onChange={e => setSrcId(e.target.value)}>{SOURCES.map(s => <option key={s.id} value={s.id}>{s.id === "custom" ? t("custom") : `${pick(s, lang)} (~${s.db} dBA)`}</option>)}</Select>}</Field>
            {srcId === "custom" && <Field label={t("customDb")} hint={t("customHint")}>{id => <Input id={id} type="number" min={40} max={140} value={customDb} className="max-w-36" onChange={e => setCustomDb(e.target.value)} />}</Field>}
            <Field label={t("howLong")}>{id => <Input id={id} type="number" min={1} max={960} value={mins} className="max-w-36" onChange={e => setMins(e.target.value)} />}</Field>
            <Field label={t("when")}>{id => <Select id={id} value={when} onChange={e => setWhen(e.target.value)}><option value="0">{t("today")}</option><option value="1">{t("yesterday")}</option><option value="2">{t("daysAgo").replace("{n}", "2")}</option><option value="3">{t("daysAgo").replace("{n}", "3")}</option></Select>}</Field>
            <div className="mt-2 rounded-lg border border-line bg-paper p-3 text-[0.9rem]">{t("thisUses")}: <b>{Math.round(fraction(curDb, Number(mins) || 0, mode) * 100)}%</b> {t("ofWeek")}. {t("safeAt")}: <b>{durTxt(allowedHours(curDb, mode))}</b></div>
            {err && <p role="alert" className="m-0 mt-2 font-semibold text-high">{err}</p>}
            <div className="mt-4"><Button variant="primary" onClick={add}>{t("add")}</Button></div>
          </Panel>
        )}

        {tab === "ladder" && (
          <Panel title={t("ladTitle")}>
            <p className="m-0 text-[0.9rem] text-muted">{t("ladIntro")}</p>
            <ul className="m-0 mt-3 grid grid-cols-1 list-none gap-1.5 p-0">
              {LADDER.map(L => { const h = allowedHours(L, mode), active = L === Math.round(curDb / 5) * 5; return (
                <li key={L} className={cx("flex items-center justify-between gap-3 rounded-md border px-3 py-2", active ? "border-ink bg-ink text-paper" : "border-line bg-paper")}>
                  <b className="tabular-nums">{L} dBA</b>
                  <span className={cx("min-w-0 flex-1 truncate text-[0.85rem]", active ? "text-paper/80" : "text-muted")}>{pick(SOURCES.find(s => s.db === L), lang)}</span>
                  <span className="tabular-nums">{durTxt(h)}</span></li>); })}
            </ul>
          </Panel>
        )}

        {tab === "safety" && (
          <div className="grid grid-cols-1 gap-5">
            <Panel title={t("tipsTitle")}><ul className="m-0 grid list-disc gap-1.5 pl-5 text-[0.95rem]">{(TIPS[lang] ?? TIPS.en).map((x, i) => <li key={i}>{x}</li>)}</ul></Panel>
            <Panel title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-mid" aria-hidden />{t("signsTitle")}</span>}>
              <ul className="m-0 grid list-disc gap-1.5 pl-5 text-[0.95rem]">{(SIGNS[lang] ?? SIGNS.en).map((x, i) => <li key={i}>{x}</li>)}</ul></Panel>
            <Panel title={t("crTitle")}>
              <p className="m-0 text-[0.9rem] text-muted">{t("crIntro")}</p>
              <ul className="m-0 mt-2 grid list-disc gap-1.5 pl-5 text-[0.95rem]">{(CRACKERS[lang] ?? CRACKERS.en).map((x, i) => <li key={i}>{x}</li>)}</ul></Panel>
          </div>
        )}
      </div>
    </AppShell>
  );

  function dayRowLabel(e: LogItem) { return <><span>{dayLabel(e.date)}</span></>; }
}
