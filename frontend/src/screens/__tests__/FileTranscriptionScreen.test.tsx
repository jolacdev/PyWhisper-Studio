import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Transcript } from 'types/pywebview/pywebview-api';

import i18n from '../../i18n/i18n';
import FileTranscriptionScreen from '../FileTranscriptionScreen';

const transcript: Transcript = {
  engineId: 'faster-whisper',
  id: 'result',
  modelId: 'base',
  createdAt: '2026-10-05T10:00:00Z',
  duration: 65.5,
  engineName: 'Faster-Whisper',
  language: 'en',
  modelName: 'Base',
  processingSeconds: 12.2,
  file: {
    absolutePath: '/Interview.wav',
    name: 'Interview.wav',
    size: 1048576,
    type: 'audio',
  },
  segments: [
    { id: 0, end: 10, start: 0, text: 'First sentence.' },
    { id: 1, end: 18, start: 11, text: 'Second sentence.' },
  ],
};

describe('completed transcript', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows source and processing details alongside one row per segment', () => {
    render(
      <FileTranscriptionScreen
        isDisabled={false}
        transcript={transcript}
        onCopy={vi.fn()}
        onExport={vi.fn()}
      />,
    );
    expect(screen.getByText('1.00 MB')).toBeInTheDocument();
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByText('00:12')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Faster-Whisper')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'New transcription' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reading view' }),
    ).not.toBeInTheDocument();
  });

  it('copies the entire transcript with an icon-only confirmation and tooltip', async () => {
    vi.useFakeTimers();
    const onCopy = vi.fn().mockResolvedValue(undefined);
    render(
      <FileTranscriptionScreen
        isDisabled={false}
        transcript={transcript}
        onCopy={onCopy}
        onExport={vi.fn()}
      />,
    );
    const button = screen.getByRole('button', { name: 'Copy text' });
    expect(button).toHaveAttribute('title', 'Copy text');
    expect(button.textContent).toBe('');
    await act(async () => {
      fireEvent.click(button);
    });
    expect(onCopy).toHaveBeenCalledWith('First sentence. Second sentence.');
    expect(button).toHaveAccessibleName('Copied');
    expect(button.textContent).toBe('');
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(button).toHaveAccessibleName('Copy text');
  });

  it('renders the new metadata labels and plural segment count in Spanish', async () => {
    await i18n.changeLanguage('es-ES');
    render(
      <FileTranscriptionScreen
        isDisabled={false}
        transcript={transcript}
        onCopy={vi.fn()}
        onExport={vi.fn()}
      />,
    );
    expect(screen.getByText('Tiempo de procesamiento')).toBeInTheDocument();
    expect(screen.getByText('2 fragmentos')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copiar texto' }),
    ).toHaveAttribute('title', 'Copiar texto');
  });
});
