import { useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

export type UpdaterStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'downloading'
  | 'success'
  | 'error';

export interface UseUpdaterResult {
  status: UpdaterStatus;
  newVersion: string | null;
  currentVersion: string | null;
  downloadProgress: number;
  errorMessage: string | null;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  relaunch: typeof relaunch;
}

export const useUpdater = (): UseUpdaterResult => {
  const [status, setStatus] = useState<UpdaterStatus>('idle');
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updateObj, setUpdateObj] = useState<Update | null>(null);

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  const checkForUpdates = async (): Promise<void> => {
    setStatus('checking');
    setErrorMessage(null);
    try {
      const update = await check();
      if (update) {
        setNewVersion(update.version);
        setUpdateObj(update);
        setStatus('available');
      } else {
        setStatus('up-to-date');
        setTimeout(() => setStatus('idle'), 5000);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setStatus('error');
      setErrorMessage(String(error));
    }
  };

  const installUpdate = async (): Promise<void> => {
    if (!updateObj) return;
    setStatus('downloading');
    setDownloadProgress(0);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await updateObj.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            // Senza dimensione nota la percentuale sarebbe NaN: in quel caso
            // la barra resta a 0 invece di mostrare un valore assurdo.
            setDownloadProgress(
              contentLength > 0
                ? Math.round((downloaded / contentLength) * 100)
                : 0
            );
            break;
          case 'Finished':
            setDownloadProgress(100);
            setStatus('success');
            break;
        }
      });
    } catch (error) {
      console.error('Failed to install update:', error);
      setStatus('error');
      setErrorMessage(String(error));
    }
  };

  return {
    status,
    newVersion,
    currentVersion,
    downloadProgress,
    errorMessage,
    checkForUpdates,
    installUpdate,
    relaunch,
  };
};

export default useUpdater;
