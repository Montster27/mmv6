"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ToastVariant = "default" | "success" | "destructive"

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration: number
}

interface ToastContextValue {
  toast: (
    message: string,
    options?: { variant?: ToastVariant; duration?: number }
  ) => void
}

const ToastContext = React.createContext<ToastContextValue>({
  toast: () => {},
})

export function useToast() {
  return React.useContext(ToastContext)
}

const variantClasses: Record<ToastVariant, string> = {
  default: "border-slate-200 bg-white text-slate-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  destructive: "border-red-200 bg-red-50 text-red-800",
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 200)
    }, item.duration)
    return () => clearTimeout(timer)
  }, [item.duration, onDismiss])

  return (
    <div
      role="status"
      className={cn(
        "rounded-md border px-4 py-3 text-sm shadow-md transition-all duration-200",
        variantClasses[item.variant],
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0"
      )}
    >
      {item.message}
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])

  const toast = React.useCallback(
    (
      message: string,
      options?: { variant?: ToastVariant; duration?: number }
    ) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          variant: options?.variant ?? "default",
          duration: options?.duration ?? 4000,
        },
      ])
    },
    []
  )

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((item) => (
          <Toast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
