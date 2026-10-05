import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import Icon from '@components/Icon';
import Select from '@components/Select';
import Typography from '@components/Typography';
import { cn } from '@utils/cn';
import { formatSizeUnit } from '@utils/formatSizeUnit';
import type { AppState } from 'types/pywebview/pywebview-api';

import { messageKey } from '../i18n/legacyMessages';

type FileSelectionScreenProps = {
  state: AppState;
  isDisabled: boolean;
  onClearFile: () => void;
  onModels: () => void;
  onPickFile: () => void;
  onPreferences: (modelId: string, language: string) => void;
  onTranscribe: () => void;
};

/** Keep file selection and transcription settings visible in a compact workflow. */
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
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
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
    <div className="space-y-5">
      <header>
        <Typography variant="title">{t('file.title')}</Typography>
        <Typography className="mt-2" variant="body">
          {t('file.intro')}
        </Typography>
      </header>
      {!model && (
        <section className="border-accent/20 bg-accent/5 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3">
          <div className="min-w-48 flex-1">
            <Typography variant="sectionTitle">
              {t('file.selectModelIntro')}
            </Typography>
            <Typography className="mt-1" variant="caption">
              {t('file.modelSetupHint')}
            </Typography>
          </div>
          <Button icon="layers-outline" onClick={onModels}>
            {t('models.setup')}
          </Button>
        </section>
      )}
      <section
        aria-label={t('file.settings')}
        className="border-ink/12 bg-surface overflow-hidden rounded-2xl border shadow-xs"
      >
        <div className="px-5 pt-5">
          <Typography variant="sectionTitle">{t('file.recording')}</Typography>
        </div>
        <div
          className={cn(
            'border-ink/20 bg-canvas/50 group m-5 flex min-h-40 flex-wrap items-center justify-center gap-4 rounded-xl border border-dashed p-5',
            !isDisabled &&
              'hover:border-accent/60 hover:bg-accent/5 transition-colors duration-200 hover:shadow-sm',
            isDropAvailable &&
              !isDisabled &&
              isDragging &&
              'border-accent bg-accent/10 ring-accent/15 ring-4',
          )}
          id="file-dropzone"
          onDragEnter={(event) => {
            if (
              isDropAvailable &&
              !isDisabled &&
              event.dataTransfer.types.includes('Files')
            ) {
              dragDepth.current += 1;
              setIsDragging(true);
            }
          }}
          onDragLeave={(event) => {
            if (event.dataTransfer.types.includes('Files')) {
              dragDepth.current = Math.max(0, dragDepth.current - 1);
            }
            if (dragDepth.current === 0) {
              setIsDragging(false);
            }
          }}
          onDragOver={(event) => {
            if (isDropAvailable && !isDisabled) {
              event.preventDefault();
            }
          }}
          onDropCapture={() => {
            dragDepth.current = 0;
            setIsDragging(false);
          }}
        >
          <div
            className={cn(
              'bg-ink/5 text-ink/70 grid size-12 shrink-0 place-items-center rounded-xl transition-colors',
              !isDisabled && 'group-hover:bg-accent/10 group-hover:text-accent',
              isDragging && 'bg-accent/15 text-accent',
            )}
          >
            <Icon
              className={cn(
                'size-6 transition-transform duration-200',
                isDragging && 'scale-125',
              )}
              name={isDragging ? 'upload' : file ? 'waveform' : 'upload'}
            />
          </div>
          <div className="min-w-0 flex-1 basis-48">
            <p className="truncate text-sm font-medium" title={file?.name}>
              {isDragging
                ? t('file.dropHere')
                : file
                  ? file.name
                  : t(isDropAvailable ? 'file.dropHere' : 'file.chooseMedia')}
            </p>
            <Typography className="mt-1" variant="caption">
              {file
                ? formatSizeUnit(file.size)
                : `MP3, WAV, M4A, MP4, MOV, MKV ${t('file.andMore')}`}
            </Typography>
          </div>
          <div className="flex items-center gap-1">
            <Button
              disabled={isDisabled}
              icon="folder-outline"
              onClick={onPickFile}
            >
              {t(file ? 'file.change' : 'file.choose')}
            </Button>
            {file && (
              <Button
                aria-label={t('file.remove')}
                className="px-2"
                disabled={isDisabled}
                icon="close"
                variant="ghost"
                onClick={onClearFile}
              />
            )}
          </div>
        </div>
        <div className="border-ink/12 grid gap-4 border-t p-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-sm font-medium" htmlFor="model-select">
                {t('file.model')}
              </label>
              <button
                className="text-accent text-xs hover:underline"
                type="button"
                onClick={onModels}
              >
                {t('file.manageModels')}
              </button>
            </div>
            <Select
              disabled={isDisabled || !availableModels.length}
              id="model-select"
              value={model?.id ?? ''}
              onChange={(event) =>
                onPreferences(event.target.value, state.preferences.language)
              }
            >
              {!model && <option value="">{t('file.selectModel')}</option>}
              {availableModels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="language-select"
            >
              {t('file.spokenLanguage')}
            </label>
            <Select
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
                    ? t(messageKey(language.name))
                    : (languageNames.of(language.code) ?? language.name)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography variant="caption">
          {t(
            !file
              ? 'file.chooseToContinue'
              : !model
                ? 'file.selectModelToContinue'
                : 'file.ready',
          )}
        </Typography>
        <Button
          disabled={isDisabled || !file || !model}
          icon="arrow-right"
          variant="primary"
          onClick={onTranscribe}
        >
          {t('file.transcribe')}
        </Button>
      </div>
    </div>
  );
};

export default FileSelectionScreen;
