import React from 'react'
import toast, { Toast, ToastOptions } from 'react-hot-toast'

interface AccessibleToastOptions extends ToastOptions {
  ariaLive?: 'polite' | 'assertive'
  role?: 'status' | 'alert'
}

const defaultOptions: AccessibleToastOptions = {
  ariaLive: 'polite',
  role: 'status',
  duration: 4000
}

export const accessibleToast = {
  success: (message: React.ReactNode, options?: AccessibleToastOptions) => {
    return toast.success(message, {
      ...defaultOptions,
      ...options,
      ariaProps: {
        'aria-live': options?.ariaLive || 'polite',
        role: options?.role || 'status'
      }
    })
  },

  error: (message: React.ReactNode, options?: AccessibleToastOptions) => {
    return toast.error(message, {
      ...defaultOptions,
      ariaLive: 'assertive',
      role: 'alert',
      ...options,
      ariaProps: {
        'aria-live': options?.ariaLive || 'assertive',
        role: options?.role || 'alert'
      }
    })
  },

  loading: (message: React.ReactNode, options?: AccessibleToastOptions) => {
    return toast.loading(message, {
      ...defaultOptions,
      ...options,
      ariaProps: {
        'aria-live': options?.ariaLive || 'polite',
        role: options?.role || 'status',
        'aria-busy': 'true'
      }
    })
  },

  custom: (
    render: (t: Toast) => React.ReactNode,
    options?: AccessibleToastOptions
  ) => {
    return toast.custom(render, {
      ...defaultOptions,
      ...options,
      ariaProps: {
        'aria-live': options?.ariaLive || 'polite',
        role: options?.role || 'status'
      }
    })
  },

  dismiss: toast.dismiss,
  remove: toast.remove
}

// Custom toast with action button
export const toastWithAction = (
  message: string,
  actionLabel: string,
  onAction: () => void,
  options?: AccessibleToastOptions
) => {
  return accessibleToast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={() => {
              onAction()
              toast.dismiss(t.id)
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label={actionLabel}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    ),
    options
  )
}