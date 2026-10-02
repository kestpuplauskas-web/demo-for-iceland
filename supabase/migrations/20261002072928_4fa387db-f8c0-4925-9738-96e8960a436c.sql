UPDATE public.property_settings
SET address = 'Ólafsfjarðarvegur 625', postal_code = '626', city = 'Ólafsfjörður',
    phone = COALESCE(NULLIF(phone, ''), '+354 466 0192'),
    email = COALESCE(NULLIF(email, ''), 'stay@manahlid.is')
WHERE scope = 'global';