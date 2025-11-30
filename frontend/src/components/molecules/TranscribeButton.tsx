import useAppStore from '../../store/useAppStore';

// TODO: Temporary component.
const TranscribeButton = () => {
  const file = useAppStore((state) => state.file);

  const handleRunTranscription = async (path: string) => {
    const segments = await window.pywebview.api.run_transcription(path, 'base');
    console.log({ segments }); // TODO: Remove
  };

  if (!file) {
    return;
  }

  return (
    <button
      className="bg-leaf-950 focus:bg-leaf-900 active:not-disabled:bg-leaf-800 flex items-center justify-center rounded-sm p-2 text-white transition-all duration-50"
      onClick={() => handleRunTranscription(file)}
    >
      Generate
    </button>
  );
};

export default TranscribeButton;
