import { useEffect, useState } from "react";

interface Props {
  value: string;
  recordCount: number;
  parseErrors: { line: number; text: string }[];
  onImport: (text: string) => Promise<{ records: unknown[]; errors: { line: number; text: string }[] }>;
}

const PLACEHOLDER = [
  "在此粘贴灯控台导出的执行记录，支持 Tab/逗号/分号/竖线分隔：",
  "1\t20:00:00.200\tQ1\t开场暖场\t1@255 2@120",
  "2\t20:00:13.600\tQ2\t主唱定点\t1@180",
  "3\t20:00:28.100\tQ9\t安可特效"
].join("\n");

export function ConsoleLogImporter({ value, recordCount, parseErrors, onImport }: Props) {
  const [text, setText] = useState(value);
  const [hint, setHint] = useState("");

  useEffect(() => setText(value), [value]);

  const handleImport = async () => {
    try {
      const result = await onImport(text);
      setHint(`已解析 ${result.records.length} 条执行记录${result.errors.length ? `，${result.errors.length} 行无法识别` : ""}`);
    } catch (error) {
      setHint(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="recon-importer">
      <textarea
        className="recon-textarea"
        value={text}
        placeholder={PLACEHOLDER}
        onChange={(event) => setText(event.target.value)}
        rows={9}
      />
      <div className="recon-importer-foot">
        <button type="button" className="btn-primary" onClick={handleImport}>导入执行记录</button>
        <span className="recon-hint">
          {hint || (recordCount > 0 ? `当前记录 ${recordCount} 条，解析异常 ${parseErrors.length} 行` : "尚未导入记录")}
        </span>
      </div>
      {parseErrors.length > 0 && (
        <details className="recon-errors">
          <summary>{parseErrors.length} 行无法识别（不影响其它行对账）</summary>
          <ul>
            {parseErrors.slice(0, 20).map((error) => (
              <li key={error.line}>第 {error.line} 行：{error.text}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
