import { useState } from "react";

interface Props {
  onImport: (text: string) => Promise<number>;
  onLoadSample: () => void;
  recordCount: number;
  fallbackCount: number;
}

export function ConsoleRecordPaste({ onImport, onLoadSample, recordCount, fallbackCount }: Props) {
  const [text, setText] = useState("");
  const [imported, setImported] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleImport = async () => {
    setError("");
    try {
      const count = await onImport(text);
      setImported(count);
      if (count === 0) setError("未解析到有效记录，请检查粘贴内容");
    } catch {
      setError("控台执行记录解析失败，请检查粘贴内容格式");
    }
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>① 粘贴控台执行记录</h2>
        <button className="link" onClick={onLoadSample}>载入示例</button>
      </div>
      <textarea
        className="paste-area"
        placeholder="粘贴灯控台导出的执行记录（JSON 数组或 JSON Lines），例如：
[{&quot;console_cue_id&quot;:&quot;CUE-1&quot;,&quot;cue_scene_id&quot;:1,&quot;triggered_at_ms&quot;:12000}]"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
      />
      <div className="paste-actions">
        <button className="primary" onClick={handleImport}>解析并导入</button>
        <span className="hint">
          已导入 {recordCount} 条
          {fallbackCount > 0 && <em className="fallback">，其中 {fallbackCount} 条缺通道快照已兼容读回</em>}
          {imported !== null && <em>，本次解析 {imported} 条</em>}
        </span>
      </div>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
