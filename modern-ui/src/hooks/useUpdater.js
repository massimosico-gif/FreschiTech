import { useState, useEffect } from 'react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { getVersion } from '@tauri-apps/api/app'

export const useUpdater = () => {
  const [status, setStatus] = useState('idle') // idle, checking, available, up-to-date, downloading, success, error
  const [newVersion, setNewVersion] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [updateObj, setUpdateObj] = useState(null)

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error)
  }, [])

  const checkForUpdates = async () => {
    setStatus('checking')
    setErrorMessage(null)
    try {
      const update = await check()
      if (update) {
        setNewVersion(update.version)
        setUpdateObj(update)
        setStatus('available')
      } else {
        setStatus('up-to-date')
        setTimeout(() => setStatus('idle'), 5000)
      }
    } catch (error) {
      console.error('Failed to check for updates:', error)
      setStatus('error')
      setErrorMessage(error.toString())
    }
  }

  const installUpdate = async () => {
    if (!updateObj) return
    setStatus('downloading')
    setDownloadProgress(0)
    
    try {
      let downloaded = 0
      let contentLength = 0
      
      await updateObj.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            setDownloadProgress(Math.round((downloaded / contentLength) * 100))
            break
          case 'Finished':
            setStatus('success')
            break
        }
      })
    } catch (error) {
      console.error('Failed to install update:', error)
      setStatus('error')
      setErrorMessage(error.toString())
    }
  }

  return {
    status,
    newVersion,
    currentVersion,
    downloadProgress,
    errorMessage,
    checkForUpdates,
    installUpdate,
    relaunch
  }
}
