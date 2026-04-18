import { signal } from "@preact/signals";
import type { CommentNode } from "@ucs/types";

export const commentTree = signal<CommentNode[]>([]);
export const isLoading = signal(true);
export const error = signal<string | null>(null);
