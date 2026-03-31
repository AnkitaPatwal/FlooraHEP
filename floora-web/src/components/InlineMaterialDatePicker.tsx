import { useEffect, useState } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import "./InlineMaterialDatePicker.css";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function localDateToIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIsoToLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) {
    return null;
  }
  return d;
}

function formatUsFromIso(iso: string): string {
  const d = parseIsoToLocal(iso);
  if (!d) return "";
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

/** Accepts YYYY-MM-DD or M/D/YYYY (or MM/DD/YYYY). */
function parseFlexibleToIso(s: string): string | null {
  const t = s.trim();
  if (!t) return null;

  const isoLike = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (isoLike) {
    return parseIsoToLocal(t) ? t : null;
  }

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (slash) {
    const mo = Number(slash[1]);
    const day = Number(slash[2]);
    const y = Number(slash[3]);
    const d = new Date(y, mo - 1, day);
    if (d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === day) {
      return localDateToIso(d);
    }
  }

  return null;
}

function formatHeaderLine(iso: string): string {
  const d = parseIsoToLocal(iso);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function monthYearOptions(center: Date, span = 36): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const y = center.getFullYear();
  const m = center.getMonth();
  for (let i = -span; i <= span; i++) {
    const cur = new Date(y, m + i, 1);
    out.push({
      value: `${cur.getFullYear()}-${cur.getMonth()}`,
      label: cur.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

function buildGrid(viewYear: number, viewMonth: number): { date: Date; inMonth: boolean; iso: string }[] {
  const first = new Date(viewYear, viewMonth, 1);
  const startPad = first.getDay();
  const start = new Date(viewYear, viewMonth, 1 - startPad);
  const cells: { date: Date; inMonth: boolean; iso: string }[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    cells.push({
      date,
      inMonth: date.getMonth() === viewMonth,
      iso: localDateToIso(date),
    });
  }
  return cells;
}

function todayIso(): string {
  return localDateToIso(new Date());
}

function isBeforeToday(iso: string): boolean {
  return iso < todayIso();
}

export type InlineMaterialDatePickerProps = {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
};

export function InlineMaterialDatePicker({
  id,
  value,
  onChange,
  disabled,
}: InlineMaterialDatePickerProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => formatUsFromIso(value));

  const initial = parseIsoToLocal(value) ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => {
    if (!editing) {
      setText(formatUsFromIso(value));
    }
  }, [value, editing]);

  useEffect(() => {
    const d = parseIsoToLocal(value);
    if (d) {
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  useEffect(() => {
    const t = todayIso();
    if (value && value < t) {
      onChange(t);
    }
  }, [value, onChange]);

  const monthOptions = monthYearOptions(new Date(viewYear, viewMonth, 1));
  const monthSelectValue = `${viewYear}-${viewMonth}`;
  const grid = buildGrid(viewYear, viewMonth);
  const tIso = todayIso();

  const goPrevMonth = () => {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const goNextMonth = () => {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const onMonthYearChange = (v: string) => {
    const [ys, ms] = v.split("-");
    setViewYear(Number(ys));
    setViewMonth(Number(ms));
  };

  const tryCommit = (raw: string): boolean => {
    const iso = parseFlexibleToIso(raw);
    if (iso && !isBeforeToday(iso)) {
      onChange(iso);
      return true;
    }
    return false;
  };

  return (
    <div className={`inline-mdp${disabled ? " inline-mdp--disabled" : ""}`}>
      <div className="inline-mdp__header">
        <div className="inline-mdp__header-kicker">Select date</div>

        <input
          id={id}
          type="text"
          className="inline-mdp__date-input"
          inputMode="numeric"
          placeholder="MM/DD/YYYY"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          value={text}
          onFocus={() => {
            setEditing(true);
            setText(formatUsFromIso(value));
          }}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            const trimmed = v.trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && tryCommit(trimmed)) {
              setText(formatUsFromIso(trimmed));
              setEditing(false);
            }
          }}
          onBlur={() => {
            setEditing(false);
            if (!tryCommit(text)) {
              setText(formatUsFromIso(value));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
        />

        <div className="inline-mdp__header-date">{formatHeaderLine(value)}</div>
      </div>

      <div className="inline-mdp__body">
        <div className="inline-mdp__toolbar">
          <select
            className="inline-mdp__month-select"
            aria-label="Month and year"
            value={monthSelectValue}
            disabled={disabled}
            onChange={(e) => onMonthYearChange(e.target.value)}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="inline-mdp__nav">
            <button
              type="button"
              className="inline-mdp__nav-btn"
              aria-label="Previous month"
              disabled={disabled}
              onClick={goPrevMonth}
            >
              <IoChevronBack size={22} aria-hidden />
            </button>
            <button
              type="button"
              className="inline-mdp__nav-btn"
              aria-label="Next month"
              disabled={disabled}
              onClick={goNextMonth}
            >
              <IoChevronForward size={22} aria-hidden />
            </button>
          </div>
        </div>

        <div className="inline-mdp__dow" aria-hidden>
          {["S", "M", "T", "W", "T", "F", "S"].map((letter, i) => (
            <div key={`${letter}-${i}`} className="inline-mdp__dow-cell">
              {letter}
            </div>
          ))}
        </div>

        <div className="inline-mdp__grid" role="group" aria-label="Calendar dates">
          {grid.map(({ date, inMonth, iso }) => {
            const isToday = iso === tIso;
            const isSelected = value === iso;
            const isPast = isBeforeToday(iso);
            return (
              <button
                key={iso}
                type="button"
                data-testid={`inline-mdp-day-${iso}`}
                disabled={disabled || isPast}
                className={[
                  "inline-mdp__day",
                  !inMonth ? "inline-mdp__day--outside" : "",
                  isPast ? "inline-mdp__day--past" : "",
                  isToday && !isSelected ? "inline-mdp__day--today" : "",
                  isSelected ? "inline-mdp__day--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  if (!isPast) onChange(iso);
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
