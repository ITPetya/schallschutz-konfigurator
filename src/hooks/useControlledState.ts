import { useCallback, useEffect, useState } from "react";

interface CommonControlledStateProps<T> {
  value?: T;
  defaultValue?: T;
}

// Von animate-ui.com uebernommen (dort "@animate-ui/hooks-use-controlled-state")
// - gemeinsame Basis fuer alle Radix-Primitives hier (Popover, Dialog,
// DropdownMenu, ...), die sowohl unkontrolliert (nur defaultValue) als auch
// kontrolliert (value + onChange von aussen) verwendet werden koennen.
export function useControlledState<T, Rest extends unknown[] = []>(
  props: CommonControlledStateProps<T> & {
    onChange?: (value: T, ...args: Rest) => void;
  },
): readonly [T, (next: T, ...args: Rest) => void] {
  const { value, defaultValue, onChange } = props;

  const [state, setInternalState] = useState<T>(value !== undefined ? value : (defaultValue as T));

  useEffect(() => {
    if (value !== undefined) setInternalState(value);
  }, [value]);

  const setState = useCallback(
    (next: T, ...args: Rest) => {
      setInternalState(next);
      onChange?.(next, ...args);
    },
    [onChange],
  );

  return [state, setState] as const;
}
