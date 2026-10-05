// Bridge and engine messages still arrive as English phrases. Keep that wire format separate from UI keys.
const messageKeys: Record<string, string> = {
  '≈1.5 GB': 'models.sizeMedium',
  '≈1.6 GB': 'models.sizeTurbo',
  '≈3.1 GB': 'models.sizeLarge',
  'Already have a model?': 'models.haveModel',
  'and more': 'file.andMore',
  Appearance: 'app.appearance',
  'Available locally': 'models.availableLocally',
  'Available models': 'models.available',
  'Back to transcription': 'common.backToTranscription',
  'Balanced speed and accuracy for general use.': 'models.descriptionBase',
  Cancel: 'common.cancel',
  'Cancellation requested': 'progress.cancellationRequested',
  'Cancelling…': 'progress.cancelling',
  'Change file': 'file.change',
  'Check the recording and model, then try again.': 'errors.checkRecording',
  'Choose a downloaded catalog model first.': 'errors.downloadedModelRequired',
  'Choose a linked model first.': 'errors.linkedModelRequired',
  'Choose an audio or video file': 'file.chooseMedia',
  'Choose an audio or video file first.': 'errors.fileRequired',
  'Choose an available model first.': 'errors.modelRequired',
  'Choose a recording to continue.': 'file.chooseToContinue',
  'Choose file': 'file.choose',
  'Choose model folder': 'models.chooseFolder',
  'Choose one audio or video file at a time.': 'errors.oneFileOnly',
  'Choose TXT, SRT or VTT.': 'errors.exportFormat',
  'Choosing a model': 'models.choosing',
  'Connecting to download source…': 'progress.connectingDownload',
  'Connecting to the desktop app…': 'startup.connecting',
  'Copy segment': 'transcript.copySegment',
  'Copy segment at {{time}}': 'transcript.copySegmentAt',
  'Copy text': 'transcript.copyText',
  dark: 'app.dark',
  'Detect automatically': 'file.detectLanguage',
  Dismiss: 'common.dismiss',
  'Dismiss notification': 'common.dismissNotification',
  Download: 'models.download',
  'Downloading…': 'models.downloading',
  'Downloading model': 'progress.downloadingModel',
  'Download sources': 'models.sources',
  'Drop an audio or video file here': 'file.dropHere',
  English: 'file.english',
  'Estimated: less than a minute remaining': 'progress.lessThanMinute',
  'Estimated: {{minutes}} min remaining': 'progress.minutesRemaining',
  'Estimating remaining time…': 'progress.estimating',
  Export: 'transcript.export',
  'Export format': 'transcript.exportFormat',
  'Higher accuracy with moderate processing time.': 'models.descriptionSmall',
  'In progress': 'progress.inProgress',
  'Interface language': 'app.interfaceLanguage',
  'Internet is only needed for this download.': 'progress.downloadInternet',
  light: 'app.light',
  'Loading model…': 'progress.loadingModel',
  'Local folder': 'models.localFolder',
  'Locate folder': 'models.locateFolder',
  'Manage models': 'file.manageModels',
  'Model downloaded. Ready to transcribe offline.': 'models.downloadComplete',
  'Model linked from your computer.': 'models.folderLinked',
  Models: 'models.title',
  'Models downloaded by the app': 'models.downloadLocation',
  'Native export is available in the desktop app.': 'errors.nativeExportOnly',
  'New transcription': 'file.title',
  'No speech detected.': 'transcript.noSpeech',
  'Not downloaded': 'models.notDownloaded',
  'Open folder': 'models.openFolder',
  'Opening your workspace…': 'startup.opening',
  'Open interface preview': 'startup.openPreview',
  'Open Syllentra to use local files and models.': 'startup.desktopRequired',
  'Private by design': 'app.private',
  'Reading audio and detecting speech…': 'progress.readingAudio',
  'Ready to transcribe.': 'file.ready',
  Recommended: 'models.recommended',
  Recording: 'file.recording',
  'Recording and settings': 'file.settings',
  'Refresh local models': 'models.refresh',
  'Remove selected file': 'file.remove',
  'Saved to {{path}}': 'transcript.savedTo',
  segments: 'transcript.segments',
  'Select a model': 'file.selectModel',
  'Select a model to continue.': 'file.selectModelToContinue',
  'Select a model to get started': 'file.selectModelIntro',
  Selected: 'models.selected',
  'Selected model': 'app.selectedModel',
  'Set up a model': 'models.setup',
  'Skip to content': 'app.skipContent',
  Spanish: 'file.spanish',
  'Speech model': 'file.model',
  'Spoken language': 'file.spokenLanguage',
  system: 'app.system',
  'Task cancelled.': 'progress.cancelled',
  'Task progress': 'progress.title',
  'Technical details': 'errors.technicalDetails',
  Text: 'transcript.text',
  'Text copied to the clipboard.': 'transcript.copiedNotice',
  'The desktop window is not ready.': 'errors.windowNotReady',
  'The file could not be transcribed.': 'errors.transcriptionFailed',
  'The file was processed successfully.': 'transcript.processed',
  'The model could not be downloaded.': 'errors.downloadFailed',
  'The selected file is empty or no longer available.': 'errors.fileEmpty',
  'This version processes audio on the CPU.': 'models.cpuHint',
  Timestamps: 'transcript.timestamps',
  'Transcribe an audio or video file on your computer.': 'file.intro',
  'Transcribe file': 'file.transcribe',
  'Transcribing file': 'progress.transcribingFile',
  'Transcribing on your computer…': 'progress.transcribing',
  Transcript: 'transcript.title',
  'Transcript display': 'transcript.display',
  'Use a filename ending in .srt and export again.': 'errors.srtExtension',
  'Use a filename ending in .txt and export again.': 'errors.txtExtension',
  'Use a filename ending in .vtt and export again.': 'errors.vttExtension',
  'Use a local model or download one from Models.': 'file.modelSetupHint',
  'Use model': 'models.use',
  'Using a model you already have': 'models.existingModel',
  'Wait for the current task to finish or cancel it first.': 'errors.taskBusy',
  'Waiting for the current audio block to finish.': 'progress.waitAudio',
  'Waiting for the current download file to finish.': 'progress.waitDownload',
  Workspace: 'app.workspace',
  'Workspace navigation': 'app.navigation',
  'Your recording': 'file.yourRecording',
  'Your recording stays on this computer.': 'progress.localRecording',
  'A model recognises speech in your recordings. Use a local folder or download a model to transcribe offline.':
    'models.intro',
  'Check your connection and free disk space, then try again.':
    'errors.checkDownload',
  'Choose a CTranslate2 model folder with model.bin, config.json and tokenizer.json. OpenAI .pt and whisper.cpp .gguf files are not compatible.':
    'models.formatHint',
  'Choose a Faster-Whisper model folder containing model.bin and config.json.':
    'errors.modelFolderRequired',
  'Choose a supported audio or video file on your computer.':
    'errors.mediaRequired',
  'Choose a supported interface language and appearance.':
    'errors.appearanceUnsupported',
  'Choose the folder containing the model files, not the parent downloads folder. The files stay in their original location.':
    'models.existingModelHint',
  'Download a model or choose a local model folder first.':
    'errors.downloadOrLinkModel',
  'Downloads are saved here automatically. You do not need to move or unpack them.':
    'models.downloadLocationHint',
  'Download this model or choose an available local model.':
    'errors.modelUnavailable',
  'Estimate based on processing speed. It may change as transcription progresses.':
    'progress.estimateHint',
  'Export to keep this transcript after closing the app.':
    'transcript.exportHint',
  'Faster large-model transcription with increased memory requirements.':
    'models.descriptionTurbo',
  'Fast transcription with lower resource requirements.':
    'models.descriptionTiny',
  'Folder missing or incomplete. Choose the model folder again.':
    'models.folderMissing',
  'High accuracy with substantial memory requirements.':
    'models.descriptionLarge',
  'Higher accuracy with increased memory and processing time.':
    'models.descriptionMedium',
  'Interface preview — files, downloads and results are simulated.':
    'app.previewNotice',
  'Longer recordings and larger models take more time.':
    'progress.longRecording',
  'Native folders are available in the desktop app.':
    'errors.nativeFoldersOnly',
  'Saved preferences could not be read. Select your model and language again.':
    'errors.preferencesRead',
  'Starting a new transcription will replace this result. Have you exported anything you want to keep?':
    'transcript.replaceConfirm',
  'Start with Base for general use or Tiny for speed. Larger models need more memory and processing time. Sizes shown are approximate downloads.':
    'models.choosingHint',
  'The app downloads model files from these pages. Your recordings are never uploaded.':
    'models.sourcesHint',
  'The dropped file path is unavailable. Use Choose file instead.':
    'errors.dropPathUnavailable',
  'The file was moved or deleted. Choose it again from its current location.':
    'errors.fileMoved',
  'The file was processed successfully. Check that it contains clear speech, or try another model or spoken language.':
    'transcript.noSpeechHint',
  'The model configuration or tokenizer is unreadable. Download the model again.':
    'errors.modelUnreadable',
  'The model files could not be deleted. Check folder permissions and try again.':
    'errors.modelDeleteFailed',
  'The model storage changed. Refresh models and try again.':
    'errors.modelStorageChanged',
  'The selected file is no longer available. It may have been moved or deleted. Choose it again.':
    'errors.fileUnavailable',
  'This language is not supported by the selected engine.':
    'errors.languageUnsupported',
  'This model cannot be downloaded. Choose a model from the catalog.':
    'errors.modelNotInCatalog',
  'This model is missing tokenizer.json. Download a complete CTranslate2 model.':
    'errors.tokenizerMissing',
  'This transcript is no longer available. Transcribe the file again.':
    'errors.transcriptUnavailable',
  'Use a local folder. No download or duplicate files.':
    'models.localFolderHint',
  'Where are models stored, and which folders can I use?':
    'models.storageQuestion',
};

export const messageKey = (message: string) =>
  Object.prototype.hasOwnProperty.call(messageKeys, message)
    ? messageKeys[message]
    : message;
