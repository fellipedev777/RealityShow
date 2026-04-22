'use client';

import { useEffect, useState } from 'react';

export default function CountdownTimer({ seconds, onEnd }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) { onEnd?.(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const pct = (remaining / seconds) * 100;
  const color = remaining <= 5 ? 'bg-red-500' : remaining <= 10 ? 'bg-yellow-500' : 'bg-bbb-purple';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`text-4xl font-black tabular-nums ${remaining <= 5 ? 'text-red-400 animate-bounce' : 'text-white'}`}>
        {remaining}
      </div>
      <div className="w-full h-2 bg-bbb-border rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
