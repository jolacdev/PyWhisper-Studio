import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import { JobProgress, Notice, Notifications } from '@components/Feedback';
import Icon from '@components/Icon';
import Select from '@components/Select';
import Typography from '@components/Typography';
import { useTranscription } from '@features/transcription/useTranscription';
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

/** Coordinate navigation and native commands around backend-owned transcription state. */
const App = () => {
  const { i18n, t } = useTranslation();
  const { act, error, setError, state, transcript, isPending } =
    useTranscription();
  const [navigation, setNavigation] = useState<{
    resultId: null | string;
    page: Page;
  }>({ resultId: null, page: 'new' });
  const theme = state?.preferences.theme ?? 'system';
  const interfaceLanguage = state?.preferences.interfaceLanguage;
  // Open each completed result once without overriding subsequent navigation.
  const page =
    transcript && transcript.id !== navigation.resultId
      ? 'transcript'
      : navigation.page;
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
  useEffect(() => {
    const workspace = document.getElementById('workspace');
    workspace?.scrollTo({ top: 0 });
    workspace?.focus({ preventScroll: true });
  }, [page]);
  useEffect(() => {
    if (page !== 'new') {
      return;
    }
    // A source file can move while the app is in the background; no polling is needed.
    const refresh = () => {
      window.pywebview.api
        .refresh_file()
        .catch((reason: Error) => setError(reason.message));
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [page, setError]);
  useEffect(() => {
    if (error) {
      toast.error(t(error), { id: 'command-error' });
    } else {
      toast.dismiss('command-error');
    }
  }, [error, t]);
  const notice = state?.notice;
  useEffect(() => {
    if (notice) {
      toast.error(t(notice), { id: 'file-notice' });
    } else {
      toast.dismiss('file-notice');
    }
  }, [notice, t]);
  const {
    id: jobId,
    error: jobError,
    kind: jobKind,
    status: jobStatus,
  } = state?.job ?? {};
  useEffect(() => {
    if (!jobId) {
      return;
    }
    if (jobStatus === 'error') {
      toast.error(
        <div className="space-y-2">
          <p className="font-semibold">
            {t(
              jobKind === 'download'
                ? 'The model could not be downloaded.'
                : 'The file could not be transcribed.',
            )}
          </p>
          <p>
            {t(
              jobKind === 'download'
                ? 'Check your connection and free disk space, then try again.'
                : 'Check the recording and model, then try again.',
            )}
          </p>
          <details className="text-xs">
            <summary className="cursor-pointer">
              {t('Technical details')}
            </summary>
            <p className="mt-2 max-h-40 overflow-auto break-words whitespace-pre-wrap">
              {t(jobError || '')}
            </p>
          </details>
        </div>,
        { id: `job-${jobId}` },
      );
    } else if (jobStatus === 'cancelled') {
      toast(t('Task cancelled.'), { id: `job-${jobId}` });
    } else if (jobStatus === 'completed' && jobKind === 'download') {
      toast.success(t('Model downloaded. Ready to transcribe offline.'), {
        id: `job-${jobId}`,
      });
    }
  }, [jobId, jobStatus, jobError, jobKind, t]);

  if (!state) {
    return (
      <main className="mx-auto max-w-lg p-12">
        <Notifications />
        <p role="status">{t(error || 'Opening your workspace…')}</p>
      </main>
    );
  }
  const isBusy = ['loading', 'running', 'cancelling'].includes(
    state.job.status,
  );
  const isDisabled = isBusy || isPending;
  const api = window.pywebview.api;
  const selectedModel = state.models.find(
    (model) => model.id === state.preferences.modelId && model.isAvailable,
  );
  const navigate = (next: Page) => {
    setNavigation({ resultId: transcript?.id ?? null, page: next });
  };
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
    toast.dismiss();
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
    { id: 'transcript', icon: 'file-document-outline', label: t('Transcript') },
    { id: 'models', icon: 'layers-outline', label: t('Models') },
  ];
  const isPreview =
    import.meta.env.DEV && new URLSearchParams(location.search).has('preview');
  return (
    <div className="h-dvh overflow-auto sm:grid sm:grid-cols-[216px_minmax(0,1fr)] sm:overflow-hidden">
      <Notifications />
      <a
        className="bg-surface sr-only z-50 rounded-xl p-3 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        href="#workspace"
      >
        {t('Skip to content')}
      </a>
      <aside
        className={cn(
          'border-ink/12 bg-ink/3 flex flex-col gap-6 border-b p-4 sm:h-full sm:overflow-y-auto',
          'sm:border-r sm:border-b-0 sm:py-6',
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="bg-accent text-canvas grid size-9 place-items-center rounded-xl">
            <Icon name="waveform" />
          </div>
          <div className="text-sm leading-5 font-semibold">
            PyWhisper
            <span className="text-ink/70 block text-xs font-normal">
              Studio
            </span>
          </div>
        </div>
        <nav
          aria-label={t('Workspace navigation')}
          className="flex gap-1 sm:flex-col"
        >
          {navItems
            .filter((item) => item.id !== 'transcript' || transcript)
            .map((item) => (
              <button
                key={item.id}
                aria-current={page === item.id ? 'page' : undefined}
                className={cn(
                  'flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                  page === item.id
                    ? 'bg-ink/8 text-ink font-semibold'
                    : 'text-ink/70 hover:bg-ink/5 hover:text-ink',
                )}
                type="button"
                onClick={() => navigate(item.id)}
              >
                <Icon className="size-4 shrink-0" name={item.icon} />
                {item.label}
              </button>
            ))}
        </nav>
        <button
          className={cn(
            'border-ink/12 hover:bg-ink/5 hidden items-center gap-3 rounded-xl border p-3 text-left',
            'transition-colors sm:flex',
          )}
          type="button"
          onClick={() => navigate('models')}
        >
          <Icon className="text-ink/60 size-4 shrink-0" name="layers-outline" />
          <span className="min-w-0 flex-1">
            <span className="text-ink/70 block text-xs">
              {t('Selected model')}
            </span>
            <span className="mt-1 block truncate text-sm font-medium">
              {selectedModel?.name ?? t('Set up a model')}
            </span>
          </span>
          <Icon className="text-ink/60 size-4" name="chevron-right" />
        </button>
        <div className="mt-auto space-y-4">
          <div>
            <label
              className="text-ink/70 mb-2 block text-xs"
              htmlFor="ui-language"
            >
              {t('Interface language')}
            </label>
            <Select
              disabled={isPending}
              id="ui-language"
              value={i18n.language.startsWith('es') ? 'es-ES' : 'en'}
              onChange={(event) => {
                const language =
                  event.target.value === 'es-ES' ? 'es-ES' : 'en';
                act(() => api.set_appearance(theme, language));
              }}
            >
              <option value="en">English</option>
              <option value="es-ES">Español (España)</option>
            </Select>
          </div>
          <div>
            <p className="text-ink/70 mb-2 text-xs">{t('Appearance')}</p>
            <div
              aria-label={t('Appearance')}
              className="border-ink/12 grid grid-cols-3 gap-1 rounded-xl border p-1"
              role="group"
            >
              {(Object.keys(themeIcons) as Theme[]).map((mode) => (
                <button
                  key={mode}
                  aria-label={t(mode)}
                  aria-pressed={theme === mode}
                  className={cn(
                    'flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] transition-colors',
                    theme === mode
                      ? 'bg-surface text-ink shadow-xs'
                      : 'text-ink/70 hover:bg-ink/5 hover:text-ink',
                  )}
                  disabled={isPending}
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
                  {t(mode)}
                </button>
              ))}
            </div>
          </div>
          <p className="border-ink/12 text-ink/70 flex items-center justify-center gap-2 border-t pt-4 text-xs">
            <Icon className="size-4" name="shield-check-outline" />
            {t('Private by design')}
          </p>
        </div>
      </aside>
      <main
        className="min-w-0 overflow-y-auto outline-none"
        id="workspace"
        tabIndex={-1}
      >
        <div
          className={cn(
            'mx-auto flex min-h-full max-w-5xl flex-col gap-5 p-6 lg:px-9 lg:py-7',
            page === 'transcript' && 'h-full',
          )}
        >
          {isPreview && (
            <Notice>
              {t(
                'Interface preview — files, downloads and results are simulated.',
              )}
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
                act(() => api.set_preferences(id, state.preferences.language))
              }
            />
          )}
          {page === 'new' &&
            (isBusy && state.job.kind === 'transcription' ? (
              <section className="border-ink/12 bg-surface rounded-2xl border p-8">
                <Typography variant="title">
                  {t('Transcribing file')}
                </Typography>
                <p
                  className="text-ink/70 mt-3 truncate text-sm"
                  title={state.transcriptionFile?.name}
                >
                  {state.transcriptionFile?.name}
                </p>
                <Typography className="mt-3" variant="caption">
                  {t('Longer recordings and larger models take more time.')}
                </Typography>
              </section>
            ) : (
              <FileSelectionScreen
                isDisabled={isDisabled}
                state={state}
                onClearFile={() => act(() => api.clear_file())}
                onModels={() => navigate('models')}
                onPickFile={() => act(() => api.open_file_dialog())}
                onPreferences={(id, language) =>
                  act(() => api.set_preferences(id, language))
                }
                onTranscribe={startTranscription}
              />
            ))}
          {page === 'transcript' && transcript && (
            <FileTranscriptionScreen
              isDisabled={isDisabled}
              transcript={transcript}
              onCopy={(text) =>
                act(async () => {
                  await navigator.clipboard.writeText(text);
                  toast.success(t('Text copied to the clipboard.'), {
                    id: 'clipboard',
                  });
                })
              }
              onExport={(format) =>
                act(async () => {
                  const path = await api.export_transcript(
                    transcript.id,
                    format,
                  );
                  if (path) {
                    toast.success(t('Saved to {{path}}', { path }));
                  }
                })
              }
              onNew={() => navigate('new')}
            />
          )}
          {page === 'transcript' && !transcript && (
            <Button onClick={() => navigate('new')}>
              {t('Back to transcription')}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
