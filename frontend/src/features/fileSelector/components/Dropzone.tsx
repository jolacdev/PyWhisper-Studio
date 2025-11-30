import cx from 'classnames';
import { DragEvent, useEffect, useState } from 'react';

import usePyWebViewState from '@hooks/usePyWebViewState';
import { Upload } from '@icons/Upload';
import useAppStore from 'store/useAppStore';

const Dropzone = () => {
  const [isDragging, setIsDragging] = useState(false);

  const file = useAppStore((state) => state.file);
  const setFile = useAppStore((state) => state.setFile);

  const pwvFile = usePyWebViewState<null | string>({
    initialValue: null,
    key: 'file',
  });

  useEffect(() => {
    // TODO: Take into account selectedFile changed with the picker (file gets modified)
    if (pwvFile && pwvFile !== file) {
      setFile(pwvFile);
      console.log(`Selected file: ${file}`);
    }
  }, [file, pwvFile, setFile]);

  useEffect(() => {
    console.log(`render Dropzone`);
  });

  const handleClick = async () => {
    const selectedFile = await window.pywebview.api.open_file_dialog();
    if (selectedFile && selectedFile !== file) {
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDragging(false);
    console.log({ e });
  };

  // TODO: Check https://supabase.com/ui/docs/nextjs/dropzone
  // TODO: Remove console.logs, comments, etc.
  // TODO: Add copy to i18n.
  // TODO: Add component for uploaded files (icon_named = [MP3], name, size, remove button 'X')
  // TODO: Since event is controlled from python, handle disabled state by extension in frontend
  // TODO: Check the prevent.default()'s
  return (
    <button
      className={cx(
        'flex flex-col items-center justify-center gap-4',
        'bg-charcoal-900 border-charcoal-500 w-full rounded-lg border-1 border-dashed p-6 wrap-break-word hover:cursor-pointer',
        {
          'border-leaf-200 bg-charcoal-800': isDragging,
        },
      )}
      id="file-dropzone" // TODO: Check if id is the correct identifier for pwv
      onClick={handleClick}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="pointer-events-none flex flex-col items-center gap-1">
        <Upload height="32px" width="32px" />
        <h3>Upload your file here</h3>
      </div>
      <div className="pointer-events-none">
        <p className="mb-1 text-xs">
          Drag and drop your file here, or click to select one.
        </p>
        <p className="text-xs">Supported formats: audio or video files only.</p>
      </div>
    </button>
  );
};

export default Dropzone;
