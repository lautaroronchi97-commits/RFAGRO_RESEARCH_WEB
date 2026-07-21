-- Auditoria E4, hallazgo #4: ADMIN_SEED_EMAILS (src/lib/auth/config.ts) y el email
-- hardcodeado en handle_new_user() son el mismo dato en dos lenguajes, sin ningun chequeo
-- automatico si divergen. Esta funcion expone el array embebido en handle_new_user() para
-- poder compararlo desde afuera (script chico) contra ADMIN_SEED_EMAILS antes de cambiar
-- la lista de admins. OJO: si se toca el array de handle_new_user(), hay que tocar tambien
-- el de esta funcion (son 2 fuentes de la MISMA verdad, no se puede evitar del todo en SQL
-- puro sin agregar una tabla nueva para algo que cambia una vez cada varios meses).
-- Solo lectura, sin datos sensibles (el email ya esta en el repo checkeado); se restringe a
-- authenticated por prolijidad, no por necesidad de seguridad real.
create or replace function public.admin_seed_emails_actuales()
returns text[]
language sql
security definer
set search_path = public
as $$
  select array['lautaroronchi97@gmail.com'];
$$;

revoke all on function public.admin_seed_emails_actuales() from public;
revoke all on function public.admin_seed_emails_actuales() from anon;
grant execute on function public.admin_seed_emails_actuales() to authenticated;
