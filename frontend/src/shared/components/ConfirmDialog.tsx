import { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

import Button from './Button';

type ConfirmDialogProps = {
  children: ReactNode;
  confirmLabel: string;
  description: string;
  title: string;
  isDisabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Use the native modal focus trap, Escape handling, and focus restoration for destructive actions. */
const ConfirmDialog = ({
  children,
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  title,
  isDisabled,
}: ConfirmDialogProps) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    // Start with Cancel so keyboard users cannot accidentally confirm a deletion.
    dialog?.querySelector('button')?.focus();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="border-ink/15 bg-surface text-ink backdrop:bg-ink/40 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-xl"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 className="text-lg font-semibold" id={titleId}>
        {title}
      </h2>
      <p className="text-ink/70 mt-3 text-sm leading-6" id={descriptionId}>
        {description}
      </p>
      <div className="mt-4 space-y-4">{children}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button disabled={isDisabled} variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
};

export default ConfirmDialog;
