-- Las funciones de trigger no deben poder llamarse vía /rest/v1/rpc
revoke execute on function public.enforce_allowed_email() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is_allowed la usan las políticas RLS del rol authenticated; anon no la necesita
revoke execute on function public.is_allowed() from public, anon;
grant execute on function public.is_allowed() to authenticated;
