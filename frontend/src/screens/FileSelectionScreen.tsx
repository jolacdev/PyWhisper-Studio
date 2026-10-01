import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import Icon from '@components/Icon';
import Typography from '@components/Typography';
import { cn } from '@utils/cn';
import { formatSizeUnit } from '@utils/formatSizeUnit';
import type { AppState } from 'types/pywebview/pywebview-api';

type FileSelectionScreenProps = {
  state: AppState;
  isDisabled: boolean;
  onClearFile: () => void;
  onModels: () => void;
  onPickFile: () => void;
  onPreferences: (modelId: string, language: string) => void;
  onTranscribe: () => void;
};

/** Compose the input workflow while Python validates files and model choices. */
const FileSelectionScreen = ({
  onClearFile,
  onModels,
  onPickFile,
  onPreferences,
  onTranscribe,
  state,
  isDisabled,
}: FileSelectionScreenProps) => {
  const { i18n, t } = useTranslation();
  const languageNames = new Intl.DisplayNames([i18n.language], {
    type: 'language',
  });
  const [isDropAvailable, setIsDropAvailable] = useState(false);
  const file = state.transcriptionFile;
  const availableModels = state.models.filter((model) => model.isAvailable);
  const model = availableModels.find(
    (item) => item.id === state.preferences.modelId,
  );
  useEffect(() => {
    let isMounted = true;
    window.pywebview.api
      .bind_dropzone()
      .then((isAvailable) => {
        if (isMounted) {
          setIsDropAvailable(isAvailable);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsDropAvailable(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);
  return (
    <div className="space-y-6">
      <header className="mb-8">
        <Typography variant="eyebrow">
          {t('YOUR PRIVATE TRANSCRIPTION SPACE')}
        </Typography>
        <Typography className="mt-3 text-4xl" variant="title">
          {t('Less typing.')}
          <br />
          <span className="text-accent">{t('More possibility.')}</span>
        </Typography>
        <Typography className="mt-4 max-w-lg" variant="body">
          {t('Turn audio and video into text, entirely on your computer.')}
        </Typography>
      </header>
      {!model && (
        <section className="border-accent/20 bg-accent/10 flex flex-wrap items-center gap-4 rounded-2xl border p-5">
          <div className="min-w-48 flex-1">
            <Typography
              className="text-sm font-semibold"
              variant="sectionTitle"
            >
              {t('A little setup. Then you’re offline.')}
            </Typography>
            <p className="text-ink/70 mt-1 text-sm leading-5">
              {t('Add a speech recognition model once to get started.')}
            </p>
          </div>
          <Button icon="layers-outline" onClick={onModels}>
            {t('Set up a model')}
          </Button>
        </section>
      )}
      <section
        aria-label={t('Recording')}
        className="border-ink/12 bg-surface overflow-hidden rounded-2xl border shadow-xs"
      >
        <div className="border-ink/12 flex items-center justify-between border-b px-6 py-4">
          <Typography className="text-sm font-semibold" variant="sectionTitle">
            <span className="text-ink/45 mr-3">01</span>
            {t('Your recording')}
          </Typography>
          <span className="text-ink/70 text-xs">{t('Audio or video')}</span>
        </div>
        <div
          className={cn(
            'border-ink/25 bg-canvas/50 hover:border-accent/50 m-5 rounded-xl border',
            'border-dashed p-7 text-center transition-colors',
          )}
          id="file-dropzone"
          onDragOver={(event) => event.preventDefault()}
        >
          {file ? (
            <>
              <div
                className={cn(
                  'border-ink/12 bg-surface text-accent mx-auto mb-4 grid size-14',
                  'place-items-center rounded-2xl border',
                )}
              >
                <Icon
                  className="size-7"
                  name={
                    file.type === 'video' ? 'file-document-outline' : 'waveform'
                  }
                />
              </div>
              <p
                className="mx-auto max-w-lg truncate text-base font-medium"
                title={file.name}
              >
                {file.name}
              </p>
              <p className="text-ink/70 mt-2 text-xs">
                {formatSizeUnit(file.size)} · {t('Ready on your computer')}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button
                  disabled={isDisabled}
                  icon="folder-outline"
                  onClick={onPickFile}
                >
                  {t('Change file')}
                </Button>
                <Button
                  aria-label={t('Remove selected file')}
                  disabled={isDisabled}
                  icon="close"
                  variant="ghost"
                  onClick={onClearFile}
                />
              </div>
            </>
          ) : (
            <>
              <div
                className={cn(
                  'border-ink/12 bg-surface text-accent mx-auto mb-4 grid size-14',
                  'place-items-center rounded-2xl border shadow-xs',
                )}
              >
                <Icon className="size-6" name="upload" />
              </div>
              <p className="font-medium">
                {t(
                  isDropAvailable
                    ? 'Drop your audio or video here'
                    : 'Choose an audio or video file',
                )}
              </p>
              <p className="text-ink/70 mt-2 text-xs">
                MP3, WAV, M4A, MP4, MOV, MKV {t('and more')}
              </p>
              <Button
                className="mt-5"
                disabled={isDisabled}
                icon="plus"
                onClick={onPickFile}
              >
                {t('Choose file')}
              </Button>
            </>
          )}
        </div>
        <p className="text-ink/70 mb-5 flex items-center justify-center gap-2 text-xs">
          <Icon className="size-3.5" name="shield-check-outline" />
          {t('No uploads. Your files stay yours.')}
        </p>
      </section>
      <section className="border-ink/12 bg-surface rounded-2xl border p-6 shadow-xs">
        <Typography
          className="mb-5 text-sm font-semibold"
          variant="sectionTitle"
        >
          <span className="text-ink/45 mr-3">02</span>
          {t('Make it yours')}
        </Typography>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                className="text-ink/70 text-xs font-medium"
                htmlFor="model-select"
              >
                {t('Speech model')}
              </label>
              <button
                className="text-accent text-xs font-medium hover:underline"
                type="button"
                onClick={onModels}
              >
                {t('Manage models')}
              </button>
            </div>
            <select
              disabled={isDisabled || !availableModels.length}
              id="model-select"
              value={model?.id ?? ''}
              onChange={(event) =>
                onPreferences(event.target.value, state.preferences.language)
              }
            >
              {!model && (
                <option value="">{t('Add a model to get started')}</option>
              )}
              {availableModels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <p className="text-ink/70 mt-2 text-xs">
              {t(model ? 'Available offline' : 'Models turn speech into text.')}
            </p>
          </div>
          <div>
            <label
              className="text-ink/70 mb-2 block text-xs font-medium"
              htmlFor="language-select"
            >
              {t('Spoken language')}
            </label>
            <select
              disabled={isDisabled || !model}
              id="language-select"
              value={state.preferences.language}
              onChange={(event) =>
                onPreferences(state.preferences.modelId, event.target.value)
              }
            >
              {state.engine.languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.code === 'auto'
                    ? t(language.name)
                    : (languageNames.of(language.code) ?? language.name)}
                </option>
              ))}
            </select>
            <p className="text-ink/70 mt-2 text-xs">
              {t('Choose the language spoken in your recording.')}
            </p>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3">
        <p className="text-ink/70 text-xs">
          {t(
            !file
              ? 'Choose a recording to continue.'
              : !model
                ? 'Add a model to continue.'
                : 'Everything is ready. Let’s transcribe.',
          )}
        </p>
        <Button
          disabled={isDisabled || !file || !model}
          icon="arrow-right"
          variant="primary"
          onClick={onTranscribe}
        >
          {t('Transcribe file')}
        </Button>
      </div>
    </div>
  );
};

export default FileSelectionScreen;
