"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";
import { type Degree, progression, startingGrips } from "@/lib/pianoExercises";
import { KEYS, chordBoxHref, scalePcNames } from "@/lib/barryHarris";
import GripCard, { display } from "@/components/barry/GripCard";
import { useUrlState } from "@/components/barry/useUrlState";

const ORDERS: Record<string, { label: string; degrees: Degree[] }> = {
  "1451": { label: "I – IV – V – I", degrees: ["I", "IV", "V", "I"] },
  "14151": { label: "I – IV – I – V – I", degrees: ["I", "IV", "I", "V", "I"] },
  "1541": { label: "I – V – IV – I", degrees: ["I", "V", "IV", "I"] },
};

const STRING_NAME: Record<number, string> = { 4: "D", 3: "G", 2: "B" };

/** I–IV–V as tight triads on strings 4-3-2, from each inversion of the I chord. */
export default function OneFourFive() {
  const [s, set] = useUrlState({ key: "C", order: "1451", staff: "1" }, (k, v) =>
    k === "key" ? (KEYS as readonly string[]).includes(v) : k === "order" ? v in ORDERS : v === "0" || v === "1",
  );
  const key = s.key;
  const order = ORDERS[s.order];
  const withStaff = s.staff === "1";
  const pcNames = useMemo(() => scalePcNames(key, "major6"), [key]);
  const rows = useMemo(
    () => startingGrips(key).map((start) => ({ start, steps: progression(key, start, order.degrees) })),
    [key, order],
  );

  return (
    <div className="bh">
      <section className="panel bh-controls" aria-label="Settings">
        <div className="field">
          <label htmlFor="pe-key">Key</label>
          <select id="pe-key" value={key} onChange={(e) => set("key", e.target.value)}>
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {display(k)} major
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pe-order">Progression</label>
          <select id="pe-order" value={s.order} onChange={(e) => set("order", e.target.value)}>
            {Object.entries(ORDERS).map(([id, o]) => (
              <option key={id} value={id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <label className="bh-check">
          <input type="checkbox" checked={withStaff} onChange={(e) => set("staff", e.target.checked ? "1" : "0")} />
          Show notation under each grip
        </label>
      </section>

      {rows.map(({ start, steps }) => {
        const total = steps.reduce((sum, st) => sum + st.moves.reduce((a, m) => a + Math.abs(m.frets), 0), 0);
        return (
          <section key={start.inversion} className="panel" aria-label={`Starting from ${start.name}`}>
            <h2 className="section-title">
              Start from {display(start.name)} · I in {start.inversion}{" "}
              <span className="count" title="Total frets moved">
                {total} frets moved
              </span>
            </h2>
            <div className="pe-row">
              {steps.map((st, i) => (
                <Fragment key={i}>
                  {i > 0 && (
                    <ul className="pe-moves" aria-label="How each string moves">
                      {st.moves.map((m) => (
                        <li key={m.string} className={m.frets === 0 ? "stay" : ""}>
                          <span className="pe-string">{STRING_NAME[m.string]}</span>
                          {m.frets === 0 ? (
                            <>{display(m.from)} stays</>
                          ) : (
                            <>
                              {display(m.from)}→{display(m.to)}{" "}
                              <span className="pe-frets">
                                {m.frets > 0 ? "+" : "−"}
                                {Math.abs(m.frets)}
                              </span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href={chordBoxHref(st.grip.frets, display(st.grip.name))} className="bh-link pe-card">
                    <span className="pe-degree">{order.degrees[i]}</span>
                    <GripCard
                      frets={st.grip.frets}
                      name={st.grip.name}
                      sub={st.grip.notes.map(display).join(" ")}
                      pcNames={pcNames}
                      dim={false}
                      withStaff={withStaff}
                    />
                  </Link>
                </Fragment>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
