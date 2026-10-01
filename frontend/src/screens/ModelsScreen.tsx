import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import Icon from '@components/Icon';
import Typography from '@components/Typography';
import { cn } from '@utils/cn';
import type { AppState } from 'types/pywebview/pywebview-api';

type ModelsScreenProps = {
  state: AppState;
  isDisabled: boolean;
  onContinue: () => void;
  onDownload: (id: string) => void;
  onImport: () => void;
  onOpenFolder: () => void;
  onRefresh: () => void;
  onSelect: (id: string) => void;
};

/** Explain model setup briefly, with storage and compatibility details on demand. */
const ModelsScreen = ({
  onContinue,
  onDownload,
  onImport,
  onOpenFolder,
  onRefresh,
  onSelect,
  state,
  isDisabled,
}: ModelsScreenProps) => {
  const { t } = useTranslation();
  const hasModel = state.models.some(
    (model) => model.id === state.preferences.modelId && model.isAvailable,
  );
  const models = [...state.models].sort(
    (a, b) =>
      Number(b.isAvailable) - Number(a.isAvailable) ||
      Number(b.isRecommended) - Number(a.isRecommended),
  );
  return (
    <div className="space-y-6">
      <header>
        <Typography variant="eyebrow">{t('A ONE-TIME SETUP')}</Typography>
        <Typography className="mt-3" variant="title">
          {t('A model for your words.')}
        </Typography>
        <Typography className="mt-3 max-w-xl" variant="body">
          {t(
            'A model is a speech recognition pack. Download one once, then transcribe without an internet connection.',
          )}
        </Typography>
      </header>
      <section className="border-ink/12 bg-surface flex flex-wrap items-center gap-4 rounded-2xl border p-5">
        <div className="bg-accent/10 text-accent grid size-11 shrink-0 place-items-center rounded-xl">
          <Icon name="folder-outline" />
        </div>
        <div className="min-w-48 flex-1">
          <Typography className="text-sm font-semibold" variant="sectionTitle">
            {t('Already have a model?')}
          </Typography>
          <p className="text-ink/70 mt-1 text-xs leading-5">
            {t('Use a local folder. No download or duplicate files.')}
          </p>
        </div>
        <Button disabled={isDisabled} onClick={onImport}>
          {t('Choose model folder')}
        </Button>
      </section>
      <div className="flex items-center justify-between gap-3">
        <Typography className="text-sm font-semibold" variant="sectionTitle">
          {t('Choose your balance of speed and accuracy')}
        </Typography>
        <Button
          aria-label={t('Refresh local models')}
          disabled={isDisabled}
          icon="refresh"
          variant="ghost"
          onClick={onRefresh}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {models.map((model) => {
          const isSelected =
            model.isAvailable && model.id === state.preferences.modelId;
          const isDownloading =
            state.job.kind === 'download' &&
            state.job.modelId === model.id &&
            ['loading', 'running', 'cancelling'].includes(state.job.status);
          return (
            <article
              key={model.id}
              className={cn(
                'flex flex-col rounded-2xl border p-5',
                isSelected
                  ? 'border-accent/50 bg-accent/10'
                  : 'border-ink/12 bg-surface',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Typography
                  className="truncate font-semibold"
                  title={model.name}
                  variant="subtitle"
                >
                  {model.name}
                </Typography>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide',
                    model.isAvailable
                      ? 'bg-accent/10 text-accent'
                      : 'bg-ink/5 text-ink/70',
                  )}
                >
                  {t(
                    model.isAvailable
                      ? 'ON YOUR COMPUTER'
                      : model.isRecommended
                        ? 'START HERE'
                        : 'DOWNLOAD',
                  )}
                </span>
              </div>
              <p className="text-ink/70 mt-3 flex-1 text-sm leading-6">
                {t(model.description)}
              </p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-ink/70 text-xs">
                  {t(model.sizeLabel)}
                </span>
                {model.isAvailable ? (
                  <Button
                    disabled={isDisabled || isSelected}
                    icon={isSelected ? 'check' : undefined}
                    variant={isSelected ? 'ghost' : 'secondary'}
                    onClick={() => onSelect(model.id)}
                  >
                    {t(isSelected ? 'Selected' : 'Use model')}
                  </Button>
                ) : model.sourceUrl ? (
                  <Button
                    disabled={isDisabled}
                    icon="download"
                    onClick={() => onDownload(model.id)}
                  >
                    {t(isDownloading ? 'Downloading…' : 'Download')}
                  </Button>
                ) : (
                  <Button disabled={isDisabled} onClick={onImport}>
                    {t('Locate folder')}
                  </Button>
                )}
              </div>
              {model.path && (
                <p
                  className="text-ink/70 mt-3 truncate text-[10px]"
                  title={model.path}
                >
                  {model.path}
                </p>
              )}
            </article>
          );
        })}
      </div>
      <details className="border-ink/12 bg-surface rounded-xl border px-5 py-4 text-sm">
        <summary className="cursor-pointer font-medium">
          {t('Storage, compatibility and download sources')}
        </summary>
        <div className="text-ink/70 mt-4 space-y-4 text-xs leading-6">
          <p>{t(state.engine.modelFormat)}</p>
          <p>
            {t(
              'Downloads come from the sources listed below. Your recordings are never sent there.',
            )}
          </p>
          <p>
            {t(
              'Larger models need more memory and run more slowly. Download sizes are approximate. This version processes audio on the CPU.',
            )}
          </p>
          <div>
            <span>{t('Managed model folder')}</span>
            <code className="bg-canvas mt-1 block rounded-lg p-3 break-all">
              {state.modelsDirectory}
            </code>
            <Button
              className="mt-3"
              icon="folder-outline"
              onClick={onOpenFolder}
            >
              {t('Open folder')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {state.models
              .filter((model) => model.sourceUrl)
              .map((model) => (
                <a
                  key={model.id}
                  className="text-accent inline-flex items-center gap-1 underline underline-offset-4"
                  href={model.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {model.name}
                  <Icon className="size-3" name="open-in-new" />
                </a>
              ))}
          </div>
        </div>
      </details>
      {hasModel && (
        <div className="flex justify-end">
          <Button icon="arrow-right" variant="primary" onClick={onContinue}>
            {t('Back to transcription')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ModelsScreen;
