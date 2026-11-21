import Counter from './Counter';
import { METRICS } from './data';

export default function MetricsSection() {
  return (
    <section className="border-b border-line bg-white">
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <p className="text-center text-xs font-semibold tracking-[0.16em] text-muted uppercase">
          Được tin dùng bởi các salon &amp; spa trên toàn quốc
        </p>
        <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {METRICS.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className="font-display text-[30px] font-extrabold text-ink">
                <Counter value={metric.value} decimals={metric.decimals} />
                <span className="text-brand">{metric.suffix}</span>
              </div>
              <div className="mt-1 text-sm text-muted">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
