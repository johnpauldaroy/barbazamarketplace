import { useEffect, useState } from 'react';

const TOAST_LIMIT = 5;

let count = 0;
const genId = () => {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return String(count);
};

const toastStore = {
  state: {
    toasts: [],
  },
  listeners: [],

  getState() {
    return this.state;
  },
  setState(nextState) {
    this.state = typeof nextState === 'function' ? nextState(this.state) : { ...this.state, ...nextState };
    this.listeners.forEach((listener) => listener(this.state));
  },
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },
};

export const toast = ({ duration = 4500, ...props }) => {
  const id = genId();

  const dismiss = () =>
    toastStore.setState((state) => ({
      ...state,
      toasts: state.toasts.filter((t) => t.id !== id),
    }));

  const update = (nextProps) =>
    toastStore.setState((state) => ({
      ...state,
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...nextProps } : t)),
    }));

  toastStore.setState((state) => ({
    ...state,
    toasts: [{ id, ...props, duration, dismiss }, ...state.toasts].slice(0, TOAST_LIMIT),
  }));

  return { id, dismiss, update };
};

export const useToast = () => {
  const [state, setState] = useState(toastStore.getState());

  useEffect(() => toastStore.subscribe(setState), []);

  useEffect(() => {
    const timers = state.toasts
      .filter((t) => t.duration !== Infinity)
      .map((t) => setTimeout(() => t.dismiss?.(), t.duration ?? 4500));

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [state.toasts]);

  return {
    toast,
    toasts: state.toasts,
  };
};
