import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import Dropzone from './components/molecules/Dropzone';
import TranscribeButton from './components/molecules/TranscribeButton';

const App = () => {
  const { t } = useTranslation();

  // TODO: Remove
  useEffect(() => {
    console.log('Rendering App...');
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-charcoal-50 mb-12 text-center text-5xl font-extrabold">
        {t('title')}
      </h1>
      <Dropzone />
      <TranscribeButton />
    </div>
  );
};

export default App;
