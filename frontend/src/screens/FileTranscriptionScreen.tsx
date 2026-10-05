import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import Select from '@components/Select';
import Typography from '@components/Typography';
import { cn } from '@utils/cn';
import { formatSizeUnit } from '@utils/formatSizeUnit';
import type { PyWebViewApi, Transcript } from 'types/pywebview/pywebview-api';

type ExportFormat = Parameters<PyWebViewApi['export_transcript']>[1];
type FileTranscriptionScreenProps = {
  transcript: Transcript;
  isDisabled: boolean;
  onCopy: (text: string) => Promise<void>;
  onExport: (format: ExportFormat) => void;
};

/** Format display timestamps without changing the original export precision. */
const formatTime = (value: number) => {
  const seconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(seconds / 3600);
  return [
    ...(hours ? [hours] : []),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

/** Present timed segments alongside the source file and actual processing details. */
const FileTranscriptionScreen = ({
  onCopy,
  onExport,
  transcript,
  isDisabled,
}: FileTranscriptionScreenProps) => {
  const { i18n, t } = useTranslation();
  const [copied, setCopied] = useState<null | string>(null);
  const copyTimer = useRef<null | number>(null);
  useEffect(
    () => () => {
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
    },
    [],
  );
  const copy = async (id: string, text: string) => {
    try {
      await onCopy(text);
      setCopied(id);
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current);
      }
      copyTimer.current = window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // The parent displays clipboard errors in the shared notification area.
    }
  };
  const [format, setFormat] = useState<ExportFormat>('txt');
  const hasSpeech = transcript.segments.length > 0;
  const languageName =
    new Intl.DisplayNames([i18n.language], { type: 'language' }).of(
      transcript.language,
    ) ?? transcript.language;
  const fullText = transcript.segments
    .map((segment) => segment.text.trim())
    .join(' ');
  const details = [
    {
      label: t('transcript.fileSize'),
      value: formatSizeUnit(transcript.file.size),
    },
    {
      label: t('transcript.recordingLength'),
      value: formatTime(transcript.duration),
    },
    {
      hint: t('transcript.processingHint'),
      label: t('transcript.processingTime'),
      value: formatTime(Math.round(transcript.processingSeconds)),
    },
    { label: t('transcript.model'), value: transcript.modelName },
    { label: t('transcript.language'), value: languageName },
    { label: t('transcript.engine'), value: transcript.engineName },
  ];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="shrink-0">
        <Typography variant="title">{t('transcript.title')}</Typography>
        <p
          className="mt-2 text-sm font-medium break-words"
          title={transcript.file.absolutePath}
        >
          {transcript.file.name}
        </p>
        <dl className="border-ink/12 mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-3">
          {details.map((detail) => (
            <div key={detail.label} className="min-w-0" title={detail.hint}>
              <dt className="text-ink/60 text-xs">{detail.label}</dt>
              <dd className="mt-1 text-sm font-medium break-words">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>
      {hasSpeech ? (
        <>
          <section
            aria-label={t('transcript.title')}
            className="border-ink/12 bg-surface flex min-h-40 flex-1 flex-col overflow-hidden rounded-2xl border shadow-xs"
          >
            <div className="border-ink/12 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
              <p className="text-ink/70 text-xs">
                {t('transcript.segmentCount', {
                  count: transcript.segments.length,
                })}
              </p>
              <Button
                aria-label={t(
                  copied === 'full'
                    ? 'transcript.copied'
                    : 'transcript.copyText',
                )}
                className={cn(
                  'size-10 shrink-0 px-2',
                  copied === 'full' && 'copy-confirmation',
                )}
                disabled={isDisabled}
                icon={copied === 'full' ? 'check' : 'content-copy'}
                title={t(
                  copied === 'full'
                    ? 'transcript.copied'
                    : 'transcript.copyText',
                )}
                variant="ghost"
                onClick={() => void copy('full', fullText)}
              />
            </div>
            <ol className="divide-ink/8 min-h-0 flex-1 divide-y overflow-y-auto p-2">
              {transcript.segments.map((segment) => (
                <li
                  key={segment.id}
                  className={cn(
                    'group hover:bg-ink/3 focus-within:bg-ink/3 grid grid-cols-[4rem_minmax(0,1fr)_2.5rem]',
                    'items-baseline gap-2 rounded-lg px-2 py-2.5 transition-colors sm:gap-3 sm:px-3',
                  )}
                >
                  <span className="text-ink/60 font-mono text-xs leading-7 tabular-nums">
                    {formatTime(segment.start)}
                  </span>
                  <p className="min-w-0 text-[15px] leading-7 break-words whitespace-pre-wrap">
                    {segment.text}
                  </p>
                  <Button
                    aria-label={
                      copied === String(segment.id)
                        ? t('transcript.copied')
                        : t('transcript.copySegmentAt', {
                            time: formatTime(segment.start),
                          })
                    }
                    className={cn(
                      'text-ink/50 hover:text-ink size-10 self-start px-2',
                      copied === String(segment.id) && 'copy-confirmation',
                    )}
                    disabled={isDisabled}
                    icon={
                      copied === String(segment.id) ? 'check' : 'content-copy'
                    }
                    title={t(
                      copied === String(segment.id)
                        ? 'transcript.copied'
                        : 'transcript.copySegment',
                    )}
                    variant="ghost"
                    onClick={() => void copy(String(segment.id), segment.text)}
                  />
                </li>
              ))}
            </ol>
          </section>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <Typography className="max-w-sm" variant="caption">
              {t('transcript.exportHint')}
            </Typography>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="export-format">
                {t('transcript.exportFormat')}
              </label>
              <Select
                className="w-24"
                disabled={isDisabled}
                id="export-format"
                value={format}
                onChange={(event) =>
                  setFormat(event.target.value as ExportFormat)
                }
              >
                <option value="txt">TXT</option>
                <option value="srt">SRT</option>
                <option value="vtt">VTT</option>
              </Select>
              <Button
                disabled={isDisabled}
                icon="download"
                variant="primary"
                onClick={() => onExport(format)}
              >
                {t('transcript.export')}
              </Button>
            </div>
          </footer>
        </>
      ) : (
        <section className="border-ink/12 bg-surface rounded-2xl border p-8">
          <Typography variant="sectionTitle">
            {t('transcript.noSpeech')}
          </Typography>
          <Typography className="mt-2 max-w-lg" variant="body">
            {t('transcript.noSpeechHint')}
          </Typography>
        </section>
      )}
    </div>
  );
};

export default FileTranscriptionScreen;
