import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseModalOptions {
  onOpen?: () => void;
  onClose?: () => void;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  preventScroll?: boolean;
  restoreFocus?: boolean;
}

export interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  modalRef: React.RefObject<HTMLDivElement>;
  triggerRef: React.RefObject<HTMLElement>;
}

/**
 * Hook for managing modal/dialog state and behavior
 * Handles focus management, keyboard interactions, and scroll locking
 * 
 * @example
 * const modal = useModal({
 *   closeOnEscape: true,
 *   preventScroll: true,
 * });
 * 
 * return (
 *   <>
 *     <button ref={modal.triggerRef} onClick={modal.open}>Open Modal</button>
 *     {modal.isOpen && (
 *       <div ref={modal.modalRef}>
 *         <ModalContent onClose={modal.close} />
 *       </div>
 *     )}
 *   </>
 * );
 */
export function useModal(options: UseModalOptions = {}): UseModalReturn {
  const {
    onOpen,
    onClose,
    closeOnEscape = true,
    closeOnOutsideClick = false,
    preventScroll = true,
    restoreFocus = true,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
    setIsOpen(true);
    onOpen?.();
  }, [onOpen, restoreFocus]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
    
    // Restore focus to the trigger element
    if (restoreFocus && previousActiveElement.current) {
      setTimeout(() => {
        previousActiveElement.current?.focus();
      }, 0);
    }
  }, [onClose, restoreFocus]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, close]);

  // Handle outside clicks
  useEffect(() => {
    if (!isOpen || !closeOnOutsideClick) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        close();
      }
    };

    // Delay to avoid closing immediately on open
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, closeOnOutsideClick, close]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!preventScroll) return;

    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen, preventScroll]);

  // Focus management
  useEffect(() => {
    if (!isOpen) return;

    // Focus the modal or first focusable element
    const focusModal = () => {
      if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus();
        } else {
          modalRef.current.focus();
        }
      }
    };

    // Use timeout to ensure DOM is ready
    const timeoutId = setTimeout(focusModal, 0);
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current!.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  return {
    isOpen,
    open,
    close,
    toggle,
    modalRef,
    triggerRef,
  };
}

/**
 * Hook for managing multiple modals with proper stacking
 */
export function useModalStack() {
  const [modalStack, setModalStack] = useState<string[]>([]);

  const openModal = useCallback((modalId: string) => {
    setModalStack(prev => [...prev, modalId]);
  }, []);

  const closeModal = useCallback((modalId: string) => {
    setModalStack(prev => prev.filter(id => id !== modalId));
  }, []);

  const closeTopModal = useCallback(() => {
    setModalStack(prev => prev.slice(0, -1));
  }, []);

  const isModalOpen = useCallback((modalId: string) => {
    return modalStack.includes(modalId);
  }, [modalStack]);

  const getZIndex = useCallback((modalId: string) => {
    const index = modalStack.indexOf(modalId);
    return index === -1 ? 0 : 1000 + (index * 10);
  }, [modalStack]);

  return {
    modalStack,
    openModal,
    closeModal,
    closeTopModal,
    isModalOpen,
    getZIndex,
    activeModal: modalStack[modalStack.length - 1],
  };
}