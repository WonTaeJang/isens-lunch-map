import type { Review } from './review-model';
export function createReviewEditor(review: Review | null) {
  return {
    base: review,
    content: review?.content ?? '',
    recommended: review?.is_recommended ?? null,
    tags: review?.tags ?? [],
    conflict: false,
    latest: undefined as Review | null | undefined,
  };
}
export type ReviewEditorState = ReturnType<typeof createReviewEditor>;
type Action =
  | { type: 'content'; value: string }
  | { type: 'recommendation'; value: boolean }
  | { type: 'tag'; value: string }
  | { type: 'conflict' }
  | { type: 'latest'; value: Review | null }
  | { type: 'accept-version' };
export function reviewEditorReducer(state: ReviewEditorState, action: Action): ReviewEditorState {
  switch (action.type) {
    case 'content':
      return { ...state, content: action.value };
    case 'recommendation':
      return { ...state, recommended: action.value };
    case 'tag':
      return {
        ...state,
        tags: state.tags.includes(action.value)
          ? state.tags.filter((tag) => tag !== action.value)
          : state.tags.length < 3
            ? [...state.tags, action.value]
            : state.tags,
      };
    case 'conflict':
      return { ...state, conflict: true, latest: undefined };
    case 'latest':
      return { ...state, latest: action.value };
    // Receiving a server version never overwrites the draft or silently authorizes a retry.
    case 'accept-version':
      return state.latest ? { ...state, base: state.latest, conflict: false } : state;
  }
}
