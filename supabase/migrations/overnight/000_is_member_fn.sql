-- User membership helper (idempotent)
create or replace function public.is_member_of_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_restaurants ur
    where ur.user_id = auth.uid()
      and ur.restaurant_id = p_restaurant_id
  );
$$;

comment on function public.is_member_of_restaurant(uuid)
  is 'True when the current auth.uid() is mapped to the given restaurant via user_restaurants.';