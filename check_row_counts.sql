-- Quick query to check total row counts for programmes and results tables
SELECT 
  (SELECT COUNT(*) FROM public.programmes) AS total_programmes,
  (SELECT COUNT(*) FROM public.results) AS total_results;
