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
        <Typography variant="title">{t('Models')}</Typography>
        <Typography className="mt-3 max-w-xl" variant="body">
          {t(
            'A model recognises speech in your recordings. Use a local folder or download a model to transcribe offline.',
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
          {t('Available models')}
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
                      ? 'Available locally'
                      : model.isRecommended
                        ? 'Recommended'
                        : 'Not downloaded',
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
          {t('Where are models stored, and which folders can I use?')}
        </summary>
        <div className="mt-5 space-y-5">
          <section>
            <Typography variant="subtitle">
              {t('Models downloaded by the app')}
            </Typography>
            <Typography className="mt-1" variant="caption">
              {t(
                'Downloads are saved here automatically. You do not need to move or unpack them.',
              )}
            </Typography>
            <code className="bg-canvas text-ink/70 mt-2 block rounded-lg p-3 text-xs break-all">
              {state.modelsDirectory}
            </code>
            <Button
              className="mt-2"
              icon="folder-outline"
              onClick={onOpenFolder}
            >
              {t('Open folder')}
            </Button>
          </section>
          <section>
            <Typography variant="subtitle">
              {t('Using a model you already have')}
            </Typography>
            <Typography className="mt-1" variant="caption">
              {t(
                'Choose the folder containing the model files, not the parent downloads folder. The files stay in their original location.',
              )}
            </Typography>
            <Typography className="mt-2" variant="caption">
              {t(state.engine.modelFormat)}
            </Typography>
          </section>
          <section>
            <Typography variant="subtitle">{t('Choosing a model')}</Typography>
            <Typography className="mt-1" variant="caption">
              {t(
                'Start with Base for general use or Tiny for speed. Larger models need more memory and processing time. Sizes shown are approximate downloads.',
              )}
            </Typography>
            <Typography className="mt-2" variant="caption">
              {t('This version processes audio on the CPU.')}
            </Typography>
          </section>
          <section>
            <Typography variant="subtitle">{t('Download sources')}</Typography>
            <Typography className="mt-1" variant="caption">
              {t(
                'The app downloads model files from these pages. Your recordings are never uploaded.',
              )}
            </Typography>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {state.models
                .filter((model) => model.sourceUrl)
                .map((model) => (
                  <a
                    key={model.id}
                    className="text-accent inline-flex items-center gap-1 text-xs underline underline-offset-4"
                    href={model.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {model.name}
                    <Icon className="size-3" name="open-in-new" />
                  </a>
                ))}
            </div>
          </section>
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
