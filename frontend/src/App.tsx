import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const App = () => {
  const { t } = useTranslation();

  const [filePath, setFilePath] = useState<string>();

  const handleFileSelection = async () => {
    const path = await window.pywebview.api.open_file_dialog();
    if (path) {
      setFilePath(path);
    }
  };

  const handleRunTranscription = async (path: string) => {
    const segments = await window.pywebview.api.run_transcription(path);
    console.log({ segments }); // TODO: Remove
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-charcoal-50 mb-12 text-center text-5xl font-extrabold">
        {t('title')}
      </h1>
      <div className="flex justify-center gap-4">
        <button
          className="bg-leaf-950 focus:bg-leaf-900 active:not-disabled:bg-leaf-800 flex items-center justify-center rounded-sm p-2 text-white transition-all duration-50"
          onClick={handleFileSelection}
        >
          Select file
        </button>
        <button
          className="bg-leaf-950 focus:bg-leaf-900 active:not-disabled:bg-leaf-800 flex items-center justify-center rounded-sm p-2 text-white transition-all duration-50"
          onClick={() => handleRunTranscription(filePath!)}
        >
          Generate
        </button>
      </div>
    </div>
  );
};

export default App;
