ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS state text, ADD COLUMN IF NOT EXISTS neighborhood text;
CREATE INDEX IF NOT EXISTS listings_state_city_idx ON public.listings (state, city);
UPDATE public.listings SET state = CASE
  WHEN lower(coalesce(city,'') || ' ' || coalesce(location,'') || ' ' || coalesce(address,'')) ~ '(abuja|fct|maitama|wuse|asokoro|garki|gwarinpa|jabi|life ?camp|katampe|utako|lokogoma|kubwa|apo|guzape|durumi|jahi)' THEN 'FCT Abuja'
  WHEN lower(coalesce(city,'') || ' ' || coalesce(location,'') || ' ' || coalesce(address,'')) ~ '(port harcourt|rivers|trans amadi|rumu|old gra)' THEN 'Rivers'
  WHEN lower(coalesce(city,'') || ' ' || coalesce(location,'') || ' ' || coalesce(address,'')) ~ '(lagos|lekki|ikoyi|victoria island|ikeja|maryland|ogudu|yaba|surulere|ajah|gbagada|magodo|oniru|ilupeju|chevron|sangotedo|festac|ikorodu|banana island|ogba|ojodu|opebi|allen)' THEN 'Lagos'
  WHEN lower(coalesce(city,'')) ~ 'enugu' THEN 'Enugu'
  WHEN lower(coalesce(city,'')) ~ 'ibadan' THEN 'Oyo'
  WHEN lower(coalesce(city,'')) ~ 'uyo' THEN 'Akwa Ibom'
  WHEN lower(coalesce(city,'')) ~ 'owerri' THEN 'Imo'
  WHEN lower(coalesce(city,'')) ~ 'calabar' THEN 'Cross River'
  WHEN lower(coalesce(city,'')) ~ 'benin' THEN 'Edo'
  WHEN lower(coalesce(city,'')) ~ 'kano' THEN 'Kano'
  ELSE NULL END
WHERE state IS NULL;