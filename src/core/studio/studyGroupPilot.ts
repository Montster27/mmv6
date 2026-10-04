import type { StudioManifest, StudioRecord } from '@/types/studio';
import type { RehearsalScenario, RehearsalStep } from './rehearsal';

// Stable identities allow the template to be reviewed, compared and handed off.
const uuid = (n: number) => `7d201000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export const PILOT_PLAN_ID = uuid(1);
export function studyGroupPilot(base: StudioManifest): StudioManifest {
  const academic = base.tracks.find(t => t.key === 'academic' && t.is_enabled);
  const belonging = base.tracks.find(t => t.key === 'belonging' && t.is_enabled);
  if (!academic || !belonging) throw new Error('The pilot needs enabled academic and belonging tracks.');
  const sceneIds = { invite:uuid(20),meeting:uuid(21),missed:uuid(22),repair:uuid(23),late:uuid(24),later:uuid(25),floor:uuid(26) };
  const flag = (name:string) => `pilot_study_${name}`;
  const key = (name:string) => `pilot_study_${name}`;
  const priya = 'npc_studious_priya';
  const choice = (id:string,label:string,text:string,extra:StudioRecord={}) => ({id,label,reaction_text:text,...extra});
  const scene = (name:keyof typeof sceneIds,title:string,body:string,segment:string,choices:StudioRecord[],extra:StudioRecord={}) => ({id:sceneIds[name],slug:key(name),storylet_key:key(name),title,body,choices,is_active:true,track_id:academic.id,order_index:20+Object.keys(sceneIds).indexOf(name),due_offset_days:0,expires_after_days:0,segment,requirements:{},...extra});
  const storylets = [
    scene('invite','A spare chair','Priya taps a blank space in her notebook. “We could work through it together this afternoon.” You look at the empty chair as if it has already been reserved.', 'morning',[
      choice('accept','Say you will come','She writes your name. Somehow that makes it feel more definite.',{sets_flag:[flag('accepted')]}),
      choice('decline','Keep the afternoon free','“All right.” She does not ask for a reason. You had already prepared one.',{sets_flag:[flag('declined')],precludes:[key('meeting'),key('late')]}),
    ],{introduces_npc:[priya]}),
    scene('meeting','The space beside the notebook','The same chair is empty. Priya has started without you. There is still a page turned toward your side of the table.','afternoon',[
      choice('attend','Sit down and work through it','The problem becomes smaller when there are two sets of mistakes.',{sets_flag:[flag('attended')],energy_cost:6,outcome:{deltas:{stress:-4,resources:{knowledge:2}}},practices_skills:['close_reading'],events_emitted:[{npc_id:priya,type:'SHOWED_UP'}],precludes:[key('missed'),key('repair'),key('late')]}),
      choice('renegotiate','Ask to compare notes tonight','She checks the clock before saying yes. You notice that she checked.',{sets_flag:[flag('renegotiated')],precludes:[key('missed'),key('late')]}),
      choice('leave','Say you cannot stay','“Okay,” she says, and turns the page back.',{sets_flag:[flag('broken')],outcome:{deltas:{stress:3}},events_emitted:[{npc_id:priya,type:'WENT_MISSING'}],precludes:[key('missed'),key('late')]}),
    ],{requirements:{requires_flag:flag('accepted')}}),
    scene('missed','The page she kept','You see Priya fold a page into her bag. “I kept the notes,” she says. It is hard to tell whether she means for you.','evening',[
      choice('acknowledge','Admit you did not come','She nods once. There is no argument to hide inside.',{sets_flag:[flag('broken')],outcome:{deltas:{stress:3}},events_emitted:[{npc_id:priya,type:'WENT_MISSING'}]}),
      choice('let_go','Leave it there','The conversation becomes about something else.',{sets_flag:[flag('let_go')]}),
    ],{requirements:{requires_flag:flag('accepted'),excludes_storylets:[key('meeting')]}}),
    scene('repair','A smaller promise','You find a note beneath your door. A question from the worksheet, copied carefully. It is an opening, although nobody has called it that.','night',[
      choice('repair','Return a worked answer','Your explanation runs into the margin. This time you leave something concrete.',{sets_flag:[flag('repaired')],energy_cost:2,outcome:{deltas:{stress:-2}},events_emitted:[{npc_id:priya,type:'REPAIR_ATTEMPT'}]}),
      choice('pass','Put the page away','You put it somewhere you will remember. You tell yourself that twice.'),
    ],{requirements:{requires_flag:flag('broken')}}),
    scene('late','At the edge of the conversation','There are notebooks on the common-room table. You cannot tell how long the others have been meeting. Nobody moves the spare chair.','evening',[
      choice('join_late','Ask what they are working on','Priya slides the page around. “This part.” There is no test at the doorway.',{sets_flag:[flag('late_entry')],energy_cost:2,outcome:{deltas:{resources:{knowledge:1}}},events_emitted:[{npc_id:priya,type:'SHOWED_UP'}]}),
      choice('pass','Keep walking','Their conversation continues behind you. The corridor has other doors.'),
    ],{introduces_npc:[priya],requirements:{excludes_storylets:[key('invite'),key('meeting')]}}),
    scene('later','Notes under the lamp','Priya sets her notebook between the two of you. “You said tonight.” It sounds more like a fact than an accusation.','night',[
      choice('keep_new_time','Compare the notes','You keep the smaller promise. The old one does not quite disappear.',{sets_flag:[flag('kept_new_time')],energy_cost:3,events_emitted:[{npc_id:priya,type:'SHOWED_UP'}]}),
    ],{requirements:{requires_flag:flag('renegotiated')}}),
    scene('floor','The door propped open','Doug is balancing a paper cup on the arm of a chair. “We are staying here a while.” There is room, and no one is taking attendance.','afternoon',[
      choice('stay_floor','Spend the afternoon here','You stay until the cups have left rings on the table.',{sets_flag:[flag('floor_chosen')],precludes:[key('meeting')],energy_cost:3,outcome:{deltas:{stress:-2}},events_emitted:[{npc_id:'npc_floor_doug',type:'SHARED_MEAL'}]}),
      choice('pass_floor','Keep moving','“Another time.” It could be an invitation or just something people say.'),
    ],{track_id:belonging.id,introduces_npc:['npc_floor_doug']}),
  ];
  const factIds = {accepted:uuid(40),broken:uuid(41),renegotiated:uuid(42)};
  const definitions:StudioRecord[] = [
    ...Object.entries(factIds).map(([name,id])=>({id,kind:'fact',title:`Study group: ${name}`,fact_schema:{type:'boolean',default_known:true,default_value:false},runtime_binding:{kind:'flag',key:flag(name)}})),
    {id:uuid(43),kind:'npc',title:'Priya',guidance:'Do not infer friendship from a single invitation. Runtime identity: npc_studious_priya.'},
    {id:uuid(44),kind:'npc',title:'Doug',guidance:'An alternative social invitation. Runtime identity: npc_floor_doug.'},
    {id:uuid(45),kind:'location',title:'Study table'}, {id:uuid(46),kind:'location',title:'Floor lounge'},
    {id:uuid(47),kind:'calendar',title:'Afternoon study window',storylet_ids:[sceneIds.meeting],reservation:{track_id:academic.id,day:0,segment:'afternoon',start_hour:12,end_hour:16,location_id:uuid(45),npc_ids:[uuid(43)],conditions:[{definition_id:factIds.accepted,mode:'requires',value:true}]}},
    {id:uuid(48),kind:'calendar',title:'Afternoon floor gathering',storylet_ids:[sceneIds.floor],reservation:{track_id:belonging.id,day:0,segment:'afternoon',start_hour:12,end_hour:16,location_id:uuid(46),npc_ids:[uuid(44)],conditions:[]}},
  ];
  const factUse = (definition_id:string,mode:string,scene:keyof typeof sceneIds,choice_id?:string)=>({definition_id,mode,value:true,storylet_id:sceneIds[scene],...(choice_id?{choice_id}:{})});
  const plans:StudioRecord[] = [
    {id:uuid(1),kind:'direction',title:'Study-group collaboration pilot',experience:'A life containing invitations, obligations and alternatives. The player decides which connections matter.',constraints:'Declining is legitimate. Ignoring an invitation must not create a promise. Repair costs effort without guaranteeing intimacy. Precise appointment hours and automatic duration charging are not implemented.',acceptance:'Run all seven isolated pilot rehearsals; then add integration rehearsals with the surrounding catalog before publication.',open_questions:'Assign actual contributors and an independent reviewer. Role labels are briefs, not proof of human review.'},
    {id:uuid(2),kind:'plot',parent_id:uuid(1),title:'A place at the table',question:'Can a small promise become a connection?',constraints:'Study and floor invitations coexist; neither is a mandatory route.'},
    {id:uuid(3),kind:'strand',parent_id:uuid(2),title:'Lead: coordinate invitations and consequences',constraints:'Keep the accepted, broken and renegotiated flags stable. Review consumers when producers change.',dependencies:[...Object.values(factIds),uuid(47),uuid(48)]},
    {id:uuid(4),kind:'arc',parent_id:uuid(3),title:'Writer: invitation and meeting',storylet_ids:[sceneIds.invite,sceneIds.meeting,sceneIds.later],miss_path:'Decline cleanly, renegotiate, leave, or miss the meeting. Do not create an obligation from silence.',fact_uses:[factUse(factIds.accepted,'establishes','invite','accept'),factUse(factIds.accepted,'requires','meeting'),factUse(factIds.renegotiated,'establishes','meeting','renegotiate'),factUse(factIds.renegotiated,'requires','later'),factUse(factIds.broken,'establishes','meeting','leave')]},
    {id:uuid(5),kind:'arc',parent_id:uuid(3),title:'Writer: missed commitment and repair',storylet_ids:[sceneIds.missed,sceneIds.repair,sceneIds.late],miss_path:'Ignored invitations allow late entry; broken commitments allow a smaller repair; the player can leave either opportunity alone.',fact_uses:[factUse(factIds.accepted,'requires','missed'),factUse(factIds.broken,'establishes','missed','acknowledge'),factUse(factIds.broken,'requires','repair')]},
    {id:uuid(6),kind:'arc',parent_id:uuid(3),title:'Writer: competing floor gathering',storylet_ids:[sceneIds.floor],miss_path:'The gathering remains a valid alternative. Choosing it precludes the afternoon meeting, and an existing promise can later be acknowledged.'},
    {id:uuid(7),kind:'arc',parent_id:uuid(3),title:'Independent reviewer: challenge the handoffs',storylet_ids:[],miss_path:'Test inattention as a player choice, not a failure to follow the plot.',acceptance:'Change the invitation flag; the meeting contract must fail. Move the meeting day; calendar validation must fail. Remove the repair gate; review must fail. Verify a writer cannot approve their own revision.'},
  ];
  const choose = (scene:keyof typeof sceneIds,choice_id:string,expect:RehearsalStep['expect']={}):RehearsalStep=>({action:'choose',storylet_id:sceneIds[scene],choice_id,expect});
  const advance = (expect:RehearsalStep['expect']={}):RehearsalStep=>({action:'advance',expect});
  // Existing scenes are explicitly precluded only inside these isolated tests, never in player data.
  const initial = {day:0,segment:'morning',hours:16,precluded:base.storylets.filter(s=>s.storylet_key).map(s=>String(s.storylet_key))};
  const scenarios:RehearsalScenario[] = [
    {id:uuid(60),title:'Pilot: attend and learn',mode:'rehearsal',initial,steps:[choose('invite','accept',{flags:[flag('accepted')]}),advance({offered:[sceneIds.meeting,sceneIds.floor]}),choose('meeting','attend',{resources:{energy:64,stress:16,knowledge:2},practiced:['close_reading'],relationships:{[priya]:{met:true,knows_name:true,relationship:7}}}),advance({forbidden:[sceneIds.missed,sceneIds.late]}),advance({forbidden:[sceneIds.repair]})]},
    {id:uuid(61),title:'Pilot: decline without a debt',mode:'rehearsal',initial,steps:[choose('invite','decline'),advance({forbidden:[sceneIds.meeting]}),advance({forbidden:[sceneIds.missed,sceneIds.late],absent_flags:[flag('accepted'),flag('broken')]})]},
    {id:uuid(62),title:'Pilot: enter late',mode:'rehearsal',initial,steps:[advance(),advance({offered:[sceneIds.late],forbidden:[sceneIds.missed]}),choose('late','join_late',{flags:[flag('late_entry')],resources:{knowledge:1,energy:68}})]},
    {id:uuid(63),title:'Pilot: break and repair',mode:'rehearsal',initial,steps:[choose('invite','accept'),advance(),choose('meeting','leave'),advance(),advance({offered:[sceneIds.repair]}),choose('repair','repair',{flags:[flag('repaired')],resources:{energy:68,stress:21},relationships:{[priya]:{relationship:6}}})]},
    {id:uuid(64),title:'Pilot: renegotiate and keep the new time',mode:'rehearsal',initial,steps:[choose('invite','accept'),advance(),choose('meeting','renegotiate'),advance({forbidden:[sceneIds.missed]}),advance({offered:[sceneIds.later],forbidden:[sceneIds.repair]}),choose('later','keep_new_time',{flags:[flag('kept_new_time')],resources:{energy:67}})]},
    {id:uuid(65),title:'Pilot: choose the competing gathering',mode:'rehearsal',initial,steps:[choose('invite','accept'),advance({offered:[sceneIds.floor,sceneIds.meeting]}),choose('floor','stay_floor',{forbidden:[sceneIds.meeting]}),advance({offered:[sceneIds.missed]}),choose('missed','acknowledge'),advance(),choose('repair','repair',{flags:[flag('repaired'),flag('floor_chosen')],resources:{energy:65,stress:19}})]},
    {id:uuid(66),title:'Pilot: ignore the whole arc',mode:'rehearsal',initial,steps:[advance(),advance(),advance({forbidden:[sceneIds.meeting,sceneIds.repair,sceneIds.later],absent_flags:[flag('accepted'),flag('broken')],resources:{energy:70,stress:20}})]},
  ];
  return {storylets,tracks:[],plans,definitions,scenarios,consequences:[]};
}
