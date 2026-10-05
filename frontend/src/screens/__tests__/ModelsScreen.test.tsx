import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppState, ModelInfo } from 'types/pywebview/pywebview-api';

import i18n from '../../i18n/i18n';
import ModelsScreen from '../ModelsScreen';

const models: ModelInfo[] = [
  {
    id: 'base',
    caches: [{ directory: '/downloads/base', isShared: false }],
    description: 'Balanced speed and accuracy for general use.',
    name: 'Base',
    path: '/downloads/base',
    sizeLabel: '≈145 MB',
    sourceUrl: 'https://example.com/base',
    isAvailable: true,
    isRecommended: true,
  },
  {
    id: 'tiny',
    caches: [],
    description: 'Fast transcription with lower resource requirements.',
    name: 'Tiny',
    path: null,
    sizeLabel: '≈75 MB',
    sourceUrl: 'https://example.com/tiny',
    isAvailable: false,
    isRecommended: false,
  },
  {
    id: 'local:/models/mine',
    caches: [],
    description: 'Model linked from your computer.',
    name: 'My model',
    path: '/models/mine',
    sizeLabel: 'Local folder',
    sourceUrl: '',
    isAvailable: true,
    isRecommended: false,
  },
  {
    id: 'local:/models/moved',
    caches: [],
    description: 'Folder missing or incomplete. Choose the model folder again.',
    name: 'Moved model',
    path: '/models/moved',
    sizeLabel: 'Local folder',
    sourceUrl: '',
    isAvailable: false,
    isRecommended: false,
  },
];

/** Create a screen fixture with both downloaded and unavailable external models. */
const setup = (isDisabled = false, customModels = models) => {
  const state: AppState = {
    transcriptId: null,
    engine: { id: 'test', languages: [], modelFormat: '', name: 'Test engine' },
    models: customModels,
    modelsDirectory: '/downloads',
    notice: null,
    revision: 1,
    transcriptionFile: null,
    job: {
      id: '',
      modelId: '',
      error: null,
      kind: 'transcription',
      message: '',
      progress: null,
      remainingSeconds: null,
      startedAt: '',
      status: 'idle',
    },
    preferences: {
      modelId: 'base',
      interfaceLanguage: 'en',
      language: 'auto',
      theme: 'system',
      localModelPaths: customModels
        .filter((model) => !model.sourceUrl)
        .map((model) => model.path ?? ''),
    },
  };
  const actions = {
    onContinue: vi.fn(),
    onDelete: vi.fn(),
    onDownload: vi.fn(),
    onImport: vi.fn(),
    onOpenFolder: vi.fn(),
    onRefresh: vi.fn(),
    onRelink: vi.fn(),
    onSelect: vi.fn(),
    onUnlink: vi.fn(),
  };
  render(<ModelsScreen {...actions} isDisabled={isDisabled} state={state} />);
  return actions;
};

