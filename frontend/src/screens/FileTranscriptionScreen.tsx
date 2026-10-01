import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import Select from '@components/Select';
import Typography from '@components/Typography';
import { cn } from '@utils/cn';
import type { PyWebViewApi, Transcript } from 'types/pywebview/pywebview-api';

type ExportFormat = Parameters<PyWebViewApi['export_transcript']>[1];
type FileTranscriptionScreenProps = {
  transcript: Transcript;
  isDisabled: boolean;
  onCopy: (text: string) => void;
  onExport: (format: ExportFormat) => void;
  onNew: () => void;
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

/** Present a readable document with optional timestamp rows and copy actions. */
const FileTranscriptionScreen = ({
  onCopy,
  onExport,
  onNew,
  transcript,
  isDisabled,
}: FileTranscriptionScreenProps) => {
  const { i18n, t } = useTranslation();
  const [isTimed, setIsTimed] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('txt');
  const hasSpeech = transcript.segments.length > 0;
  const languageName =
    new Intl.DisplayNames([i18n.language], { type: 'language' }).of(
      transcript.language,
    ) ?? transcript.language;
  const fullText = transcript.segments
    .map((segment) => segment.text.trim())
    .join(' ');
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Typography variant="title">{t('Transcript')}</Typography>
          <p
            className="mt-2 truncate text-sm font-medium"
            title={transcript.file.name}
          >
            {transcript.file.name}
          </p>
          <Typography className="mt-1 capitalize" variant="caption">
            {formatTime(transcript.duration)} · {languageName}
          </Typography>
        </div>
        <Button
          disabled={isDisabled}
          icon="plus"
          variant="ghost"
          onClick={onNew}
        >
          {t('New transcription')}
        </Button>
      </header>
      {hasSpeech ? (
        <>
          <section
            aria-label={t('Transcript')}
            className="border-ink/12 bg-surface flex min-h-40 flex-1 flex-col overflow-hidden rounded-2xl border shadow-xs"
          >
            <div className="border-ink/12 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div
                aria-label={t('Transcript display')}
                className="bg-ink/5 flex rounded-xl p-1"
                role="group"
              >
                {[false, true].map((mode) => (
                  <button
                    key={String(mode)}
                    aria-pressed={isTimed === mode}
                    className={cn(
                      'min-h-8 rounded-lg px-3 text-sm font-medium transition-colors',
                      isTimed === mode
                        ? 'bg-surface text-ink shadow-xs'
                        : 'text-ink/70 hover:text-ink',
                    )}
                    type="button"
                    onClick={() => setIsTimed(mode)}
                  >
                    {t(mode ? 'Timestamps' : 'Text')}
                  </button>
                ))}
              </div>
              <Button
                disabled={isDisabled}
                icon="content-copy"
                variant="ghost"
                onClick={() => onCopy(fullText)}
              >
                {t('Copy text')}
              </Button>
            </div>
            {isTimed ? (
              <ol className="divide-ink/8 min-h-0 divide-y overflow-y-auto p-2">
                {transcript.segments.map((segment) => (
                  <li
                    key={segment.id}
                    className={cn(
                      'group hover:bg-ink/3 focus-within:bg-ink/3 grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem]',
                      'items-baseline gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    )}
                  >
                    <span className="text-ink/60 font-mono text-xs leading-7 tabular-nums">
                      {formatTime(segment.start)}
                    </span>
                    <p className="min-w-0 text-[15px] leading-7 break-words whitespace-pre-wrap">
                      {segment.text}
                    </p>
                    <Button
                      aria-label={t('Copy segment at {{time}}', {
                        time: formatTime(segment.start),
                      })}
                      className="text-ink/50 hover:text-ink self-start px-2"
                      disabled={isDisabled}
                      icon="content-copy"
                      title={t('Copy segment')}
                      variant="ghost"
                      onClick={() => onCopy(segment.text)}
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <article className="mx-auto w-full max-w-prose overflow-y-auto p-6 text-[15px] leading-7 break-words sm:p-7">
                <p>{fullText}</p>
              </article>
            )}
          </section>
          <footer className="flex flex-wrap items-center justify-between gap-3">
            <Typography className="max-w-sm" variant="caption">
              {t('Export to keep this transcript after closing the app.')}
            </Typography>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="export-format">
                {t('Export format')}
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
                {t('Export')}
              </Button>
            </div>
          </footer>
        </>
      ) : (
        <section className="border-ink/12 bg-surface rounded-2xl border p-8">
          <Typography variant="sectionTitle">
            {t('No speech detected.')}
          </Typography>
          <Typography className="mt-2 max-w-lg" variant="body">
            {t(
              'The file was processed successfully. Check that it contains clear speech, or try another model or spoken language.',
            )}
          </Typography>
        </section>
      )}
    </div>
  );
};

export default FileTranscriptionScreen;
