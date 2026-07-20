// Shared domain types used across the app and API routes.

export type Photo = {
  id: string;
  src: string;
  thumb: string;
  title: string;
  author: string;
  authorAvatar: string;
  source: string;
  link: string;
  description?: string;
};

export type Board = {
  id: string;
  name: string;
  description?: string;
};

export type Pin = {
  id: string;
  image_url: string;
  title: string;
  board_id?: string;
  source_url?: string;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};
