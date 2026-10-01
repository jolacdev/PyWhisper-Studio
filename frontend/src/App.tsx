import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import { JobProgress, Notice } from '@components/Feedback';
import Icon from '@components/Icon';
import Typography from '@components/Typography';
import { useStudio } from '@features/studio/useStudio';
import FileSelectionScreen from '@screens/FileSelectionScreen';
import FileTranscriptionScreen from '@screens/FileTranscriptionScreen';
import ModelsScreen from '@screens/ModelsScreen';
import { cn } from '@utils/cn';
import type { IconName } from '@components/Icon';
import type { Preferences } from 'types/pywebview/pywebview-api';

type Page = 'models' | 'new' | 'transcript';
type Theme = Preferences['theme'];
const themeIcons: Record<Theme, IconName> = {
  dark: 'weather-night',
  light: 'weather-sunny',
  system: 'monitor',
};

/** Coordinate navigation and UI preferences around the backend-owned workflow. */
const App = () => {
  const { i18n, t } = useTranslation();
  const { act, clearError, error, setError, state, transcript, isPending } =
    useStudio();
  const [navigation, setNavigation] = useState<{
    resultId: null | string;
    page: Page;
  }>({ resultId: null, page: 'new' });
  const [message, setMessage] = useState<null | string>(null);
  const theme = state?.preferences.theme ?? 'system';
  const interfaceLanguage = state?.preferences.interfaceLanguage;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!interfaceLanguage) {
      return;
    }
    const language =
      interfaceLanguage === 'system'
        ? navigator.language.startsWith('es')
          ? 'es-ES'
          : 'en'
        : interfaceLanguage;
    document.documentElement.lang = language;
    i18n
      .changeLanguage(language)
      .catch((reason: Error) => setError(reason.message));
  }, [interfaceLanguage, i18n, setError]);
  // A new result opens once; subsequent navigation never gets overridden by progress events.
  const page =
    transcript && transcript.id !== navigation.resultId
      ? 'transcript'
      : navigation.page;
  useEffect(() => {
    document.getElementById('workspace')?.focus();
  }, [page]);

  if (!state) {
    return (
      <main className="mx-auto max-w-lg p-12">
        {error ? (
          <Notice isError>{t(error)}</Notice>
        ) : (
          <p role="status">{t('Opening your workspace…')}</p>
        )}
      </main>
    );
  }
  const isBusy = ['loading', 'running', 'cancelling'].includes(
    state.job.status,
  );
  const isDisabled = isBusy || isPending;
  const navigate = (next: Page) => {
    setNavigation({ resultId: transcript?.id ?? null, page: next });
    setMessage(null);
  };
  const api = window.pywebview.api;
  const selectedModel = state.models.find(
    (model) => model.id === state.preferences.modelId && model.isAvailable,
  );
  const changePreferences = (modelId: string, language: string) =>
    act(() => api.set_preferences(modelId, language));
  const startTranscription = () => {
    const file = state.transcriptionFile;
    if (!file || !selectedModel) {
      return;
    }
    if (
      transcript &&
      !window.confirm(
        t(
          'Starting a new transcription will replace this result. Have you exported anything you want to keep?',
        ),
      )
    ) {
      return;
    }
    setMessage(null);
    act(() =>
      api.run_transcription(
        file.absolutePath,
        selectedModel.id,
        state.preferences.language,
      ),
    );
  };
  const navItems: { id: Page; icon: IconName; label: string }[] = [
    { id: 'new', icon: 'plus', label: t('New transcription') },
    { id: 'models', icon: 'layers-outline', label: t('Models') },
    {
      id: 'transcript',
      icon: 'file-document-outline',
      label: t('Current transcript'),
    },
  ];
  const isPreview =
    import.meta.env.DEV && new URLSearchParams(location.search).has('preview');
  return (
    <div className="min-h-screen md:grid md:grid-cols-[210px_minmax(0,1fr)]">
      <a
        className="bg-surface sr-only z-50 rounded-lg p-3 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        href="#workspace"
      >
        {t('Skip to content')}
      </a>
      <aside
        className={cn(
          'border-ink/12 bg-ink/3 border-b px-4 py-5 md:sticky md:top-0 md:flex',
          'md:h-screen md:flex-col md:border-r md:border-b-0 md:py-8',
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="bg-accent text-canvas grid size-10 place-items-center rounded-xl">
            <Icon className="size-6" name="waveform" />
          </div>
          <div className="text-sm leading-5 font-semibold tracking-tight">
            PyWhisper
            <span className="text-ink/70 block text-xs font-normal tracking-wide">
              Studio
            </span>
          </div>
        </div>
        <nav
          aria-label={t('Workspace navigation')}
          className="mt-7 flex flex-wrap gap-1 md:mt-10 md:flex-col"
        >
          {navItems
            .filter((item) => item.id !== 'transcript' || transcript)
            .map((item) => (
              <button
                key={item.id}
                aria-current={page === item.id ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm',
                  'transition-colors',
                  page === item.id
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-ink/70 hover:bg-ink/5 hover:text-ink',
                )}
                type="button"
                onClick={() => navigate(item.id)}
              >
                <Icon className="size-4" name={item.icon} />
                {item.label}
              </button>
            ))}
        </nav>
        <div className="border-ink/10 bg-surface/50 mt-7 hidden rounded-xl border p-4 md:block">
          <Typography as="span" variant="eyebrow">
            {t('LOCAL ENGINE')}
          </Typography>
          <div className="mt-3 flex items-center gap-2 text-xs font-medium">
            <span
              className={cn(
                'size-1.5 rounded-full',
                selectedModel ? 'bg-accent' : 'bg-ink/45',
              )}
            />
            {selectedModel ? selectedModel.name : t('No model selected')}
          </div>
          <p className="text-ink/70 mt-2 text-[11px] leading-5">
            {t(
              selectedModel
                ? 'Ready to work offline.'
                : 'Set up once. Use offline.',
            )}
          </p>
        </div>
        <div className="mt-5 flex items-center gap-4 md:mt-auto md:block md:pt-8">
          <label className="sr-only" htmlFor="ui-language">
            {t('Interface language')}
          </label>
          <select
            className="max-w-40 text-xs md:max-w-full"
            id="ui-language"
            value={i18n.language.startsWith('es') ? 'es-ES' : 'en'}
            onChange={(event) => {
              const language = event.target.value;
              act(() =>
                api.set_appearance(
                  theme,
                  language === 'es-ES' ? 'es-ES' : 'en',
                ),
              );
            }}
          >
            <option value="en">English</option>
            <option value="es-ES">Español (España)</option>
          </select>
          <div
            aria-label={t('Appearance')}
            className="border-ink/12 flex w-fit gap-1 rounded-xl border p-1 md:mt-3"
            role="group"
          >
            {(Object.keys(themeIcons) as Theme[]).map((mode) => (
              <button
                key={mode}
                aria-label={t(mode)}
                aria-pressed={theme === mode}
                className={cn(
                  'rounded-lg p-2',
                  theme === mode
                    ? 'bg-surface text-ink shadow-xs'
                    : 'text-ink/70 hover:text-ink',
                )}
                title={t(mode)}
                type="button"
                onClick={() =>
                  act(() =>
                    api.set_appearance(
                      mode,
                      state.preferences.interfaceLanguage,
                    ),
                  )
                }
              >
                <Icon className="size-4" name={themeIcons[mode]} />
              </button>
            ))}
          </div>
          <p className="text-ink/70 mt-5 hidden items-center gap-1.5 text-[10px] md:flex">
            <Icon className="size-3" name="shield-check-outline" />
            {t('Private by design')}
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="border-ink/12 flex h-16 items-center justify-between gap-4 border-b px-6 text-xs md:px-10">
          <span className="text-ink/70">
            {t('Workspace')}
            <span className="text-ink/45 mx-3">/</span>
            <span className="text-ink">
              {navItems.find((item) => item.id === page)?.label}
            </span>
          </span>
          <span className="text-ink/70 flex items-center gap-1.5">
            <Icon className="size-3.5" name="shield-check-outline" />
            {t('On your computer')}
          </span>
        </div>
        <main
          className="mx-auto max-w-4xl space-y-5 px-6 py-8 outline-none md:px-10 md:py-10"
          id="workspace"
          tabIndex={-1}
        >
          {isPreview && (
            <Notice>
              {t(
                'Interface preview — files, downloads and results are simulated.',
              )}
            </Notice>
          )}
          {(error || state.notice) && (
            <Notice isError onDismiss={error ? clearError : undefined}>
              {t(error || state.notice || '')}
            </Notice>
          )}
          {message && (
            <Notice onDismiss={() => setMessage(null)}>{message}</Notice>
          )}
          {state.job.status === 'error' && (
            <Notice isError>
              <p className="font-semibold">
                {t(
                  state.job.kind === 'download'
                    ? 'The model could not be downloaded.'
                    : 'The file could not be transcribed.',
                )}
              </p>
              <p className="mt-1">
                {t(
                  state.job.kind === 'download'
                    ? 'Check your connection and free disk space, then try the download again. You can also choose a local model folder.'
                    : 'Check the recording and model, then try again.',
                )}
              </p>
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer">
                  {t('Technical details')}
                </summary>
                <p className="mt-2 whitespace-pre-wrap">
                  {t(state.job.error || '')}
                </p>
              </details>
            </Notice>
          )}
          {state.job.status === 'cancelled' && (
            <Notice>
              {t('Task cancelled. You can start again when you’re ready.')}
            </Notice>
          )}
          {state.job.status === 'completed' &&
            state.job.kind === 'download' && (
              <Notice>
                {t('Your model is ready. You can now transcribe offline.')}
              </Notice>
            )}
          {isBusy && (
            <JobProgress
              job={state.job}
              onCancel={() => act(() => api.cancel_job(state.job.id))}
            />
          )}
          {page === 'models' && (
            <ModelsScreen
              isDisabled={isDisabled}
              state={state}
              onContinue={() => navigate('new')}
              onDownload={(id) => act(() => api.download_model(id))}
              onImport={() => act(() => api.select_model_folder())}
              onOpenFolder={() => act(() => api.open_models_folder())}
              onRefresh={() => act(() => api.refresh_models())}
              onSelect={(id) =>
                changePreferences(id, state.preferences.language)
              }
            />
          )}
          {page === 'new' &&
            (isBusy && state.job.kind === 'transcription' ? (
              <section className="border-ink/12 bg-surface rounded-2xl border px-8 py-16 text-center">
                <Icon
                  className="text-accent mx-auto mb-6 size-12"
                  name="waveform"
                />
                <Typography className="text-2xl" variant="title">
                  {t('Finding the words.')}
                </Typography>
                <p
                  className="text-ink/70 mx-auto mt-4 max-w-md truncate text-sm"
                  title={state.transcriptionFile?.name}
                >
                  {state.transcriptionFile?.name}
                </p>
                <p className="text-ink/70 mt-3 text-xs">
                  {t('Longer recordings and larger models take more time.')}
                </p>
              </section>
            ) : (
              <FileSelectionScreen
                isDisabled={isDisabled}
                state={state}
                onClearFile={() => act(() => api.clear_file())}
                onModels={() => navigate('models')}
                onPickFile={() => act(() => api.open_file_dialog())}
                onPreferences={changePreferences}
                onTranscribe={startTranscription}
              />
            ))}
          {page === 'transcript' && transcript && (
            <FileTranscriptionScreen
              isDisabled={isDisabled}
              transcript={transcript}
              onCopy={() =>
                act(async () => {
                  await navigator.clipboard.writeText(
                    transcript.segments
                      .map((segment) => segment.text)
                      .join('\n\n'),
                  );
                  setMessage(t('Text copied to the clipboard.'));
                })
              }
              onExport={(format) =>
                act(async () => {
                  const path = await api.export_transcript(
                    transcript.id,
                    format,
                  );
                  if (path) {
                    setMessage(t('Saved to {{path}}', { path }));
                  }
                })
              }
              onNew={() => {
                navigate('new');
                act(() => api.clear_file());
              }}
            />
          )}
          {page === 'transcript' && !transcript && (
            <Button onClick={() => navigate('new')}>
              {t('Back to transcription')}
            </Button>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
