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
    remainingSeconds: null,
    startedAt: '',
    status: 'idle',
  };
  const models: ModelInfo[] = [
    {
      id: 'base',
      description: 'Balanced speed and accuracy for general use.',
      name: 'Base',
      sizeLabel: '≈145 MB',
      sourceUrl: 'https://huggingface.co/Systran/faster-whisper-base',
      caches: ['ready', 'models'].includes(scenario ?? '')
        ? [{ directory: '/Preview/Syllentra/models/base', isShared: false }]
        : [],
      path: ['ready', 'models'].includes(scenario ?? '')
        ? '/Preview/Syllentra/models/base'
        : null,
      isAvailable: ['ready', 'models'].includes(scenario ?? ''),
      isRecommended: true,
    },
    {
      id: 'tiny',
      caches: [],
      description: 'Fast transcription with lower resource requirements.',
      name: 'Tiny',
      path: null,
      sizeLabel: '≈75 MB',
      sourceUrl: 'https://huggingface.co/Systran/faster-whisper-tiny',
      isAvailable: false,
      isRecommended: false,
    },
    {
      id: 'small',
      caches: [],
      description: 'Higher accuracy with moderate processing time.',
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
    modelsDirectory: '/Preview/Syllentra/models',
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
      modelId: ['ready', 'models'].includes(scenario ?? '') ? 'base' : '',
      interfaceLanguage: 'system',
      language: 'auto',
      localModelPaths: [],
      theme: 'system',
    },
  };
  if (scenario === 'models') {
    state.preferences.localModelPaths = [
      '/Preview/my-model',
      '/Preview/moved-model',
    ];
    state.models.push(
      {
        ...models[0],
        id: 'local:/Preview/my-model',
        caches: [],
        description: 'Model linked from your computer.',
        name: 'My local model',
        path: '/Preview/my-model',
        sizeLabel: 'Local folder',
        sourceUrl: '',
        isAvailable: true,
        isRecommended: false,
      },
      {
        ...models[0],
        id: 'local:/Preview/moved-model',
        caches: [],
        name: 'Moved model',
        path: '/Preview/moved-model',
        sizeLabel: 'Local folder',
        sourceUrl: '',
        description:
          'Folder missing or incomplete. Choose the model folder again.',
        isAvailable: false,
        isRecommended: false,
      },
    );
  }
  let transcript: null | Transcript = null;
  const emit = () => {
    state = structuredClone({ ...state, revision: state.revision + 1 });
    const event = new CustomEvent('change', {
      detail: { key: 'app' as const, value: state },
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
    } else {
      state.models = state.models.map((model) =>
        model.id === modelId && !model.caches.length
          ? {
              ...model,
              caches: [
                {
                  directory: `${state.modelsDirectory}/${modelId}`,
                  isShared: false,
                },
              ],
            }
          : model,
      );
    }
    emit();
    let step = 0;
    const interval = setInterval(() => {
      if (state.job.status === 'cancelling') {
        clearInterval(interval);
        state.job.status = 'cancelled';
        state.job.remainingSeconds = null;
        emit();
        return;
      }
      step += 1;
      state.job.status = 'running';
      state.job.progress = kind === 'download' ? null : step * 20;
      state.job.remainingSeconds =
        kind === 'transcription' && step >= 4 ? (5 - step) * 0.6 : null;
      state.job.message =
        kind === 'download'
          ? `model.bin · ${step}/5`
          : 'Transcribing on your computer…';
      if (step >= 5) {
        clearInterval(interval);
        state.job.status = 'completed';
        state.job.remainingSeconds = null;
        state.job.progress = 100;
        if (kind === 'download') {
          state.models = state.models.map((model) =>
            model.id === modelId
              ? {
                  ...model,
                  path: `${state.modelsDirectory}/${modelId}`,
                  caches: [
                    {
                      directory: `${state.modelsDirectory}/${modelId}`,
                      isShared: false,
                    },
                  ],
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
            engineName: 'Preview engine',
            file,
            language: state.preferences.language === 'es' ? 'es' : 'en',
            modelName:
              state.models.find((model) => model.id === modelId)?.name ??
              modelId,
            processingSeconds:
              (Date.now() - new Date(state.job.startedAt).getTime()) / 1000,
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
    delete_model: (modelId) => {
      const deleted = state.models.find((model) => model.id === modelId);
      if (!deleted?.sourceUrl || !deleted.caches.length) {
        return Promise.reject(
          new Error('Choose a downloaded catalog model first.'),
        );
      }
      state.models = state.models.map((model) => {
        if (model.id === modelId) {
          return { ...model, caches: [], path: null, isAvailable: false };
        }
        if (
          !model.sourceUrl &&
          deleted.caches.some(
            (cache) =>
              model.path === cache.directory ||
              model.path?.startsWith(`${cache.directory}/`),
          )
        ) {
          return {
            ...model,
            description:
              'Folder missing or incomplete. Choose the model folder again.',
            isAvailable: false,
          };
        }
        return model;
      });
      if (
        !state.models.some(
          (model) =>
            model.id === state.preferences.modelId && model.isAvailable,
        )
      ) {
        state.preferences.modelId =
          state.models.find((model) => model.isAvailable)?.id ?? '';
      }
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
    refresh_file: () => Promise.resolve(state.transcriptionFile),
    refresh_models: () => Promise.resolve(),
    run_transcription: (_path, modelId, language = 'auto') => {
      state.preferences.language = language;
      return Promise.resolve(begin('transcription', modelId));
    },
    select_model_folder: (replaceId) => {
      const previousPath = state.models.find(
        (item) => item.id === replaceId,
      )?.path;
      const model = {
        ...models[0],
        id: 'local:/Preview/local-model',
        caches: [],
        description: 'Model linked from your computer.',
        name: 'My local model',
        path: '/Preview/local-model',
        sizeLabel: 'Local folder',
        sourceUrl: '',
        isAvailable: true,
        isRecommended: false,
      };
      state.models = [
        ...state.models.filter(
          (item) => item.id !== model.id && item.id !== replaceId,
        ),
        model,
      ];
      state.preferences.localModelPaths = [
        ...state.preferences.localModelPaths.filter(
          (path) => path !== previousPath && path !== model.path,
        ),
        model.path,
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
    unlink_model: (modelId) => {
      const path = state.models.find((model) => model.id === modelId)?.path;
      state.models = state.models.filter((model) => model.id !== modelId);
      state.preferences.localModelPaths =
        state.preferences.localModelPaths.filter((item) => item !== path);
      if (state.preferences.modelId === modelId) {
        state.preferences.modelId =
          state.models.find((model) => model.isAvailable)?.id ?? '';
      }
      emit();
      return Promise.resolve();
    },
  };
  window.pywebview = {
    api,
    state: {
      addEventListener: (_type, callback) => listeners.add(callback),
      get app() {
        return state;
      },
      removeEventListener: (_type, callback) => listeners.delete(callback),
    },
  };
};
