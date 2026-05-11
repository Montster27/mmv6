"use client";

import { createContext, useContext } from "react";

export interface StudioContextValue {
  trackFilter: string | null;
  setTrackFilter: (key: string | null) => void;
  search: string;
  setSearch: (q: string) => void;
  sidebarOn: boolean;
  setSidebarOn: (on: boolean) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const defaults: StudioContextValue = {
  trackFilter: null,
  setTrackFilter: () => {},
  search: "",
  setSearch: () => {},
  sidebarOn: true,
  setSidebarOn: () => {},
  paletteOpen: false,
  setPaletteOpen: () => {},
};

export const StudioContext = createContext<StudioContextValue>(defaults);

export function useStudio(): StudioContextValue {
  return useContext(StudioContext);
}
