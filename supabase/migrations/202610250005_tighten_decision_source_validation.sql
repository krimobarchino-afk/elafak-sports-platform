-- Tighten decision-source validation: exact excerpt, fee language and approved amount must all be present.
create or replace function private.validate_membership_fee_decision_source()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  report_text text;
  fee_amount text;
begin
  if new.setting_key='annual_membership_fee_dzd' then
    fee_amount := new.setting_value->>'amount';
    if coalesce(fee_amount,'') !~ '^[0-9]+([.][0-9]{1,2})?$' or coalesce(fee_amount::numeric,0)<=0 then
      raise exception 'Annual membership fee must be greater than zero' using errcode='check_violation';
    end if;

    if new.source_decision !~* '(اشتراك|انخراط|رسوم[[:space:]]*(العضوية|الانخراط)|membership[[:space:]]*(fee|dues)|annual[[:space:]]*(subscription|dues))' then
      raise exception 'Decision excerpt must explicitly mention membership fee/subscription' using errcode='check_violation';
    end if;

    if position(fee_amount in new.source_decision)=0 then
      raise exception 'Decision excerpt must contain the approved fee amount' using errcode='check_violation';
    end if;

    select coalesce(m.decisions,'') || ' ' || coalesce(m.minutes_text,'')
      into report_text
    from public.meetings m
    where m.id=new.source_meeting_id
      and m.meeting_type='general_assembly'
      and m.status='approved';

    if report_text is null or strpos(report_text,new.source_decision)=0 then
      raise exception 'Setting must reference exact text contained in an approved General Assembly report' using errcode='check_violation';
    end if;
  end if;
  return new;
end;
$function$;
