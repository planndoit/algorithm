-- Runs inside a nested transaction. Successful tests deliberately roll back
-- all fixture rows; failures abort the statement and also leave no fixture data.
do $$
declare
 ids uuid[] := '{}'; c uuid; q uuid; incomplete uuid; overlap uuid;
 r uuid; repeated uuid; request uuid := gen_random_uuid();
 answers boolean[] := array[true,true,true,true,true,true,true,true,false,false];
 i integer; actual integer;
begin
 begin
  for i in 1..10 loop
   insert into public.contents(title,category,platform,source_url,status,admin_notes)
   values('[AUTOTEST] sample','밈','기타','https://example.invalid/'||gen_random_uuid(),'approved','PRIVATE') returning id into c;
   ids:=array_append(ids,c);
  end loop;
  incomplete:=public.save_quiz(null,'[AUTOTEST] incomplete','2100-01-01','2101-01-01',ids[1:9]);
  begin
   update public.quiz_sets set status='published' where id=incomplete;
   raise exception 'Expected incomplete publication to fail';
  exception when raise_exception then
   if sqlerrm not like '%Exactly 10%' then raise;end if;
  end;
  q:=public.save_quiz(null,'[AUTOTEST] complete',now()-interval '1 day',now()+interval '1 day',ids);
  update public.quiz_sets set status='published' where id=q;
  if exists(select 1 from public.quiz_questions where quiz_id=q and snapshot ? 'admin_notes') then raise exception 'Private metadata leaked';end if;
  begin
   update public.quiz_sets set title='changed' where id=q;
   raise exception 'Expected immutable quiz';
  exception when raise_exception then
   if sqlerrm not like '%immutable%' then raise;end if;
  end;
  overlap:=public.save_quiz(null,'[AUTOTEST] overlap',now()-interval '1 hour',now()+interval '2 hours',ids);
  begin
   update public.quiz_sets set status='published' where id=overlap;
   raise exception 'Expected overlapping publication to fail';
  exception when exclusion_violation then null;
  end;
  r:=public.submit_result(q,request,answers,'smoke-test');
  repeated:=public.submit_result(q,request,answers,'smoke-test');
  if r<>repeated then raise exception 'Idempotency failed';end if;
  select score into actual from public.quiz_results where id=r;
  if actual<>80 then raise exception 'Score mismatch';end if;
  select count(*) into actual from public.quiz_answers where result_id=r;
  if actual<>10 then raise exception 'Answer transaction mismatch';end if;
  begin
   perform public.submit_result(q,gen_random_uuid(),array[true],'smoke-test');
   raise exception 'Expected malformed answers to fail';
  exception when raise_exception then
   if sqlerrm not like '%10 boolean%' then raise;end if;
  end;
  raise exception using errcode='P9001',message='All checks passed; rolling back fixtures';
 exception when sqlstate 'P9001' then
  raise notice 'PASS: publication, overlap, snapshots, immutability, scoring, idempotency and answer transaction; fixtures rolled back';
 end;
end $$;
