import { create } from 'zustand';

interface NavState {
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

/** Mobile-only conversation drawer state — lifted here since it's toggled from the header (child screens) but rendered by the (app) layout. */
export const useNavStore = create<NavState>((set) => ({
  drawerOpen: false,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
}));
