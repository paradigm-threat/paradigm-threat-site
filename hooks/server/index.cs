import { index } from '@relay/search/chat';

// Thin router — Rust chat plugin owns ingest / chat_comments.
export default function run(ctx) {
  return index(ctx);
}
