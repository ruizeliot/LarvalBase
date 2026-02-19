'use client';

import { useRef, useState, KeyboardEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

const PIN_LENGTH = 6;

export default function PinInput() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only accept single digit
    if (value && !/^\d$/.test(value)) {
      e.target.value = '';
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < PIN_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all digits filled
    if (value && index === PIN_LENGTH - 1) {
      const pin = newDigits.join('');
      if (pin.length === PIN_LENGTH) {
        router.push(`/lobby?pin=${pin}&host=false`);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 mt-2">
      <div className="flex gap-2 justify-center">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 bg-white/10 border-2 border-white/20 rounded-xl text-center text-2xl font-bold text-white outline-none focus:border-purple-400 focus:bg-purple-400/15 transition-colors"
          />
        ))}
      </div>
      <p className="text-xs text-white/50">Entre le code PIN de la partie</p>
    </div>
  );
}
