import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@components/Button';
import ConfirmDialog from '@components/ConfirmDialog';
import Icon from '@components/Icon';
import Typography from '@components/Typography';
import { cn } from '@utils/cn';
import type { AppState, ModelInfo } from 'types/pywebview/pywebview-api';

import { messageKey } from '../i18n/legacyMessages';

type ModelsScreenProps = {
  state: AppState;
  isDisabled: boolean;
  onContinue: () => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onImport: () => void;
  onOpenFolder: () => void;
  onRefresh: () => void;
  onRelink: (id: string) => void;
  onSelect: (id: string) => void;
  onUnlink: (id: string) => void;
};

/** Explain model setup briefly, with storage and compatibility details on demand. */
const ModelsScreen = ({
  onContinue,
  onDelete,
  onDownload,
  onImport,
  onOpenFolder,
  onRefresh,
  onRelink,
  onSelect,
  onUnlink,
  state,
  isDisabled,
}: ModelsScreenProps) => {
  const { t } = useTranslation();
  const [deleteId, setDeleteId] = useState<null | string>(null);
  const deleteModel = state.models.find(
    (model) => model.id === deleteId && model.caches.length > 0,
  );
  const hasModel = state.models.some(
    (model) => model.id === state.preferences.modelId && model.isAvailable,
  );
  const models = [...state.models].sort(
    (a, b) =>
      Number(b.isAvailable) - Number(a.isAvailable) ||
      Number(b.isRecommended) - Number(a.isRecommended),
  );
  /** Classify saved external locations separately from downloadable catalog entries. */
  const isLinked = (model: ModelInfo) =>
    !model.sourceUrl &&
    model.path !== null &&
    state.preferences.localModelPaths.includes(model.path);
  const groups = [
    {
      id: 'linked',
      hint: t('models.linkedHint'),
      models: models.filter(isLinked),
      title: t('models.linked'),
    },
    {
      id: 'catalog',
      hint: t('models.catalogHint'),
      models: models.filter((model) => !isLinked(model)),
      title: t('models.catalog'),
    },
  ];
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center justify-between gap-3">
          <Typography variant="title">{t('models.title')}</Typography>
          <Button
            aria-label={t('models.refresh')}
            disabled={isDisabled}
            icon="refresh"
            title={t('models.refresh')}
            variant="ghost"
            onClick={onRefresh}
          />
        </div>
        <Typography className="mt-3 max-w-xl" variant="body">
          {t('models.intro')}
        </Typography>
      </header>
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`${group.id}-models-heading`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Typography
              className="text-sm font-semibold"
              id={`${group.id}-models-heading`}
              variant="sectionTitle"
            >
              {group.title}
            </Typography>
            {group.id === 'linked' && (
              <Button disabled={isDisabled} icon="plus" onClick={onImport}>
                {t('models.linkFolder')}
              </Button>
            )}
          </div>
          <p className="text-ink/70 mt-2 max-w-xl text-xs leading-5">
            {group.hint}
          </p>
          {group.id === 'linked' && group.models.length === 0 && (
            <p className="text-ink/60 mt-3 text-sm">
              {t('models.noLinkedModels')}
            </p>
          )}
          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-3">
            {group.models.map((model) => {
              const isLinkedModel = group.id === 'linked';
              const isSelected =
                model.isAvailable && model.id === state.preferences.modelId;
              const isDownloading =
                state.job.kind === 'download' &&
                state.job.modelId === model.id &&
                ['loading', 'running', 'cancelling'].includes(state.job.status);
              return (
                <article
                  key={model.id}
                  aria-label={model.name}
                  className={cn(
                    'flex min-w-0 flex-col rounded-xl border p-4',
                    isSelected
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-ink/12 bg-surface',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Typography
                      className="text-sm font-semibold break-words"
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
                          ? 'models.availableLocally'
                          : isLinkedModel
                            ? 'models.folderUnavailable'
                            : model.caches.length > 0
                              ? 'models.incompleteDownload'
                              : model.isRecommended
                                ? 'models.recommended'
                                : 'models.notDownloaded',
                      )}
                    </span>
                  </div>
                  <p className="text-ink/70 mt-2 flex-1 text-sm leading-5">
                    {isLinkedModel && !model.isAvailable
                      ? t('models.folderUnavailableHint')
                      : t(messageKey(model.description))}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink/70 mr-auto text-xs">
                      {t(messageKey(model.sizeLabel))}
                    </span>
                    {model.isAvailable ? (
                      <Button
                        className="px-3"
                        disabled={isDisabled || isSelected}
                        icon={isSelected ? 'check' : undefined}
                        variant={isSelected ? 'ghost' : 'secondary'}
                        onClick={() => onSelect(model.id)}
                      >
                        {t(isSelected ? 'models.selected' : 'models.use')}
                      </Button>
                    ) : isLinkedModel ? (
                      <Button
                        className="px-3"
                        disabled={isDisabled}
                        icon="folder-outline"
                        onClick={() => onRelink(model.id)}
                      >
                        {t('models.relinkFolder')}
                      </Button>
                    ) : model.sourceUrl ? (
                      <Button
                        className="px-3"
                        disabled={isDisabled}
                        icon="download"
                        onClick={() => onDownload(model.id)}
                      >
                        {t(
                          isDownloading
                            ? 'models.downloading'
                            : 'models.download',
                        )}
                      </Button>
                    ) : (
                      <Button
                        className="px-3"
                        disabled={isDisabled}
                        onClick={onImport}
                      >
                        {t('models.linkFolder')}
                      </Button>
                    )}
                    {isLinkedModel && (
                      <Button
                        aria-label={t('models.removeLinkFor', {
                          name: model.name,
                        })}
                        className="size-10 shrink-0 px-2"
                        disabled={isDisabled}
                        icon="close"
                        title={t('models.removeLink')}
                        variant="ghost"
                        onClick={() => onUnlink(model.id)}
                      />
                    )}
                    {!isLinkedModel && model.caches.length > 0 && (
                      <Button
                        aria-label={t('models.deleteFor', { name: model.name })}
                        className="hover:bg-danger/10 hover:text-danger size-10 shrink-0 px-2"
                        disabled={isDisabled}
                        icon="delete-outline"
                        title={t('models.delete')}
                        variant="ghost"
                        onClick={() => setDeleteId(model.id)}
                      />
                    )}
                  </div>
                  {model.path && (
                    <p
                      className="text-ink/70 mt-2 truncate text-xs"
                      title={model.path}
                    >
                      {model.path}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <details className="border-ink/12 bg-surface rounded-xl border px-5 py-4 text-sm">
        <summary className="cursor-pointer font-medium">
          {t('models.storageQuestion')}
        </summary>
        <div className="mt-5 space-y-5">
          <section>
            <Typography variant="subtitle">
              {t('models.downloadLocation')}
            </Typography>
            <Typography className="mt-1" variant="caption">
              {t('models.downloadLocationHint')}
            </Typography>
            <code className="bg-canvas text-ink/70 mt-2 block rounded-lg p-3 text-xs break-all">
              {state.modelsDirectory}
            </code>
            <Button
              className="mt-2"
              icon="folder-outline"
              onClick={onOpenFolder}
            >
              {t('models.openFolder')}
            </Button>
          </section>
          <section>
            <Typography variant="subtitle">
              {t('models.existingModel')}
            </Typography>
            <Typography className="mt-1" variant="caption">
              {t('models.existingModelHint')}
            </Typography>
            <Typography className="mt-2" variant="caption">
              {t(messageKey(state.engine.modelFormat))}
            </Typography>
          </section>
          <section>
            <Typography variant="subtitle">{t('models.choosing')}</Typography>
            <Typography className="mt-1" variant="caption">
              {t('models.choosingHint')}
            </Typography>
            <Typography className="mt-2" variant="caption">
              {t('models.cpuHint')}
            </Typography>
          </section>
          <section>
            <Typography variant="subtitle">{t('models.sources')}</Typography>
            <Typography className="mt-1" variant="caption">
              {t('models.sourcesHint')}
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
            {t('common.backToTranscription')}
          </Button>
        </div>
      )}
      {deleteModel && (
        <ConfirmDialog
          confirmLabel={t('models.delete')}
          description={t('models.deleteDescription')}
          isDisabled={isDisabled}
          title={t('models.deleteTitle', { name: deleteModel.name })}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            setDeleteId(null);
            onDelete(deleteModel.id);
          }}
        >
          {deleteModel.caches.some((cache) => cache.isShared) && (
            <p className="text-danger text-sm leading-6">
              {t('models.deleteSharedWarning')}
            </p>
          )}
          <ul className="space-y-3">
            {deleteModel.caches.map((cache) => (
              <li key={cache.directory}>
                <p className="text-ink/70 text-xs font-medium">
                  {t(cache.isShared ? 'models.sharedCache' : 'models.appCache')}
                </p>
                <code className="bg-canvas mt-1 block rounded-lg p-3 text-xs break-all">
                  {cache.directory}
                </code>
              </li>
            ))}
          </ul>
          {deleteModel.id === state.preferences.modelId && (
            <p className="text-ink/70 text-sm leading-6">
              {t('models.deleteSelectedHint')}
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
};

export default ModelsScreen;
