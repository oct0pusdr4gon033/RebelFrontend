import React, { useState, useEffect } from 'react';

interface PrecioInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  min?: number;
  /** Monto máximo permitido. Si se define (> 0), no se puede ingresar un valor mayor. */
  max?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const PrecioInput: React.FC<PrecioInputProps> = ({
  value,
  onChange,
  placeholder = '0.00',
  min = 0,
  max,
  disabled = false,
  className = '',
  id,
}) => {
  const hasMax = typeof max === 'number' && max > 0;
  const [isFocused, setIsFocused] = useState(false);
  const [exceeded, setExceeded] = useState(false);
  const [localText, setLocalText] = useState(() => (value > 0 ? String(value) : ''));

  // Feedback visual breve cuando se intenta superar el máximo
  const flashExceeded = () => {
    setExceeded(true);
    window.setTimeout(() => setExceeded(false), 900);
  };

  useEffect(() => {
    if (!isFocused) {
      setLocalText(value > 0 ? (Number.isInteger(value) ? String(value) : value.toFixed(2)) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Normalizar coma a punto (teclado numérico español)
    let raw = e.target.value.replace(',', '.');

    if (raw === '') {
      setLocalText('');
      onChange(0);
      return;
    }

    // Permitir dígitos y hasta 2 decimales
    if (/^\d*(\.\d{0,2})?$/.test(raw)) {
      const parsed = parseFloat(raw);
      // Bloquear montos mayores al máximo: se ignora la pulsación
      if (hasMax && !isNaN(parsed) && parsed > (max as number)) {
        flashExceeded();
        return;
      }
      setLocalText(raw);
      if (!isNaN(parsed)) {
        onChange(Math.max(min, parsed));
      } else {
        onChange(0);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localText);
    if (!isNaN(parsed) && parsed > 0) {
      let rounded = Math.round(parsed * 100) / 100;
      if (hasMax && rounded > (max as number)) rounded = max as number;
      setLocalText(rounded.toFixed(2));
      onChange(rounded);
    } else {
      setLocalText('');
      onChange(0);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const current = parseFloat(localText) || 0;
      let next = e.key === 'ArrowUp' ? current + step : Math.max(min, current - step);
      if (hasMax && next > (max as number)) {
        next = max as number;
        flashExceeded();
      }
      const rounded = Math.round(next * 100) / 100;
      setLocalText(rounded.toFixed(2));
      onChange(rounded);
    }
  };

  return (
    <div className={`reg-price-box ${isFocused ? 'is-focused' : ''} ${exceeded ? 'is-exceeded' : ''} ${className}`}>
      <span className="reg-price-badge">S/</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="reg-price-input"
        placeholder={placeholder}
        value={isFocused ? localText : value > 0 ? value.toFixed(2) : ''}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      {value > 0 && !disabled && (
        <button
          type="button"
          tabIndex={-1}
          className="reg-price-clear-btn"
          title="Borrar monto"
          onClick={() => {
            setLocalText('');
            onChange(0);
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

interface CantidadStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const CantidadStepper: React.FC<CantidadStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 999999,
  disabled = false,
  className = '',
  id,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localText, setLocalText] = useState(() => String(value || min));

  useEffect(() => {
    if (!isFocused) {
      setLocalText(String(value || min));
    }
  }, [value, isFocused, min]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setLocalText(raw);
    if (raw !== '') {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= min) {
        onChange(Math.min(max, parsed));
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseInt(localText, 10);
    if (isNaN(parsed) || parsed < min) {
      setLocalText(String(min));
      onChange(min);
    } else {
      const valFinal = Math.min(max, parsed);
      setLocalText(String(valFinal));
      onChange(valFinal);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    e.target.select();
  };

  const handleStep = (delta: number) => {
    const current = value || min;
    const next = Math.min(max, Math.max(min, current + delta));
    setLocalText(String(next));
    onChange(next);
  };

  return (
    <div className={`reg-stepper-box ${isFocused ? 'is-focused' : ''} ${className}`}>
      <button
        type="button"
        tabIndex={-1}
        className="reg-stepper-btn reg-stepper-btn--minus"
        onClick={() => handleStep(-1)}
        disabled={disabled || value <= min}
        title="Disminuir cantidad"
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className="reg-stepper-input"
        value={isFocused ? localText : value || min}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
      />
      <button
        type="button"
        tabIndex={-1}
        className="reg-stepper-btn reg-stepper-btn--plus"
        onClick={() => handleStep(1)}
        disabled={disabled || value >= max}
        title="Aumentar cantidad"
      >
        +
      </button>
    </div>
  );
};
