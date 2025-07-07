import toast, { ToastOptions, Renderable } from 'react-hot-toast'

export const useToast = () => {
  return {
    toast: {
      success: (message: Renderable, options?: ToastOptions) => toast.success(message, options),
      error: (message: Renderable, options?: ToastOptions) => toast.error(message, options),
      loading: (message: Renderable, options?: ToastOptions) => toast.loading(message, options),
      dismiss: (toastId?: string) => toast.dismiss(toastId),
    },
  }
}