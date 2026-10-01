import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import Icon from '@components/Icon';
import Typography from '@components/Typography';
import { cn } from '@utils/cn';
import type { PyWebViewApi, Transcript } from 'types/pywebview/pywebview-api';

type ExportFormat = Parameters<PyWebViewApi['export_transcript']>[1];

type FileTranscriptionScreenProps = {
  transcript: Transcript;
  isDisabled: boolean;
  onCopy: () => void;
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

/** Present a read-only transcript with timed segments and explicit export actions. */
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
  return (
    <div className="space-y-6">
      <header>
        <Typography variant="eyebrow">
          {t('FROM SOUND TO SOMETHING USEFUL')}
        </Typography>
        <div className="mt-3 flex items-center gap-3">
          <Typography variant="title">
            {t(hasSpeech ? 'Your words, ready.' : 'No speech detected.')}
          </Typography>
          <span className="bg-accent/10 text-accent grid size-8 place-items-center rounded-full">
            <Icon className="size-4" name="check" />
          </span>
        </div>
        <p
          className="text-ink/70 mt-3 truncate text-sm"
          title={transcript.file.name}
        >
          {transcript.file.name}
        </p>
        <div className="text-ink/70 mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Icon className="size-3.5" name="clock-outline" />
            {formatTime(transcript.duration)}
          </span>
          <span className="capitalize">{languageName}</span>
          <span>
            {transcript.segments.length} {t('segments')}
          </span>
        </div>
      </header>
      {hasSpeech ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              aria-label={t('Transcript display')}
              className="border-ink/12 bg-surface flex rounded-xl border p-1"
              role="group"
            >
              <button
                aria-pressed={!isTimed}
                className={cn(
                  'rounded-lg px-4 py-2 text-xs font-semibold',
                  !isTimed ? 'bg-ink/5 text-ink' : 'text-ink/70',
                )}
                type="button"
                onClick={() => setIsTimed(false)}
              >
                {t('Text')}
              </button>
              <button
                aria-pressed={isTimed}
                className={cn(
                  'rounded-lg px-4 py-2 text-xs font-semibold',
                  isTimed ? 'bg-ink/5 text-ink' : 'text-ink/70',
                )}
                type="button"
                onClick={() => setIsTimed(true)}
              >
                {t('Timestamps')}
              </button>
            </div>
            <Button disabled={isDisabled} icon="content-copy" onClick={onCopy}>
              {t('Copy text')}
            </Button>
          </div>
          <article
            aria-label={t('Transcript')}
            className="border-ink/12 bg-surface min-h-60 rounded-2xl border p-6 shadow-xs sm:p-8"
          >
            {isTimed ? (
              <ol className="space-y-6">
                {transcript.segments.map((segment) => (
                  <li
                    key={segment.id}
                    className="grid grid-cols-[5rem_1fr] gap-4"
                  >
                    <span className="text-accent pt-1 font-mono text-xs">
                      {formatTime(segment.start)}
                    </span>
                    <p className="min-w-0 text-[15px] leading-7 break-words whitespace-pre-wrap">
                      {segment.text}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="space-y-5 text-[15px] leading-8 break-words whitespace-pre-wrap">
                {transcript.segments.map((segment) => (
                  <p key={segment.id}>{segment.text}</p>
                ))}
              </div>
            )}
          </article>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <Typography className="max-w-xs" variant="caption">
              {t(
                'Export to keep a copy. Transcripts are not saved when you close the app or start another transcription.',
              )}
            </Typography>
            <div className="flex items-end gap-2">
              <div>
                <label
                  className="text-ink/70 mb-1.5 block text-xs"
                  htmlFor="export-format"
                >
                  {t('Export format')}
                </label>
                <select
                  className="min-w-32"
                  disabled={isDisabled}
                  id="export-format"
                  value={format}
                  onChange={(event) =>
                    setFormat(event.target.value as ExportFormat)
                  }
                >
                  <option value="txt">TXT · {t('Plain text')}</option>
                  <option value="srt">SRT · {t('Subtitles')}</option>
                  <option value="vtt">VTT · {t('Web subtitles')}</option>
                </select>
              </div>
              <Button
                disabled={isDisabled}
                icon="download"
                variant="primary"
                onClick={() => onExport(format)}
              >
                {t('Export')}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <section className="border-ink/12 bg-surface rounded-2xl border p-10 text-center">
          <Icon className="text-ink/45 mx-auto mb-4 size-10" name="waveform" />
          <Typography className="font-medium" variant="sectionTitle">
            {t('The file was processed successfully.')}
          </Typography>
          <Typography className="mx-auto mt-3 max-w-md" variant="body">
            {t(
              'Check that the recording contains clear speech. You can try another model or select the spoken language manually.',
            )}
          </Typography>
        </section>
      )}
      <div className="border-ink/12 border-t pt-5">
        <Button icon="plus" variant="ghost" onClick={onNew}>
          {t('Transcribe another file')}
        </Button>
      </div>
    </div>
  );
};

export default FileTranscriptionScreen;
