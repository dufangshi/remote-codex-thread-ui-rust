import { createContext, useContext } from 'react';

export const FilePanelContext = createContext<{ close: () => void; label?: string } | null>(null);
export const useFilePanel = () => useContext(FilePanelContext);
