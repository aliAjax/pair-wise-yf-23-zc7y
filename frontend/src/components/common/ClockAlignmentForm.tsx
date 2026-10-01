import { useState } from "react";
import type { ClockAlignment } from "../../types/ReconciliationReport";
import { createClockAlignmentForm } from "../../constructors/ReconciliationReportConstructor";

interface Props {
  disabled?: boolean;
  onSubmit: (alignment: ClockAlignment, options: { failUntilAttempt?: number }) => void;
}

export function ClockAlignmentForm({ disabled = false, onSubmit }: Props) {
  const [form, setForm] = useState<ClockAlignment>(createClockAlignmentForm());
  const [simulateFailure, setSimulateFailure] = useState(false);

  const update = (key: keyof ClockAlignment, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="recon-clock-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form, simulateFailure ? { failUntilAttempt: 1 } : {});
      }}
    >
      <label>
        演出开始时间（本地时钟）
        <input
          type="text"
          placeholder="20:00:00 或 2026-10-01T20:00:00+08:00"
          value={form.show_started_at}
          disabled={disabled}
          onChange={(event) => update("show_started_at", event.target.value)}
        />
      </label>
      <label>
        同一时刻控台时钟读数
        <input
          type="text"
          placeholder="20:00:02（留空表示两钟一致）"
          value={form.console_clock_at_show_start}
          disabled={disabled}
          onChange={(event) => update("console_clock_at_show_start", event.target.value)}
        />
      </label>
      <label>
        触发容差（ms）
        <input
          type="number"
          min={0}
          step={500}
          value={form.tolerance_ms}
          disabled={disabled}
          onChange={(event) => update("tolerance_ms", Number(event.target.value))}
        />
      </label>
      <label className="recon-check">
        <input
          type="checkbox"
          checked={simulateFailure}
          disabled={disabled}
          onChange={(event) => setSimulateFailure(event.target.checked)}
        />
        模拟首批失败（验证保留已完成部分 + 重试）
      </label>
      <button type="submit" className="btn-primary" disabled={disabled}>开始对账</button>
    </form>
  );
}
