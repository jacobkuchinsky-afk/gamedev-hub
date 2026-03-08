"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  toast: (opts: {
    title: string;
    description?: string;
    type?: ToastType;
  }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const TOAST_DURATION = 4000;
const MAX_TOASTS = 3;

const TYPE_CONFIG: Record<
  ToastType,
  { icon: typeof CheckCircle2; color: string; bg: string }
> = {
  success: { icon: CheckCircle2, color: "#F59E0B", bg: "#F59E0B" },
  error: { icon: AlertCircle, color: "#EF4444", bg: "#EF4444" },
  info: { icon: Info, color: "#3B82F6", bg: "#3B82F6" },
};

function ToastCard({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: string) => void;
}) {
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);
  const startRef = useRef(item.createdAt);

  useEffect(() => {
    const frame = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(pct);
      if (pct > 0) requestAnimationFrame(frame);
    };
    const raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(item.id), 300);
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [item.id, onRemove]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onRemove(item.id), 300);
  };

  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;

  return (
    <div
      className={`pointer-events-auto relative w-80 overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-2xl transition-all duration-300 ${
        exiting
          ? "translate-x-[120%] opacity-0"
          : "translate-x-0 opacity-100 animate-slide-in-right"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: config.color }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#F5F5F5]">{item.title}</p>
          {item.description && (
            <p className="mt-0.5 text-xs text-[#9CA3AF]">
              {item.description}
            </p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="shrink-0 rounded p-0.5 text-[#6B7280] transition-colors hover:text-[#F5F5F5]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-[2px] w-full bg-[#2A2A2A]">
        <div
          className="h-full transition-[width] duration-75 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor: config.bg,
          }}
        />
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      type = "success",
    }: {
      title: string;
      description?: string;
      type?: ToastType;
    }) => {
      const item: ToastItem = {
        id: crypto.randomUUID(),
        title,
        description,
        type,
        createdAt: Date.now(),
      };
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), item]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
