import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

function CounterView() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial counter value from Tauri backend
    const fetchInitialValue = async () => {
      try {
        const value = await invoke<number>("get_counter");
        setCount(value);
        setError(null);
      } catch (err) {
        setError(`Failed to get counter: ${err}`);
        setCount(null);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialValue();
  }, []);

  const handleIncrement = async () => {
    try {
      const newValue = await invoke<number>("increment_counter");
      setCount(newValue);
      setError(null);
    } catch (err) {
      setError(`Increment failed: ${err}`);
    }
  };

  const handleDecrement = async () => {
    try {
      const newValue = await invoke<number>("decrement_counter");
      setCount(newValue);
      setError(null);
    } catch (err) {
      setError(`Decrement failed: ${err}`);
    }
  };

  const handleReset = async () => {
    try {
      const newValue = await invoke<number>("reset_counter");
      setCount(newValue);
      setError(null);
    } catch (err) {
      setError(`Reset failed: ${err}`);
    }
  };

  return (
    <div className="counter-container" data-testid="counter-view">
      <div className="counter-display" data-testid="counter-display">
        {loading ? "Loading..." : error ? "Error" : count}
      </div>
      <div className="counter-controls">
        <button
          data-testid="decrement-button"
          onClick={handleDecrement}
          disabled={loading}
        >
          -
        </button>
        <button
          data-testid="reset-button"
          onClick={handleReset}
          disabled={loading}
        >
          Reset
        </button>
        <button
          data-testid="increment-button"
          onClick={handleIncrement}
          disabled={loading}
        >
          +
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default CounterView;
