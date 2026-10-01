interface Props {
  visible: boolean;
  onRecalculate: () => void;
}

export function StaleBanner({ visible, onRecalculate }: Props) {
  if (!visible) return null;
  return (
    <section className="banner stale">
      <div>
        <strong>编排已变更，旧对账结果已作废</strong>
        <span>时间轴或场景发生改动后，原对账结论不再可信，请重新执行对账。</span>
      </div>
      <button className="primary" onClick={onRecalculate}>重新对账</button>
    </section>
  );
}
