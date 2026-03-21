import { derived, writable } from 'svelte/store'

const INITIAL_STATE = { count: 0 }

function createAppStore() {
  const { subscribe, update, set } = writable(INITIAL_STATE)

  return {
    subscribe,
    increment: () => update((state) => ({ ...state, count: state.count + 1 })),
    reset: () => set(INITIAL_STATE)
  }
}

export const appStore = createAppStore()

export const doubleCount = derived(appStore, ($state) => $state.count * 2)
