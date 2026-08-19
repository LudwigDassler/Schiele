-- ==========================================
-- SCHIELE VISION AI - DATABASE MIGRATION
-- ==========================================
-- Выполни этот скрипт в Supabase SQL Editor для добавления поддержки
-- мультимодального поиска с анализом изображений через Nvidia Nemotron

-- Включаем расширение для векторного поиска (если еще не включено)
create extension if not exists vector;

-- Добавляем новые колонки в таблицу images для хранения результатов AI-анализа
alter table images 
add column if not exists visual_tags text[],          -- Массив тегов (включая текст с картинки)
add column if not exists image_description text,      -- Полное описание изображения от AI
add column if not exists color_palette jsonb,         -- Массив HEX цветов ["#FF0000", "#00FF00"]
add column if not exists style_vector vector(1024);   -- Вектор стиля для семантического поиска (опционально)

-- Создаем индексы для ускорения поиска по новым полям

-- Индекс для быстрого поиска по массиву тегов (GIN индекс)
create index if not exists idx_images_visual_tags on images using gin (visual_tags);

-- Индекс для полнотекстового поиска по описанию
create index if not exists idx_images_description on images using gin (to_tsvector('english', coalesce(image_description, '')));

-- Индекс для будущего семантического поиска по стилю (векторное сходство)
create index if not exists idx_images_style_vector on images using ivfflat (style_vector vector_cosine_ops) with (lists = 100);

-- Комментарий к изменениям
comment on column images.visual_tags is 'AI-generated tags including extracted text from images (band names, etc.)';
comment on column images.image_description is 'Detailed AI description of the image content';
comment on column images.color_palette is 'Dominant colors extracted from the image as JSON array';
comment on column images.style_vector is '1024-dimensional vector for semantic style similarity search';
