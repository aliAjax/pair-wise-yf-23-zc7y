interface Props {
  value: number;
  onChange: (value: number) => void;
  recordCount: number;
  disabled: boolean;
}

export function ClockAlignmentForm({ value, onChange, recordCount, disabled }: Props) {
  return (
    <section className="panel">
      <h2>② 对齐控台时钟</h2>
      <p className="hint">
        输入演出开始时控台时钟读数（ms），对账将按此时钟零点对齐本地编排时间轴。
      </p>
      <label className="field">
        <span>演出开始 · 控台时钟 (ms)</span>
        <input
          type="number"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
      <p className="hint">
        对齐偏移：触发时刻 − {value}ms = 编排相对时刻。当前控台记录 {recordCount} 条。
      </p>
    </section>
  );
}
