import { contextBridge, ipcRenderer } from 'electron';

import { allChannels } from '../shared/channels';
import { allEvents } from '../shared/events';

import { createBridge } from './bridge';

// Empacotado em um único arquivo por esbuild (sandbox não resolve imports locais).
contextBridge.exposeInMainWorld('api', createBridge(ipcRenderer, allChannels(), allEvents()));
