import toast, { ToastBar, Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

import { cn } from '@utils/cn';
import { formatSizeUnit } from '@utils/formatSizeUnit';
import type { FileMetadata, Job } from 'types/pywebview/pywebview-api';

import { messageKey } from '../../i18n/legacyMessages';
import Button from './Button';
import Icon from './Icon';

/** Float dismissible feedback without moving the workspace or stealing keyboard focus. */
export const Notifications = () => {
  const { t } = useTranslation();
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        error: { duration: Infinity },
        style: {
          background: 'var(--surface)',
          border: '1px solid color-mix(in srgb, var(--ink) 15%, transparent)',
          borderRadius: 12,
          color: 'var(--ink)',
          fontSize: 14,
          maxWidth: 400,
          padding: 12,
        },
      }}
    >
      {(notification) => (
        <ToastBar toast={notification}>
          {({ message }) => (
            <>
              <Icon
                className={cn(
                  'size-5 shrink-0',
                  notification.type === 'error' ? 'text-danger' : 'text-accent',
                )}
                name={
                  notification.type === 'success'
                    ? 'check'
                    : 'information-outline'
                }
              />
              <div className="min-w-0 flex-1 break-words">{message}</div>
              <button
                aria-label={t('common.dismissNotification')}
                className="text-ink/70 hover:bg-ink/5 self-start rounded-lg p-1.5"
                type="button"
                onClick={() => toast.dismiss(notification.id)}
              >
                <Icon className="size-4" name="close" />
              </button>
            </>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
};

type NoticeProps = {
  children: ReactNode;
  isError?: boolean;
  onDismiss?: () => void;
};

/** Present feedback in the document flow so it stays discoverable. */
export const Notice = ({
  children,
  onDismiss = undefined,
  isError = false,
}: NoticeProps) => {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-sm',
        isError
          ? 'border-danger/25 bg-danger/10 text-danger'
          : 'border-ink/12 bg-surface text-ink/70',
      )}
      role={isError ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 size-4 shrink-0" name="information-outline" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
      {onDismiss && (
        <button
          aria-label={t('common.dismiss')}
          className="rounded p-0.5"
          type="button"
          onClick={onDismiss}
        >
          <Icon className="size-4" name="close" />
        </button>
      )}
    </div>
  );
};

type JobProgressProps = {
  file: FileMetadata | null;
  job: Job;
  modelName: string;
  onCancel: () => void;
};

/** Describe real job phases; indeterminate work never shows an invented percentage. */
export const JobProgress = ({
  file,
  job,
  modelName,
  onCancel,
}: JobProgressProps) => {
  const { t } = useTranslation();
  const estimate =
    job.remainingSeconds === null
      ? null
      : Math.max(0, Math.ceil(job.remainingSeconds));
  const isCancelling = job.status === 'cancelling';
  const isDownload = job.kind === 'download';
  const title = isCancelling
    ? t('progress.cancelling')
    : isDownload
      ? t('progress.downloadingModel')
      : t('progress.transcribingFile');
  return (
    <section
      aria-label={t('progress.title')}
      className="border-accent/20 bg-accent/10 rounded-2xl border p-6"
    >
      <div className="flex items-start gap-4">
        <div className="bg-surface text-accent grid size-12 shrink-0 place-items-center rounded-2xl">
          <Icon name={isDownload ? 'download' : 'waveform'} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {file && (
            <p
              className="mt-1 text-sm font-medium break-words"
              title={file.absolutePath}
            >
              {file.name}
            </p>
          )}
          <p
            aria-live="polite"
            className="text-ink/70 mt-2 text-sm break-words"
          >
            {isCancelling
              ? t(isDownload ? 'progress.waitDownload' : 'progress.waitAudio')
              : t(messageKey(job.message))}
          </p>
          <p className="text-ink/60 mt-2 text-xs">
            {file && `${formatSizeUnit(file.size)} · `}
            {modelName}
          </p>
        </div>
        <Button disabled={isCancelling} variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
      {!isDownload && (
        <p className="text-ink/60 mt-4 text-xs">
          {t('progress.localRecording')}
        </p>
      )}
      <progress
        aria-label={t('progress.title')}
        className="mt-5 h-1.5 w-full"
        max={100}
        value={job.progress ?? undefined}
      />
      <div className="text-ink/70 mt-2 flex justify-between text-xs">
        <span title={t('progress.estimateHint')}>
          {isDownload
            ? t('progress.downloadInternet')
            : isCancelling
              ? t('progress.cancellationRequested')
              : estimate === null
                ? t(
                    job.progress === null
                      ? 'progress.preparing'
                      : 'progress.estimating',
                  )
                : t('progress.timeRemaining', {
                    time: `${Math.floor(estimate / 60)}:${String(estimate % 60).padStart(2, '0')}`,
                  })}
        </span>
        <span className="tabular-nums">
          {job.progress === null
            ? t('progress.inProgress')
            : `${Math.floor(job.progress)}%`}
        </span>
      </div>
    </section>
  );
};
