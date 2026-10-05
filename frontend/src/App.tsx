import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import { JobProgress, Notice, Notifications } from '@components/Feedback';
import Icon from '@components/Icon';
import Select from '@components/Select';
import { useTranscription } from '@features/transcription/useTranscription';
import FileSelectionScreen from '@screens/FileSelectionScreen';
import FileTranscriptionScreen from '@screens/FileTranscriptionScreen';
import ModelsScreen from '@screens/ModelsScreen';
import { cn } from '@utils/cn';
import type { IconName } from '@components/Icon';
import type { Preferences } from 'types/pywebview/pywebview-api';

import { messageKey } from './i18n/legacyMessages';

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
      toast.error(t(messageKey(error)), { id: 'command-error' });
    } else {
      toast.dismiss('command-error');
    }
    // The same error should not reopen when only the interface language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
  const notice = state?.notice;
  useEffect(() => {
    if (notice) {
      toast.error(t(messageKey(notice)), { id: 'file-notice' });
    } else {
      toast.dismiss('file-notice');
    }
    // Keep notices tied to backend changes, not translation rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);
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
                ? 'errors.downloadFailed'
                : 'errors.transcriptionFailed',
            )}
          </p>
          <p>
            {t(
              jobKind === 'download'
                ? 'errors.checkDownload'
                : 'errors.checkRecording',
            )}
          </p>
          <details className="text-xs">
            <summary className="cursor-pointer">
              {t('errors.technicalDetails')}
            </summary>
            <p className="mt-2 max-h-40 overflow-auto break-words whitespace-pre-wrap">
              {t(messageKey(jobError || ''))}
            </p>
          </details>
        </div>,
        { id: `job-${jobId}` },
      );
    } else if (jobStatus === 'cancelled') {
      toast(t('progress.cancelled'), { id: `job-${jobId}` });
    } else if (jobStatus === 'completed' && jobKind === 'download') {
      toast.success(t('models.downloadComplete'), {
        id: `job-${jobId}`,
      });
    }
    // A job notification belongs to a status transition, not a locale change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, jobStatus, jobError, jobKind]);

  if (!state) {
    return (
      <main className="mx-auto max-w-lg p-12">
        <Notifications />
        <p role="status">
          {error ? t(messageKey(error)) : t('startup.opening')}
        </p>
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
    if (transcript && !window.confirm(t('transcript.replaceConfirm'))) {
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
    { id: 'new', icon: 'plus', label: t('file.title') },
    {
      id: 'transcript',
      icon: 'file-document-outline',
      label: t('transcript.title'),
    },
    { id: 'models', icon: 'layers-outline', label: t('models.title') },
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
        {t('app.skipContent')}
      </a>
      <aside
        className={cn(
          'border-ink/12 bg-ink/3 flex flex-col gap-6 border-b p-4 sm:h-full sm:overflow-y-auto',
          'sm:border-r sm:border-b-0 sm:py-6',
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <img alt="" className="size-9 rounded-xl" src="/logo.svg" />
          <div className="text-lg font-semibold tracking-tight">
            {t('app.name')}
          </div>
        </div>
        <nav
          aria-label={t('app.navigation')}
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
        <div className="border-ink/12 flex items-center gap-3 border-t px-3 pt-4">
          <Icon className="text-ink/60 size-4 shrink-0" name="layers-outline" />
          <span className="min-w-0 flex-1">
            <span className="text-ink/70 block text-xs">
              {t('app.selectedModel')}
            </span>
            <span
              className="mt-1 block truncate text-sm font-medium"
              title={selectedModel?.name}
            >
              {selectedModel?.name ?? t('models.noneSelected')}
            </span>
          </span>
        </div>
        <div className="mt-auto space-y-4">
          <div>
            <label
              className="text-ink/70 mb-2 block text-xs"
              htmlFor="ui-language"
            >
              {t('app.interfaceLanguage')}
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
            <p className="text-ink/70 mb-2 text-xs">{t('app.appearance')}</p>
            <div
              aria-label={t('app.appearance')}
              className="border-ink/12 grid grid-cols-3 gap-1 rounded-xl border p-1"
              role="group"
            >
              {(Object.keys(themeIcons) as Theme[]).map((mode) => (
                <button
                  key={mode}
                  aria-label={t(`app.${mode}`)}
                  aria-pressed={theme === mode}
                  className={cn(
                    'flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] transition-colors focus-visible:z-10',
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
                  {t(`app.${mode}`)}
                </button>
              ))}
            </div>
          </div>
          <p className="border-ink/12 text-ink/70 flex items-center justify-center gap-2 border-t pt-4 text-xs">
            <Icon className="size-4" name="shield-check-outline" />
            {t('app.private')}
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
          {isPreview && <Notice>{t('app.previewNotice')}</Notice>}
          {isBusy && (
            <JobProgress
              file={
                state.job.kind === 'transcription'
                  ? state.transcriptionFile
                  : null
              }
              job={state.job}
              modelName={
                state.models.find((model) => model.id === state.job.modelId)
                  ?.name ?? state.job.modelId
              }
              onCancel={() => act(() => api.cancel_job(state.job.id))}
            />
          )}
          {page === 'models' && (
            <ModelsScreen
              isDisabled={isDisabled}
              state={state}
              onContinue={() => navigate('new')}
              onDelete={(id) =>
                act(async () => {
                  await api.delete_model(id);
                  toast.success(t('models.deleteComplete'));
                })
              }
              onDownload={(id) => act(() => api.download_model(id))}
              onImport={() => act(() => api.select_model_folder())}
              onOpenFolder={() => act(() => api.open_models_folder())}
              onRefresh={() => act(() => api.refresh_models())}
              onRelink={(id) => act(() => api.select_model_folder(id))}
              onSelect={(id) =>
                act(() => api.set_preferences(id, state.preferences.language))
              }
              onUnlink={(id) => act(() => api.unlink_model(id))}
            />
          )}
          {page === 'new' &&
            !(isBusy && state.job.kind === 'transcription') && (
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
            )}
          {page === 'transcript' && transcript && (
            <FileTranscriptionScreen
              isDisabled={isDisabled}
              transcript={transcript}
              onCopy={async (text) => {
                try {
                  await navigator.clipboard.writeText(text);
                } catch (reason) {
                  setError(
                    reason instanceof Error ? reason.message : String(reason),
                  );
                  throw reason;
                }
              }}
              onExport={(format) =>
                act(async () => {
                  const path = await api.export_transcript(
                    transcript.id,
                    format,
                  );
                  if (path) {
                    toast.success(t('transcript.savedTo', { path }));
                  }
                })
              }
            />
          )}
          {page === 'transcript' && !transcript && (
            <Button onClick={() => navigate('new')}>
              {t('common.backToTranscription')}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
