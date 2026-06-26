
INSERT INTO public.emoji_presets (key, name, fallback_emoji, premium_emoji_id, scope)
VALUES
  ('price', 'Price', '💵', '5258368777350816286', 'system'),
  ('duration', 'Duration', '📅', '5258423306255604960', 'system'),
  ('stock', 'In stock', '📦', '5258134813302332906', 'system')
ON CONFLICT (key) DO UPDATE SET
  fallback_emoji = EXCLUDED.fallback_emoji,
  premium_emoji_id = EXCLUDED.premium_emoji_id,
  name = EXCLUDED.name;
