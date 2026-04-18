import { signal, computed } from "@preact/signals";
import type { User } from "@ucs/types";

const TOKEN_KEY = "ucs_token";

export const token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
export const currentUser = signal<User | null>(null);
export const isLoggedIn = computed(() => token.value !== null);

export function setToken(t: string) {
  token.value = t;
  localStorage.setItem(TOKEN_KEY, t);
}

export function clearToken() {
  token.value = null;
  currentUser.value = null;
  localStorage.removeItem(TOKEN_KEY);
}
