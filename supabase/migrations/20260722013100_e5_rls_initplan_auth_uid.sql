-- E5 fase 2 (hallazgo #13b, advisor auth_rls_initplan). APLICADA el 22/07/2026 vía MCP.
-- (select auth.uid()) se evalúa una vez por statement en vez de una vez por fila.
-- Mismas semánticas, mejor plan — importa cuando el login prenda (tocar_sesion por request).
alter policy "self read profile"   on public.profiles         using (id = (select auth.uid()));
alter policy "self update profile" on public.profiles         using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "self insert log"     on public.access_log       with check (user_id = (select auth.uid()));
alter policy "self read sesion"    on public.sesiones_activas using (user_id = (select auth.uid()));