describe('model folders and catalog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('separates linked folders and catalog entries with one add-folder action', () => {
    const actions = setup();
    const linked = screen.getByRole('region', { name: 'Linked models' });
    const catalog = screen.getByRole('region', { name: 'Model catalog' });
    expect(within(linked).getByText('My model')).toBeInTheDocument();
    expect(within(linked).getByText('Moved model')).toBeInTheDocument();
    expect(within(linked).queryByText('Base')).not.toBeInTheDocument();
    expect(within(catalog).getByText('Base')).toBeInTheDocument();
    expect(within(catalog).queryByText('Moved model')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Link model folder' }),
    ).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: 'Locate folder' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link model folder' }));
    expect(actions.onImport).toHaveBeenCalledOnce();
    fireEvent.click(within(catalog).getByRole('button', { name: 'Download' }));
    expect(actions.onDownload).toHaveBeenCalledWith('tiny');
  });

  it('repairs the specific missing link and lets it be removed independently', () => {
    const actions = setup();
    const missing = screen.getByRole('article', { name: 'Moved model' });
    expect(within(missing).getByText('Folder unavailable')).toBeInTheDocument();
    expect(
      within(missing).queryByText('Not downloaded'),
    ).not.toBeInTheDocument();
    expect(
      within(missing).queryByRole('button', { name: 'Use model' }),
    ).not.toBeInTheDocument();
    expect(within(missing).getByText('/models/moved')).toHaveAttribute(
      'title',
      '/models/moved',
    );
    fireEvent.click(
      within(missing).getByRole('button', { name: 'Relink folder' }),
    );
    expect(actions.onRelink).toHaveBeenCalledWith('local:/models/moved');
    expect(actions.onImport).not.toHaveBeenCalled();
    fireEvent.click(
      within(missing).getByRole('button', {
        name: 'Remove link to Moved model',
      }),
    );
    expect(actions.onUnlink).toHaveBeenCalledWith('local:/models/moved');
  });

  it('disables model changes while a job or command is in progress', () => {
    setup(true);
    for (const name of [
      'Link model folder',
      'Relink folder',
      'Download',
      'Use model',
      'Remove link to Moved model',
      'Refresh models',
      'Delete downloaded Base model',
    ]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });

  it('keeps catalog actions separate even when the same folder is also linked', () => {
    setup(false, [models[0], { ...models[2], path: '/downloads/base' }]);
    const catalog = screen.getByRole('region', { name: 'Model catalog' });
    const linked = screen.getByRole('region', { name: 'Linked models' });
    expect(within(catalog).getByText('Base')).toBeInTheDocument();
    expect(within(catalog).queryByTitle('Remove link')).not.toBeInTheDocument();
    expect(within(linked).getByText('My model')).toBeInTheDocument();
  });

  it('explains the folder state and storage action in Spanish', async () => {
    await i18n.changeLanguage('es-ES');
    setup();
    expect(
      screen.getByRole('region', { name: 'Modelos vinculados' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Carpeta no disponible')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Volver a vincular' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Abrir carpeta de descargas' }),
    ).toBeInTheDocument();
  });

  it('only offers file deletion for cached catalog models', () => {
    setup();
    const downloaded = screen.getByRole('article', { name: 'Base' });
    const external = screen.getByRole('article', { name: 'My model' });
    const remote = screen.getByRole('article', { name: 'Tiny' });
    expect(within(downloaded).getByTitle('Delete model')).toHaveAccessibleName(
      'Delete downloaded Base model',
    );
    expect(
      within(external).queryByTitle('Delete model'),
    ).not.toBeInTheDocument();
    expect(within(remote).queryByTitle('Delete model')).not.toBeInTheDocument();
  });

  it('confirms the model and storage before deleting and restores focus on cancel', () => {
    const actions = setup();
    const trigger = screen.getByRole('button', {
      name: 'Delete downloaded Base model',
    });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Delete Base?' });
    expect(within(dialog).getByText('/downloads/base')).toBeInTheDocument();
    expect(within(dialog).getByText('Syllentra downloads')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/This is your selected model/),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toHaveFocus();
    expect(actions.onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(actions.onDelete).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Delete model' }));
    expect(actions.onDelete).toHaveBeenCalledExactlyOnceWith('base');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('allows Escape to cancel without deleting', () => {
    const actions = setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete downloaded Base model' }),
    );
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { cancelable: true }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(actions.onDelete).not.toHaveBeenCalled();
  });

  it('discloses every cache copy and warns when storage is shared', () => {
    const sharedDirectory = '/shared-hub/models--base';
    setup(false, [
      {
        ...models[0],
        caches: [
          ...models[0].caches,
          { directory: sharedDirectory, isShared: true },
        ],
      },
    ]);
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete downloaded Base model' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('/downloads/base')).toBeInTheDocument();
    expect(within(dialog).getByText(sharedDirectory)).toBeInTheDocument();
    expect(
      within(dialog).getByText('Shared Hugging Face cache'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Other applications using this model/),
    ).toBeInTheDocument();
  });

  it('allows incomplete catalog downloads to be cleared', () => {
    setup(false, [{ ...models[0], path: null, isAvailable: false }]);
    expect(screen.getByText('Incomplete download')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete downloaded Base model' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('/downloads/base')).toBeInTheDocument();
    expect(
      within(dialog).queryByText(/This is your selected model/),
    ).toBeInTheDocument();
  });

  it('translates deletion confirmation into Spanish', async () => {
    await i18n.changeLanguage('es-ES');
    const actions = setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Eliminar modelo Base descargado' }),
    );
    const dialog = screen.getByRole('dialog', { name: '¿Eliminar Base?' });
    expect(
      within(dialog).getByText('Descargas de Syllentra'),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Eliminar modelo' }),
    );
    expect(actions.onDelete).toHaveBeenCalledExactlyOnceWith('base');
  });
});
