-- Normalize storylet choice targetStoryletId values to UUID ids

update public.storylets as s
set choices = (
  select jsonb_agg(
    case
      when t.id is not null then
        jsonb_set(c, '{targetStoryletId}', to_jsonb(t.id::text), true)
      else c
    end
  )
  from jsonb_array_elements(s.choices) as c
  left join public.storylets as t
    on t.slug = c->>'targetStoryletId'
)
where s.choices is not null
  and jsonb_typeof(s.choices) = 'array';
