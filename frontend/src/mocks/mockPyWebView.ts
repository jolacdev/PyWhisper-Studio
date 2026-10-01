import type {
  AppState,
  Job,
  ModelInfo,
  PyWebViewApi,
  Transcript,
} from 'types/pywebview/pywebview-api';
import type { PyWebViewStateEvent } from 'types/pywebview/pywebview-state';

/** Install an explicit browser demo that implements the generated native API contract. */
export const createPyWebViewMock = () => {
  if (window.pywebview?.api) {
    return;
  }
  const scenario = new URLSearchParams(location.search).get('preview');
  const listeners = new Set<(event: PyWebViewStateEvent) => void>();
  const job: Job = {
    id: '',
    modelId: '',
    error: null,
    kind: 'transcription',
    message: '',
    progress: null,
    startedAt: '',
    status: 'idle',
  };
  const models: ModelInfo[] = [
    {
      id: 'base',
      description: 'A good place to start. Light and quick.',
      name: 'Base',
      path: scenario === 'ready' ? '/Preview/models/base' : null,
      sizeLabel: '≈145 MB',
      sourceUrl: 'https://huggingface.co/Systran/faster-whisper-base',
      isAvailable: scenario === 'ready',
      isRecommended: true,
    },
    {
      id: 'tiny',
      description: 'Fast drafts and short recordings.',
      name: 'Tiny',
      path: null,
      sizeLabel: '≈75 MB',
      sourceUrl: 'https://huggingface.co/Systran/faster-whisper-tiny',
      isAvailable: false,
      isRecommended: false,
    },
    {
      id: 'small',
      description: 'More accurate, with a little more patience.',
      name: 'Small',
      path: null,
      sizeLabel: '≈485 MB',
      sourceUrl: 'https://huggingface.co/Systran/faster-whisper-small',
      isAvailable: false,
      isRecommended: false,
    },
  ];
  let state: AppState = {
    transcriptId: null,
    job,
    models,
    modelsDirectory: '/Preview/PyWhisper Studio/models',
    notice: null,
    revision: 0,
    transcriptionFile: null,
    engine: {
      id: 'preview',
      name: 'Preview engine',
      languages: [
        { code: 'auto', name: 'Detect automatically' },
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
      ],
      modelFormat:
        'Choose a CTranslate2 model folder with model.bin, config.json and tokenizer.json. OpenAI .pt and whisper.cpp .gguf files are not compatible.',
    },
    preferences: {
      modelId: scenario === 'ready' ? 'base' : '',
      interfaceLanguage: 'system',
      language: 'auto',
      localModelPaths: [],
      theme: 'system',
    },
  };
  let transcript: null | Transcript = null;
  const emit = () => {
    state = structuredClone({ ...state, revision: state.revision + 1 });
    const event = new CustomEvent('change', {
      detail: { key: 'studio' as const, value: state },
    });
    listeners.forEach((listener) => listener(event));
  };
  const file = {
    absolutePath: '/Preview/A conversation worth keeping.mp3',
    name: 'A conversation worth keeping.mp3',
    size: 4_856_108,
    type: 'audio',
  };
  const begin = (kind: Job['kind'], modelId: string) => {
    state.job = {
      ...job,
      id: crypto.randomUUID(),
      modelId,
      kind,
      startedAt: new Date().toISOString(),
      status: 'loading',
      message:
        kind === 'download'
          ? 'Connecting to download source…'
          : 'Loading model…',
    };
    if (kind === 'transcription') {
      state.transcriptId = null;
    }
    emit();
    let step = 0;
    const interval = setInterval(() => {
      if (state.job.status === 'cancelling') {
        clearInterval(interval);
        state.job.status = 'cancelled';
        emit();
        return;
      }
      step += 1;
      state.job.status = 'running';
      state.job.progress = kind === 'download' ? null : step * 20;
      state.job.message =
        kind === 'download'
          ? `model.bin · ${step}/5`
          : 'Transcribing on your computer…';
      if (step >= 5) {
        clearInterval(interval);
        state.job.status = 'completed';
        state.job.progress = 100;
        if (kind === 'download') {
          state.models = state.models.map((model) =>
            model.id === modelId
              ? {
                  ...model,
                  path: `/Preview/models/${modelId}`,
                  isAvailable: true,
                }
              : model,
          );
          state.preferences.modelId = modelId;
        } else if (scenario === 'error') {
          state.job.status = 'error';
          state.job.error = 'Preview transcription error';
        } else {
          const texts =
            state.preferences.language === 'es'
              ? [
                  'Las buenas ideas suelen empezar con una conversación.',
                  'Conservar esas palabras nos permite volver a ellas, compartirlas y darles forma.',
                  'Este es un resultado de ejemplo. Tus grabaciones se procesarán en tu ordenador.',
                ]
              : [
                  'Good ideas often begin with a conversation.',
                  'Keeping those words lets us return to them, share them, and make something useful.',
                  'This is a preview transcript. Your real recordings are processed on your own computer.',
                ];
          transcript = {
            engineId: 'preview',
            id: state.job.id,
            modelId,
            createdAt: new Date().toISOString(),
            duration: 24.5,
            file,
            language: state.preferences.language === 'es' ? 'es' : 'en',
            segments:
              scenario === 'empty'
                ? []
                : texts.map((text, index) => ({
                    id: index,
                    end: index * 8 + 7.5,
                    start: index * 8,
                    text,
                  })),
          };
          state.transcriptId = transcript.id;
        }
      }
      emit();
    }, 600);
    return structuredClone(state.job);
  };
  const api: PyWebViewApi = {
    bind_dropzone: () => Promise.resolve(false),
    cancel_job: (id) => {
      if (state.job.id === id) {
        state.job.status = 'cancelling';
        emit();
      }
      return Promise.resolve();
    },
    clear_file: () => {
      state.transcriptionFile = null;
      emit();
      return Promise.resolve();
    },
    download_model: (modelId) => Promise.resolve(begin('download', modelId)),
    export_transcript: () =>
      Promise.reject(
        new Error('Native export is available in the desktop app.'),
      ),
    get_state: () => Promise.resolve(structuredClone(state)),
    get_transcript: () =>
      transcript
        ? Promise.resolve(structuredClone(transcript))
        : Promise.reject(new Error('No transcript available.')),
    open_file_dialog: () => {
      state.transcriptionFile = file;
      emit();
      return Promise.resolve(file);
    },
    open_models_folder: () =>
      Promise.reject(
        new Error('Native folders are available in the desktop app.'),
      ),
    refresh_models: () => Promise.resolve(),
    run_transcription: (_path, modelId, language = 'auto') => {
      state.preferences.language = language;
      return Promise.resolve(begin('transcription', modelId));
    },
    select_model_folder: () => {
      const model = {
        ...models[0],
        id: 'local:preview',
        name: 'My local model',
        path: '/Preview/local-model',
        isAvailable: true,
        isRecommended: false,
      };
      state.models = [
        ...state.models.filter((item) => item.id !== model.id),
        model,
      ];
      state.preferences.modelId = model.id;
      emit();
      return Promise.resolve(model);
    },
    set_appearance: (theme, language) => {
      state.preferences = {
        ...state.preferences,
        interfaceLanguage: language,
        theme,
      };
      emit();
      return Promise.resolve();
    },
    set_preferences: (modelId, language) => {
      state.preferences = { ...state.preferences, modelId, language };
      emit();
      return Promise.resolve();
    },
  };
  window.pywebview = {
    api,
    state: {
      addEventListener: (_type, callback) => listeners.add(callback),
      removeEventListener: (_type, callback) => listeners.delete(callback),
      get studio() {
        return state;
      },
    },
  };
};
