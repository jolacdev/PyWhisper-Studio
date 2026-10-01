import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

import { cn } from '@utils/cn';
import type { Job } from 'types/pywebview/pywebview-api';

import Button from './Button';
import Icon from './Icon';

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
          aria-label={t('Dismiss')}
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

type JobProgressProps = { job: Job; onCancel: () => void };

/** Describe real job phases; indeterminate work never shows an invented percentage. */
export const JobProgress = ({ job, onCancel }: JobProgressProps) => {
  const { t } = useTranslation();
  const isCancelling = job.status === 'cancelling';
  const isDownload = job.kind === 'download';
  const title = isCancelling
    ? t('Stopping safely…')
    : isDownload
      ? t('Downloading your model')
      : t(job.message);
  return (
    <section
      aria-label={t('Task progress')}
      className="border-accent/20 bg-accent/10 rounded-2xl border p-6"
    >
      <div className="flex items-center gap-4">
        <div className="bg-surface text-accent grid size-12 shrink-0 place-items-center rounded-2xl">
          <Icon name={isDownload ? 'download' : 'waveform'} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 aria-live="polite" className="text-base font-semibold">
            {title}
          </h2>
          <p className="text-ink/70 mt-1 text-sm break-words">
            {isCancelling
              ? t(
                  isDownload
                    ? 'Waiting for the current download file to finish.'
                    : 'Waiting for the current audio block to finish.',
                )
              : isDownload
                ? t(job.message)
                : t('Your recording stays on this computer.')}
          </p>
        </div>
        <Button disabled={isCancelling} variant="ghost" onClick={onCancel}>
          {t('Cancel')}
        </Button>
      </div>
      <progress
        aria-label={t('Task progress')}
        className="mt-5 h-1.5 w-full"
        max={100}
        value={job.progress ?? undefined}
      />
      <div className="text-ink/70 mt-2 flex justify-between text-xs">
        <span>
          {t(
            isDownload
              ? 'Internet is only needed for this download.'
              : 'You can cancel between audio blocks.',
          )}
        </span>
        <span className="tabular-nums">
          {job.progress === null
            ? t('In progress')
            : `${Math.floor(job.progress)}%`}
        </span>
      </div>
    </section>
  );
};
