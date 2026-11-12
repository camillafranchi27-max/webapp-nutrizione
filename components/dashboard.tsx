"use client";
import {useMemo,useState,useTransition} from "react";
import {createClient} from "@/lib/supabase/client";
import {activatePlanVersion,createDraftPlanVersion,deleteDraftPlanVersion,deleteMeal,replaceMeal,saveDaySettings,saveWorkout,saveWellbeing,saveHabits,updatePlanFood} from "@/app/actions";

type Food={id?:string;food_name:string;quantity?:string|null;unit?:string|null;optional?:boolean;sort_order?:number;is_extra?:boolean};
type Option={id:string;meal_type:"breakfast"|"snack";option_number:number;option_name:string|null;pre_workout:boolean;notes?:string|null;sort_order:number;option_foods:Food[]};
type WeeklyMeal={id:string;weekday:number;meal_type:"lunch"|"dinner";notes?:string|null;weekly_meal_foods:Food[]};
type MealLog={id:string;meal_type:string;snack_timing?:string|null;status:string;notes?:string|null;source_meal_option_id?:string|null;source_weekly_meal_id?:string|null;created_at?:string;meal_log_items:Food[]};
type DailyLog={id:string;plan_version_id?:string;log_date:string;source_weekday:number;lunch_dinner_swapped:boolean;notes?:string|null;water_2l?:boolean;mindfulness?:string[];no_alcohol?:boolean;extras?:string[];workouts:any[];meal_logs:MealLog[]};

const dayNames=["","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
const workoutLabels=["Nessuno","Yoga","Corsa","Trekking","Camminata","Gym","Zona 2","Zona 5"];
const workoutDbToLabel:Record<string,string>={None:"Nessuno",Yoga:"Yoga",Running:"Corsa",Trekking:"Trekking",Walking:"Camminata",Gym:"Gym",Zone2:"Zona 2",Zone5:"Zona 5"};
const mindfulnessOptions=["Respirazione","Meditazione","Journaling","Off Grid"];
const slots=[
 {key:"breakfast",label:"Colazione",icon:"☕"},
 {key:"mid_morning",label:"Spuntino metà mattina",icon:"🍎"},
 {key:"lunch",label:"Pranzo",icon:"🍽️"},
 {key:"mid_afternoon",label:"Spuntino metà pomeriggio",icon:"🥝"},
 {key:"dinner",label:"Cena",icon:"🌙"},
] as const;
type SlotKey=typeof slots[number]["key"];

function todayISO(){const d=new Date();const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)}
function jsWeekdayToPlan(d=new Date()){const js=d.getDay();return js===0?7:js}
function sortFoods<T extends Food>(foods:T[]){return [...(foods??[])].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0))}
function statusLabel(status?:string){if(status==="according_to_plan")return "Secondo il piano";if(status==="modified")return "Modificato";if(status==="free")return "Libero";return "Non registrato"}
function statusClass(status?:string){if(status==="according_to_plan")return "plan";if(status==="modified")return "modified";if(status==="free")return "free";return ""}
function slotMeal(log:DailyLog|undefined,key:SlotKey){if(!log)return undefined;const meals=[...(log.meal_logs??[])].sort((a,b)=>(b.created_at??"").localeCompare(a.created_at??""));if(key==="mid_morning")return meals.find(m=>m.meal_type==="snack"&&m.snack_timing==="mid_morning");if(key==="mid_afternoon")return meals.find(m=>m.meal_type==="snack"&&m.snack_timing==="mid_afternoon");return meals.find(m=>m.meal_type===key)}
function slotKeyForMeal(m:MealLog):SlotKey|null{if(m.meal_type==="breakfast"||m.meal_type==="lunch"||m.meal_type==="dinner")return m.meal_type as SlotKey;if(m.meal_type==="snack"&&m.snack_timing==="mid_morning")return "mid_morning";if(m.meal_type==="snack"&&m.snack_timing==="mid_afternoon")return "mid_afternoon";return null}

export default function Dashboard({initialTab,initialEditDate,plan,version,options,weeklyMeals,initialDailyLogs,equivalenceGroups,planChanges,draftVersions,latestDraft,draftOptions,draftWeeklyMeals,draftEquivalenceGroups}:{initialTab:"dieta"|"oggi";initialEditDate:string|null;plan:any;version:any;options:Option[];weeklyMeals:WeeklyMeal[];initialDailyLogs:DailyLog[];equivalenceGroups:any[];planChanges:any[];draftVersions:any[];latestDraft:any;draftOptions:Option[];draftWeeklyMeals:WeeklyMeal[];draftEquivalenceGroups:any[]}){
 const [tab,setTab]=useState<"oggi"|"calendario"|"dieta"|"statistiche">(initialTab);
 const [pending,startTransition]=useTransition();
 const [chooser,setChooser]=useState<SlotKey|null>(null);const [freeText,setFreeText]=useState("");const [modifiedText,setModifiedText]=useState("");const [modifiedOptionId,setModifiedOptionId]=useState("");const [actionError,setActionError]=useState("");
 const [selectedDay,setSelectedDay]=useState<DailyLog|null>(null);const [editPlan,setEditPlan]=useState(false);
 const [editingDate,setEditingDate]=useState<string|null>(initialEditDate);
 const date=editingDate??todayISO();const todayLog=initialDailyLogs.find(d=>d.log_date===date);
 const [sourceWeekday,setSourceWeekday]=useState<number>(todayLog?.source_weekday??jsWeekdayToPlan(new Date(date+"T12:00:00")));const [swapped,setSwapped]=useState<boolean>(todayLog?.lunch_dinner_swapped??false);
 const initialWorkouts=(todayLog?.workouts??[]).map((w:any)=>workoutDbToLabel[w.workout_type]??w.workout_type);const [workouts,setWorkouts]=useState<string[]>(initialWorkouts);const [water2l,setWater2l]=useState<boolean>(!!todayLog?.water_2l);const [mindfulness,setMindfulness]=useState<string[]>(todayLog?.mindfulness??[]);
 const [extras,setExtras]=useState<string[]>(todayLog?.extras??[]);
 const [extraText,setExtraText]=useState("");
 const [noAlcohol,setNoAlcohol]=useState(!!todayLog?.no_alcohol);
 const breakfastOptions=options.filter(o=>o.meal_type==="breakfast");const snackOptions=options.filter(o=>o.meal_type==="snack");
 const lunchBase=weeklyMeals.find(m=>m.weekday===sourceWeekday&&m.meal_type==="lunch");const dinnerBase=weeklyMeals.find(m=>m.weekday===sourceWeekday&&m.meal_type==="dinner");const lunch=swapped?dinnerBase:lunchBase;const dinner=swapped?lunchBase:dinnerBase;
 const completed=slots.filter(s=>!!slotMeal(todayLog,s.key)).length;
 function saveSettings(nextWeekday=sourceWeekday,nextSwapped=swapped,previousWeekday=sourceWeekday,previousSwapped=swapped){
 setActionError("");
 startTransition(async()=>{
  const result=await saveDaySettings({date,planVersionId:version.id,sourceWeekday:nextWeekday,swapped:nextSwapped});
  if(!result.ok){setSourceWeekday(previousWeekday);setSwapped(previousSwapped);setActionError(`Impossibile salvare il piano del giorno: ${result.error}`);return}
  window.location.reload();
 })
}
 function toggleWorkout(label:string){let next:string[];if(label==="Nessuno")next=["Nessuno"];else{const base=workouts.filter(x=>x!=="Nessuno");next=base.includes(label)?base.filter(x=>x!==label):[...base,label]}setWorkouts(next);startTransition(async()=>{await saveWorkout({date,planVersionId:version.id,sourceWeekday,swapped,labels:next});window.location.reload()})}
 function persistWellbeing(nextWater=water2l,nextMindfulness=mindfulness){startTransition(async()=>{try{await saveWellbeing({date,planVersionId:version.id,sourceWeekday,swapped,water2l:nextWater,mindfulness:nextMindfulness});window.location.reload()}catch(e:any){setActionError(e?.message||"Impossibile salvare il benessere.")}})}
 function toggleMindfulness(label:string){const next=mindfulness.includes(label)?mindfulness.filter(x=>x!==label):[...mindfulness,label];setMindfulness(next);persistWellbeing(water2l,next)}

 function startEditingDay(log:DailyLog){window.location.href=`/?edit=${encodeURIComponent(log.log_date)}`}
 function finishEditingDay(){window.location.href="/"}
 function persistHabits(nextExtras=extras,nextNoAlcohol=noAlcohol){setActionError("");startTransition(async()=>{const r=await saveHabits({date,planVersionId:todayLog?.plan_version_id??version.id,sourceWeekday,swapped,extras:nextExtras,noAlcohol:nextNoAlcohol});if(!r.ok){setActionError(r.error);return}window.location.href=`/${editingDate?`?edit=${encodeURIComponent(editingDate)}`:""}`})}
 function addExtra(){const text=extraText.trim();if(!text){setActionError("Scrivi prima cosa hai mangiato.");return}const next=[...extras,text];setExtras(next);setExtraText("");persistHabits(next,noAlcohol)}
 function removeExtra(index:number){const next=extras.filter((_,i)=>i!==index);setExtras(next);persistHabits(next,noAlcohol)}
 function plannedMeal(key:SlotKey){if(key==="lunch")return lunch;if(key==="dinner")return dinner;return undefined}
 async function chooseOption(slot:SlotKey,o:Option){const result=await replaceMeal({date,planVersionId:version.id,sourceWeekday,swapped,mealType:slot.startsWith("mid_")?"snack":"breakfast",snackTiming:slot.startsWith("mid_")?slot as any:undefined,sourceMealOptionId:o.id,status:"according_to_plan",items:sortFoods(o.option_foods).map(f=>({food_name:f.food_name,quantity:f.quantity,unit:f.unit}))});if(!result.ok)throw new Error(result.error);window.location.reload()}
 async function choosePlanned(slot:"lunch"|"dinner"){const meal=plannedMeal(slot);if(!meal)return;const result=await replaceMeal({date,planVersionId:version.id,sourceWeekday,swapped,mealType:slot,sourceWeeklyMealId:meal.id,status:"according_to_plan",items:sortFoods(meal.weekly_meal_foods).map(f=>({food_name:f.food_name,quantity:f.quantity,unit:f.unit}))});if(!result.ok)throw new Error(result.error);window.location.reload()}
 async function chooseFree(slot:SlotKey){const label=slots.find(s=>s.key===slot)!.label;const result=await replaceMeal({date,planVersionId:version.id,sourceWeekday,swapped,mealType:slot.startsWith("mid_")?"snack":slot as any,snackTiming:slot.startsWith("mid_")?slot as any:undefined,status:"free",notes:freeText.trim()||undefined,items:[{food_name:freeText.trim()||`${label} libero`,is_extra:true}]});if(!result.ok)throw new Error(result.error);window.location.reload()}
 async function chooseModified(slot:SlotKey){
  const isBreakfast=slot==="breakfast",isSnack=slot.startsWith("mid_");
  const meal=plannedMeal(slot);
  let baseItems:Food[]=[];let sourceMealOptionId:string|undefined;let sourceWeeklyMealId:string|undefined;
  if(isBreakfast||isSnack){
   const sourceOptions=isBreakfast?breakfastOptions:snackOptions;
   const selected=sourceOptions.find(o=>o.id===modifiedOptionId);
   if(!selected)throw new Error("Scegli prima l'opzione del piano che hai modificato.");
   baseItems=sortFoods(selected.option_foods);sourceMealOptionId=selected.id;
  }else{
   if(!meal)throw new Error("Pasto previsto non trovato.");
   baseItems=sortFoods(meal.weekly_meal_foods);sourceWeeklyMealId=meal.id;
  }
  if(!modifiedText.trim())throw new Error("Scrivi una breve nota sulla modifica effettuata.");
  const result=await replaceMeal({date,planVersionId:version.id,sourceWeekday,swapped,mealType:isSnack?"snack":slot as any,snackTiming:isSnack?slot as any:undefined,sourceMealOptionId,sourceWeeklyMealId,status:"modified",notes:modifiedText.trim(),items:baseItems.map(f=>({food_name:f.food_name,quantity:f.quantity,unit:f.unit,is_extra:false}))});if(!result.ok)throw new Error(result.error);window.location.reload()
 }
 async function logout(){const supabase=createClient();await supabase.auth.signOut();window.location.href="/login"}
 function safely(action:()=>Promise<void>){setActionError("");startTransition(async()=>{try{await action()}catch(e:any){setActionError(e?.message||"Impossibile salvare. Riprova.")}})}
 return <>
  <main className="shell">
   <div className="topbar"><div className="topbar-inner"><div><div className="brand">ASTARTE</div><div className="muted small">{new Date(date+"T12:00:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"})}</div></div><button className="btn btn-outline btn-xs" onClick={logout}>Esci</button></div></div>
   {actionError&&<div className="error-banner">{actionError}</div>}
   {tab==="oggi"&&<>
    <section className="hero"><div className="eyebrow" style={{color:"#eef4ea"}}>{editingDate?"MODIFICA GIORNATA":"OGGI"}</div><h1>{completed===5?"Giornata registrata ✓":"La tua giornata"}</h1><div className="hero-sub">{editingDate?new Date(editingDate+"T12:00:00").toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"})+" · ":""}{completed} di 5 pasti registrati</div>{editingDate&&<button className="btn btn-soft btn-xs" style={{marginTop:12}} onClick={finishEditingDay}>← Torna a oggi</button>}<div className="progress"><span style={{width:`${completed/5*100}%`}}/></div><div className="progress-label"><span>Diario</span><span>{completed}/5</span></div></section>
    <div className="card"><div className="between"><div><div className="muted small">Piano pranzo/cena</div><strong>{dayNames[sourceWeekday]}{swapped?" · invertito":""}</strong></div></div><div className="row" style={{marginTop:10}}><select value={sourceWeekday} onChange={e=>{const n=Number(e.target.value);const prev=sourceWeekday;setSourceWeekday(n);saveSettings(n,swapped,prev,swapped)}} disabled={pending}>{dayNames.slice(1).map((n,i)=><option key={n} value={i+1}>{n}</option>)}</select><button className="btn btn-soft" onClick={()=>{const prev=swapped;const n=!swapped;setSwapped(n);saveSettings(sourceWeekday,n,sourceWeekday,prev)}} disabled={pending}>{swapped?"Ripristina":"Inverti pranzo/cena"}</button></div></div>
    <div className="section-title">Pasti</div>
    {slots.map(s=><TodayMealCard key={s.key} slot={s} log={slotMeal(todayLog,s.key)} planned={plannedMeal(s.key)} onChoose={()=>{setFreeText("");setModifiedText("");setModifiedOptionId("");setActionError("");setChooser(s.key)}} onDelete={(id)=>startTransition(async()=>{await deleteMeal(id);window.location.reload()})}/>) }
    <div className="section-title">🍰 Extra</div>
    <div className="card"><div className="meal-title">Extra della giornata</div><p className="muted small">Es. tiramisù, dolce, aperitivo. Puoi registrare un extra senza sostituire uno dei 5 pasti. Un extra interrompe lo streak verde.</p><div className="row" style={{marginTop:10}}><input value={extraText} onChange={e=>setExtraText(e.target.value)} placeholder="Es. Tiramisù" maxLength={400}/><button className="btn btn-primary btn-xs" disabled={pending||!extraText.trim()} onClick={addExtra}>Aggiungi</button></div>{extras.map((x,i)=><div className="food" key={`${i}-${x}`}><span>{x}</span><button className="btn btn-danger btn-xs" disabled={pending} onClick={()=>removeExtra(i)}>Rimuovi</button></div>)}</div>
    <div className="section-title">Allenamento</div><div className="card"><div className="muted small">Puoi selezionare più attività</div><div className="workouts">{workoutLabels.map(label=><button key={label} disabled={pending} className={`workout ${workouts.includes(label)?"active":""}`} onClick={()=>toggleWorkout(label)}>{label}</button>)}</div></div>
    <div className="section-title">Acqua</div>
    <div className={`card wellbeing-card ${water2l?"wellbeing-done":""}`}><button className={`habit-toggle ${water2l?"active":""}`} disabled={pending} onClick={()=>{const next=!water2l;setWater2l(next);persistWellbeing(next,mindfulness)}}><span className="habit-check">{water2l?"✓":""}</span><span><strong>Almeno 2 L</strong><span className="muted small habit-sub">Flagga quando hai raggiunto l’obiettivo della giornata</span></span></button></div>
    <div className="section-title">🍷 No alcohol</div>
    <div className="card"><button className={`habit-toggle ${noAlcohol?"active":""}`} disabled={pending} onClick={()=>{const next=!noAlcohol;setNoAlcohol(next);persistHabits(extras,next)}}><span className="habit-check">{noAlcohol?"✓":""}</span><span><strong>No alcohol</strong><span className="muted small habit-sub">Conferma che oggi non hai bevuto alcol</span></span></button></div>
    <div className="section-title">Mindfulness</div>
    <div className="card"><div className="muted small">Seleziona tutte le pratiche svolte oggi</div><div className="mindfulness-grid">{mindfulnessOptions.map(label=><button key={label} disabled={pending} className={`mindfulness-chip ${mindfulness.includes(label)?"active":""}`} onClick={()=>toggleMindfulness(label)}>{mindfulness.includes(label)?"✓ ":""}{label}</button>)}</div></div>
   </>}
   {tab==="calendario"&&<CalendarView logs={initialDailyLogs} selected={selectedDay} setSelected={setSelectedDay} onEdit={startEditingDay}/>} 
   {tab==="dieta"&&<><DietView plan={plan} version={version} breakfastOptions={breakfastOptions} snackOptions={snackOptions} weeklyMeals={weeklyMeals} equivalenceGroups={equivalenceGroups} planChanges={planChanges} editPlan={editPlan} setEditPlan={setEditPlan} pending={pending} startTransition={startTransition} draftVersions={draftVersions} latestDraft={latestDraft} draftOptions={draftOptions} draftWeeklyMeals={draftWeeklyMeals} draftEquivalenceGroups={draftEquivalenceGroups}/></>} 
   {tab==="statistiche"&&<StatsView logs={initialDailyLogs}/>} 
  </main>
  <nav className="tabs">{[["oggi","⌂","Oggi"],["calendario","▦","Calendario"],["dieta","☰","Dieta"],["statistiche","⌁","Statistiche"]].map(([key,ico,label])=><button key={key} className={`tab ${tab===key?"active":""}`} onClick={()=>{setTab(key as any);setSelectedDay(null)}}><span className="tab-icon">{ico}</span>{label}</button>)}</nav>
  {chooser&&<ChooserModal slot={chooser} breakfastOptions={breakfastOptions} snackOptions={snackOptions} planned={plannedMeal(chooser)} freeText={freeText} setFreeText={setFreeText} modifiedText={modifiedText} setModifiedText={setModifiedText} modifiedOptionId={modifiedOptionId} setModifiedOptionId={setModifiedOptionId} error={actionError} pending={pending} close={()=>{setChooser(null);setActionError("")}} onOption={(o)=>safely(()=>chooseOption(chooser,o))} onPlanned={()=>safely(()=>choosePlanned(chooser as any))} onFree={()=>safely(()=>chooseFree(chooser))} onModified={()=>safely(()=>chooseModified(chooser))}/>} 
 </>
}

function TodayMealCard({slot,log,planned,onChoose,onDelete}:{slot:any;log?:MealLog;planned?:WeeklyMeal;onChoose:()=>void;onDelete:(id:string)=>void}){
 const items=log?sortFoods(log.meal_log_items):planned?sortFoods(planned.weekly_meal_foods):[];return <div className={`card meal-card ${log?"recorded":""} ${statusClass(log?.status)}`}><div className="meal-head"><div className="meal-title"><span className="meal-icon">{slot.icon}</span>{slot.label}</div><span className={`status ${statusClass(log?.status)}`}>{statusLabel(log?.status)}</span></div><div className="meal-body">{items.length?items.map((f,i)=><FoodRow key={i} food={f}/>):<div className="muted small">Nessuna scelta registrata.</div>}{log?.notes&&<div className="meal-note"><div>{log.notes}</div><div className="note-registered">* nota registrata</div></div>}</div><div className="actions"><button className="btn btn-primary btn-xs" onClick={onChoose}>{log?"Cambia scelta":"Scegli / registra"}</button>{log&&<button className="btn btn-danger btn-xs" onClick={()=>onDelete(log.id)}>Elimina</button>}</div></div>
}
function FoodRow({food}:{food:Food}){return <div className="food"><span>{food.food_name}</span><span className="qty">{food.quantity}{food.unit?` ${food.unit}`:""}</span></div>}
function ChooserModal({slot,breakfastOptions,snackOptions,planned,freeText,setFreeText,modifiedText,setModifiedText,modifiedOptionId,setModifiedOptionId,error,pending,close,onOption,onPlanned,onFree,onModified}:{slot:SlotKey;breakfastOptions:Option[];snackOptions:Option[];planned?:WeeklyMeal;freeText:string;setFreeText:(s:string)=>void;modifiedText:string;setModifiedText:(s:string)=>void;modifiedOptionId:string;setModifiedOptionId:(s:string)=>void;error:string;pending:boolean;close:()=>void;onOption:(o:Option)=>void;onPlanned:()=>void;onFree:()=>void;onModified:()=>void}){
 const isBreakfast=slot==="breakfast",isSnack=slot.startsWith("mid_");const label=slots.find(s=>s.key===slot)!.label;const opts=isBreakfast?breakfastOptions:snackOptions;const selectedModified=opts.find(o=>o.id===modifiedOptionId);
 return <div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)close()}}><div className="modal"><div className="between"><div><div className="eyebrow">REGISTRA</div><div className="modal-title">{label}</div></div><button className="btn btn-outline btn-xs" onClick={close}>Chiudi</button></div>
  {error&&<div className="error-banner" style={{marginTop:12}}>{error}</div>}
  {(isBreakfast||isSnack)&&opts.map(o=><div className="option" key={o.id}><div className="between"><div className="option-name">{o.option_name??`Opzione ${o.option_number}`}</div>{o.pre_workout&&<span className="pill">pre-workout</span>}</div>{sortFoods(o.option_foods).map((f,i)=><FoodRow key={i} food={f}/>)}<button className="btn btn-primary btn-xs" style={{marginTop:10}} disabled={pending} onClick={()=>onOption(o)}>Scegli questa opzione</button></div>)}
  {(!isBreakfast&&!isSnack)&&planned&&<div className="option"><div className="option-name">Pasto previsto dal piano</div>{sortFoods(planned.weekly_meal_foods).map((f,i)=><FoodRow key={i} food={f}/>)}<button className="btn btn-primary btn-xs" style={{marginTop:10}} disabled={pending} onClick={onPlanned}>Ho mangiato questo</button></div>}
  <div className="divider"/>
  <div className="option"><div className="option-name">{label} modificato</div><div className="muted small">Parti sempre da una delle opzioni del piano e registra sotto cosa hai cambiato.</div>
   {(isBreakfast||isSnack)?<><label className="field-label">Opzione di partenza</label><select value={modifiedOptionId} onChange={e=>setModifiedOptionId(e.target.value)}><option value="">Seleziona un'opzione</option>{opts.map(o=><option key={o.id} value={o.id}>{o.option_name??`Opzione ${o.option_number}`}</option>)}</select>{selectedModified&&<div className="modified-preview">{sortFoods(selectedModified.option_foods).map((f,i)=><FoodRow key={i} food={f}/>)}</div>}</>:planned&&<div className="modified-preview">{sortFoods(planned.weekly_meal_foods).map((f,i)=><FoodRow key={i} food={f}/>)}</div>}
   <div className="field"><textarea value={modifiedText} onChange={e=>setModifiedText(e.target.value)} placeholder="Es. ho usato 100 g invece di 80 g; resto invariato"/></div><button className="btn btn-soft btn-xs" disabled={pending} onClick={onModified}>Registra come modificato</button>
  </div>
  <div className="option"><div className="option-name">{label} libero</div><div className="muted small">Per quando non segui una delle opzioni del piano.</div><div className="field"><textarea value={freeText} onChange={e=>setFreeText(e.target.value)} placeholder="Facoltativo: cosa hai mangiato?"/></div><button className="btn btn-outline btn-xs" disabled={pending} onClick={onFree}>Registra come libero</button></div>
 </div></div>
}
function CalendarView({logs,selected,setSelected,onEdit}:{logs:DailyLog[];selected:DailyLog|null;setSelected:(d:DailyLog|null)=>void;onEdit:(d:DailyLog)=>void}){
 const now=new Date();const [monthCursor,setMonthCursor]=useState(new Date(now.getFullYear(),now.getMonth(),1));
 if(selected)return <><div className="detail-header"><button className="back" onClick={()=>setSelected(null)}>←</button><div><div className="section-title" style={{margin:0}}>{new Date(selected.log_date+"T12:00:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div><div className="muted small">Piano: {dayNames[selected.source_weekday]}{selected.lunch_dinner_swapped?" · pranzo/cena invertiti":""}</div></div></div><button className="btn btn-primary" style={{marginBottom:12}} onClick={()=>onEdit(selected)}>✎ Modifica questa giornata</button>{slots.map(s=><CalendarMeal key={s.key} slot={s} meal={slotMeal(selected,s.key)}/>)}<div className="card"><div className="meal-title">🏃 Allenamento</div><div style={{marginTop:8}}>{(selected.workouts??[]).filter((w:any)=>w.workout_type!=="None").length?(selected.workouts??[]).filter((w:any)=>w.workout_type!=="None").map((w:any)=><span className="pill" key={w.id}>{workoutDbToLabel[w.workout_type]??w.workout_type}</span>):<span className="muted small">Nessuno registrato</span>}</div></div><div className="card"><div className="meal-title">💧 Acqua</div><div style={{marginTop:8}}>{selected.water_2l?<span className="status plan">≥ 2 L ✓</span>:<span className="muted small">Obiettivo non flaggato</span>}</div></div><div className="card"><div className="meal-title">🍰 Extra</div>{(selected.extras??[]).length?(selected.extras??[]).map((x,i)=><div className="food" key={i}>{x}</div>):<span className="muted small">Nessuno</span>}</div><div className="card"><div className="meal-title">🍷 No alcohol</div><div className="muted small">{selected.no_alcohol?"✓ Giorno dry confermato":"Non confermato"}</div></div><div className="card"><div className="meal-title">◌ Mindfulness</div><div style={{marginTop:8}}>{(selected.mindfulness??[]).length?(selected.mindfulness??[]).map(x=><span className="pill" key={x}>{x}</span>):<span className="muted small">Nessuna pratica registrata</span>}</div></div></>;

 const y=monthCursor.getFullYear(),m=monthCursor.getMonth();const first=new Date(y,m,1);const daysInMonth=new Date(y,m+1,0).getDate();const offset=(first.getDay()+6)%7;const logByDate=new Map(logs.map(x=>[x.log_date,x]));const today=todayISO();
 const cells:Array<{date:string;day:number;log?:DailyLog}|null>=Array(offset).fill(null);
 for(let day=1;day<=daysInMonth;day++){const iso=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;cells.push({date:iso,day,log:logByDate.get(iso)})}
 while(cells.length%7!==0)cells.push(null);
 const monthLogs=logs.filter(x=>{const dd=new Date(x.log_date+"T12:00:00");return dd.getFullYear()===y&&dd.getMonth()===m});
 const greenDays=monthLogs.filter(x=>dayColor(x)==="green").length;
 const trainingDays=monthLogs.filter(x=>(x.workouts??[]).some((w:any)=>w.workout_type!=="None")).length;
 const waterDays=monthLogs.filter(x=>x.water_2l).length;
 return <><div className="calendar-month-head"><button className="month-nav" onClick={()=>setMonthCursor(new Date(y,m-1,1))}>‹</button><div><div className="section-title" style={{margin:0,textTransform:"capitalize"}}>{monthCursor.toLocaleDateString("it-IT",{month:"long",year:"numeric"})}</div><div className="muted small">{greenDays} giornate verdi 5/5 · {trainingDays} allenamenti · {waterDays} giorni acqua ✓</div></div><button className="month-nav" onClick={()=>setMonthCursor(new Date(y,m+1,1))}>›</button></div><div className="calendar-weekdays">{["L","M","M","G","V","S","D"].map((x,i)=><div key={i}>{x}</div>)}</div><div className="calendar-grid">{cells.map((cell,i)=>{if(!cell)return <div className="calendar-cell empty-cell" key={`e${i}`}/>;const log=cell.log;const color=dayColor(log);const green=color==="green";const yellow=color==="yellow";const current=cell.date===today;const synthetic:DailyLog=log??{id:"",log_date:cell.date,source_weekday:jsWeekdayToPlan(new Date(cell.date+"T12:00:00")),lunch_dinner_swapped:false,notes:null,water_2l:false,mindfulness:[],no_alcohol:false,extras:[],workouts:[],meal_logs:[]};return <button key={cell.date} className={`calendar-cell ${green?"perfect":yellow?"free-day":"incomplete-day"} ${current?"today":""}`} onClick={()=>setSelected(synthetic)}><span className="day-number">{cell.day}</span>{green&&<span className="day-check">✓</span>}{yellow&&<span className="day-dot"/>}</button>})}</div><div className="calendar-legend"><span><i className="legend-swatch perfect"/>5/5 piano o modificati</span><span><i className="legend-swatch free-day"/>5/5 con pasti liberi</span><span><i className="legend-swatch incomplete-day"/>Pasti mancanti</span><span><i className="legend-swatch today"/>Oggi</span></div></>
}
function CalendarMeal({slot,meal}:{slot:any;meal?:MealLog}){return <div className="detail-meal"><div className="between"><div className="meal-title"><span>{slot.icon}</span>{slot.label}</div><span className={`status ${statusClass(meal?.status)}`}>{statusLabel(meal?.status)}</span></div>{meal?<div style={{marginTop:7}}>{sortFoods(meal.meal_log_items).map((f,i)=><FoodRow key={i} food={f}/>)}{meal.notes&&<div className="meal-note"><div>{meal.notes}</div><div className="note-registered">* nota registrata</div></div>}</div>:<div className="muted small" style={{marginTop:7}}>Non registrato</div>}</div>}
// Identica regola utilizzata nel Calendario: grigio prevale sul giallo.
type DayColor="green"|"yellow"|"gray";
function dayColor(log?:DailyLog):DayColor{
 if(!log)return "gray";
 const meals=slots.map(slot=>slotMeal(log,slot.key));
 if(meals.some(meal=>!meal))return "gray";
 if(meals.some(meal=>meal?.status==="free")||(log.extras??[]).length>0)return "yellow";
 return meals.every(meal=>meal?.status==="according_to_plan"||meal?.status==="modified")?"green":"gray";
}
function dateKey(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function currentWeekRange(){const now=new Date();const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());monday.setDate(monday.getDate()-(monday.getDay()+6)%7);const sunday=new Date(monday);sunday.setDate(sunday.getDate()+6);return {start:dateKey(monday),end:dateKey(sunday),today:dateKey(now),label:`${monday.toLocaleDateString("it-IT",{day:"numeric",month:"short"})} – ${sunday.toLocaleDateString("it-IT",{day:"numeric",month:"short"})}`}}
function greenStreak(logs:DailyLog[],today:string){
 // Un giorno giallo interrompe la serie; grigio/non registrato non la modifica.
 let count=0;
 for(const log of [...logs].filter(d=>d.log_date<=today).sort((a,b)=>a.log_date.localeCompare(b.log_date))){
  const state=dayColor(log);
  if(state==="yellow"||(log.extras??[]).length>0)count=0;
  if(state==="green")count++;
 }
 return count;
}
function dryStreak(logs:DailyLog[],today:string){
 const byDate=new Map(logs.map(d=>[d.log_date,d]));let cursor=new Date(today+"T12:00:00");
 if(!byDate.get(today)?.no_alcohol)cursor.setDate(cursor.getDate()-1);
 let count=0;
 while(count<730){const key=dateKey(cursor);if(!byDate.get(key)?.no_alcohol)break;count++;cursor.setDate(cursor.getDate()-1)}
 return count;
}
const dailyMotivations=[
 "Un piccolo passo ogni giorno costruisce grandi cambiamenti.",
 "La costanza è fatta di gesti semplici, non di giornate perfette.",
 "Prenderti cura di te è già un ottimo punto di partenza.",
 "I progressi si costruiscono, un giorno alla volta.",
 "Ascolta il tuo ritmo. Anche questo è progresso.",
 "La direzione conta più della velocità.",
 "Oggi hai un'altra occasione per fare qualcosa di buono per te.",
 "Il benessere cresce con le piccole abitudini.",
 "Riconosci ciò che hai fatto, non solo ciò che manca.",
 "La cura di sé non ha bisogno di perfezione.",
 "Continua a scegliere ciò che ti fa stare bene.",
 "La tua energia merita attenzione, ogni giorno.",
 "Un passo sostenibile vale più di uno sprint impossibile.",
 "Il percorso è fatto anche di pause e ripartenze.",
];
function motivationOfDay(day:string){const epochDay=Math.floor(new Date(`${day}T12:00:00Z`).getTime()/86400000);return dailyMotivations[epochDay%dailyMotivations.length]}
function StatsView({logs}:{logs:DailyLog[]}){
 const week=currentWeekRange();
 const weekLogs=logs.filter(d=>d.log_date>=week.start&&d.log_date<=week.today);
 const trainingDays=weekLogs.filter(d=>(d.workouts??[]).some((w:any)=>w.workout_type!=="None")).length;
 const greenWeek=weekLogs.filter(d=>dayColor(d)==="green").length;
 const mindfulnessDays=weekLogs.filter(d=>(d.mindfulness??[]).length>0).length;
 const waterDays=weekLogs.filter(d=>d.water_2l).length;
 const streak=greenStreak(logs,week.today);const dry=dryStreak(logs,week.today);
 const loggedMeals=logs.flatMap(d=>slots.map(slot=>slotMeal(d,slot.key)).filter(Boolean) as MealLog[]);
 const planOrModified=loggedMeals.filter(m=>m.status==="according_to_plan"||m.status==="modified").length;
 const freeMeals=loggedMeals.filter(m=>m.status==="free").length;
 const adherence=loggedMeals.length?Math.round(planOrModified/loggedMeals.length*100):0;
 const workoutCounts:Record<string,number>={};
 logs.forEach(d=>(d.workouts??[]).forEach((w:any)=>{const label=workoutDbToLabel[w.workout_type]??w.workout_type;if(label!=="Nessuno")workoutCounts[label]=(workoutCounts[label]??0)+1}));
 const mindfulnessCounts:Record<string,number>={};
 logs.forEach(d=>(d.mindfulness??[]).forEach(label=>{mindfulnessCounts[label]=(mindfulnessCounts[label]??0)+1}));
 return <>
  <div className="section-title">Questa settimana</div>
  <div className="muted small stats-period">{week.label} · da lunedì a oggi</div>
  <div className="kpis">
   <div className="card kpi"><strong>{trainingDays}</strong><span className="muted small">giorni con allenamento</span></div>
   <div className="card kpi"><strong>{greenWeek}</strong><span className="muted small">giornate verdi 5/5</span></div>
   <div className="card kpi"><strong>{mindfulnessDays}</strong><span className="muted small">giorni mindfulness</span></div>
   <div className="card kpi"><strong>{waterDays}</strong><span className="muted small">giorni acqua ≥ 2 L</span></div>
  </div>
  <div className="card streak-card"><div className="between"><div><div className="eyebrow">STREAK VERDE</div><div className="streak-number">{streak} <span>{streak===1?"giorno verde":"giorni verdi"}</span></div></div><span className="streak-icon" aria-hidden="true">🌱</span></div><p className="muted small">Ogni giornata verde aumenta lo streak. Un giorno giallo o un extra lo azzera; una giornata grigia senza extra lo lascia invariato.</p></div>
  <div className="card streak-card"><div className="between"><div><div className="eyebrow">STREAK NO ALCOHOL</div><div className="streak-number">{dry} <span>{dry===1?"giorno dry":"giorni dry"}</span></div></div><span className="streak-icon" aria-hidden="true">💧</span></div><p className="muted small">Giorni consecutivi con “No alcohol” confermato. Il giorno corrente può ancora essere compilato; un giorno precedente non confermato interrompe la serie.</p></div><div className="section-title">Andamento complessivo</div>
  <div className="card"><div className="between"><div className="meal-title">Aderenza ai pasti registrati</div><strong>{adherence}%</strong></div><Bar label="Secondo il piano o modificati" value={planOrModified} total={loggedMeals.length}/><Bar label="Pasti liberi" value={freeMeals} total={loggedMeals.length} cls="free"/><p className="muted small">I pasti non registrati non riducono questa percentuale, ma impediscono alla giornata di diventare verde.</p></div>
  <div className="card"><div className="meal-title">Mindfulness · totale</div>{Object.entries(mindfulnessCounts).length?Object.entries(mindfulnessCounts).map(([label,count])=><div className="food" key={label}><span>{label}</span><span>{count}</span></div>):<div className="empty">Nessuna pratica registrata.</div>}</div>
  <div className="card"><div className="meal-title">Allenamenti · totale</div>{Object.entries(workoutCounts).length?Object.entries(workoutCounts).map(([label,count])=><div className="food" key={label}><span>{label}</span><span>{count}</span></div>):<div className="empty">Nessun allenamento registrato.</div>}</div>
  <div className="motivation-card"><div className="eyebrow">IL PENSIERO DI OGGI</div><p>“{motivationOfDay(week.today)}”</p><span className="muted small">1% better, everyday</span></div>
 </>
}
function Bar({label,value,total,cls=""}:{label:string;value:number;total:number;cls?:string}){const pct=total?Math.round(value/total*100):0;return <div className="bar-row"><div className="bar-label"><span>{label}</span><strong>{value} · {pct}%</strong></div><div className={`bar ${cls}`}><span style={{width:`${pct}%`}}/></div></div>}
function DietView({plan,version,breakfastOptions,snackOptions,weeklyMeals,equivalenceGroups,planChanges,editPlan,setEditPlan,pending,startTransition,draftVersions,latestDraft,draftOptions,draftWeeklyMeals,draftEquivalenceGroups}:{plan:any;version:any;breakfastOptions:Option[];snackOptions:Option[];weeklyMeals:WeeklyMeal[];equivalenceGroups:any[];planChanges:any[];editPlan:boolean;setEditPlan:(b:boolean)=>void;pending:boolean;startTransition:any;draftVersions:any[];latestDraft:any;draftOptions:Option[];draftWeeklyMeals:WeeklyMeal[];draftEquivalenceGroups:any[]}){
 const [reviewDraft,setReviewDraft]=useState(false);
 return <><div className="between"><div className="section-title">Dieta</div><button className="btn btn-soft btn-xs" onClick={()=>setEditPlan(!editPlan)}>{editPlan?"Fine modifica":"Modifica piano"}</button></div><NewDietUploader planId={plan.id} currentVersion={version.version_number} pending={pending} startTransition={startTransition}/>{latestDraft&&<div className="card draft-card"><div className="between"><div><div className="meal-title">Nuova dieta in bozza · v{latestDraft.version_number}</div><div className="muted small">Valida dal {latestDraft.valid_from}{latestDraft.source_document_name?` · ${latestDraft.source_document_name}`:""}</div></div><span className="status modified">Bozza</span></div><div className="row" style={{marginTop:12}}><button className="btn btn-soft btn-xs" onClick={()=>setReviewDraft(!reviewDraft)}>{reviewDraft?"Chiudi revisione":"Rivedi bozza"}</button><button className="btn btn-primary btn-xs" disabled={pending} onClick={()=>startTransition(async()=>{if(!confirm("Attivare questa nuova dieta? La dieta attuale verrà archiviata."))return;await activatePlanVersion({planId:plan.id,versionId:latestDraft.id});window.location.reload()})}>Attiva nuova dieta</button><button className="btn btn-danger btn-xs" disabled={pending} onClick={()=>startTransition(async()=>{if(!confirm("Eliminare la bozza e il PDF caricato?"))return;await deleteDraftPlanVersion({versionId:latestDraft.id});window.location.reload()})}>Elimina bozza</button></div></div>}{reviewDraft&&latestDraft&&<DraftReview plan={plan} draft={latestDraft} options={draftOptions} weeklyMeals={draftWeeklyMeals} equivalenceGroups={draftEquivalenceGroups} pending={pending} startTransition={startTransition}/>}<div className="card"><div className="meal-title">{plan.name}</div><div className="muted small">Versione {version.version_number} · valida dal {version.valid_from}</div></div><div className="section-title">Colazioni</div>{breakfastOptions.map(o=><PlanOption key={o.id} option={o} edit={editPlan} table="option_foods" planId={plan.id} section={`Colazione ${o.option_name}`} pending={pending} startTransition={startTransition}/>)}<div className="section-title">Spuntini</div>{snackOptions.map(o=><PlanOption key={o.id} option={o} edit={editPlan} table="option_foods" planId={plan.id} section={`Spuntino ${o.option_name}`} pending={pending} startTransition={startTransition}/>)}<div className="section-title">Pranzo e cena</div>{dayNames.slice(1).map((day,i)=>{const wd=i+1;const l=weeklyMeals.find(m=>m.weekday===wd&&m.meal_type==="lunch");const d=weeklyMeals.find(m=>m.weekday===wd&&m.meal_type==="dinner");return <div className="card plan-day" key={day}><div className="meal-title">{day}</div><div style={{marginTop:10}}><strong>Pranzo</strong>{l&&<PlanFoods foods={l.weekly_meal_foods} edit={editPlan} table="weekly_meal_foods" planId={plan.id} section={`${day} pranzo`} pending={pending} startTransition={startTransition}/>}</div><div className="divider"/><div><strong>Cena</strong>{d&&<PlanFoods foods={d.weekly_meal_foods} edit={editPlan} table="weekly_meal_foods" planId={plan.id} section={`${day} cena`} pending={pending} startTransition={startTransition}/>}</div></div>})}<div className="section-title">Equivalenze</div>{equivalenceGroups.map((g:any)=><details className="card" key={g.id}><summary>{g.name}</summary><div style={{marginTop:9}}>{sortFoods(g.equivalence_items??[]).map((f,i)=><FoodRow key={i} food={f}/>)}</div></details>)}<div className="section-title">Storico modifiche</div><div className="card">{planChanges.length?planChanges.map((c:any)=><div key={c.id} style={{marginBottom:10}}><strong className="small">{c.section}</strong><div className="muted small">{new Date(c.changed_at).toLocaleString("it-IT")}</div><div className="small">{c.old_value?.food_name} {c.old_value?.quantity} → {c.new_value?.food_name} {c.new_value?.quantity}</div></div>):<div className="empty">Nessuna modifica manuale.</div>}</div></>
}

function NewDietUploader({planId,currentVersion,pending,startTransition}:{planId:string;currentVersion:number;pending:boolean;startTransition:any}){
 const [file,setFile]=useState<File|null>(null);const [validFrom,setValidFrom]=useState(todayISO());const [notes,setNotes]=useState("");const [error,setError]=useState("");const [uploading,setUploading]=useState(false);
 async function upload(){if(!file){setError("Seleziona un PDF.");return}if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf")){setError("Il file deve essere un PDF.");return}setUploading(true);setError("");try{const supabase=createClient();const {data:userData,error:uErr}=await supabase.auth.getUser();if(uErr||!userData.user)throw new Error("Sessione non valida");const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,"-");const path=`${userData.user.id}/${Date.now()}-${safe}`;const {error:upErr}=await supabase.storage.from("nutrition-documents").upload(path,file,{contentType:"application/pdf",upsert:false});if(upErr)throw upErr;startTransition(async()=>{try{const result=await createDraftPlanVersion({planId,validFrom,sourceDocumentPath:path,sourceDocumentName:file.name,notes:notes||undefined});if(!result.ok){await supabase.storage.from("nutrition-documents").remove([path]);setError(result.error);setUploading(false);return}window.location.reload()}catch(e:any){await supabase.storage.from("nutrition-documents").remove([path]);setError(e?.message||"Impossibile creare la bozza");setUploading(false)}})}catch(e:any){setError(e?.message||"Caricamento non riuscito");setUploading(false)}}
 return <div className="card new-diet-card"><div className="between"><div><div className="meal-title">+ Carica nuova dieta</div><div className="muted small">Il PDF viene salvato come bozza. La dieta attuale resta attiva finché non confermi.</div></div><span className="pill">circa ogni 6 settimane</span></div><div className="new-diet-grid"><label className="upload-field"><span>PDF del nutrizionista</span><input type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><label><span>Data di inizio</span><input type="date" value={validFrom} onChange={e=>setValidFrom(e.target.value)}/></label></div><label className="upload-field"><span>Nota facoltativa</span><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder={`Es. controllo dopo versione ${currentVersion}`}/></label>{file&&<div className="file-selected">📄 {file.name}</div>}{error&&<div className="action-error">{error}</div>}<button className="btn btn-primary" disabled={pending||uploading} onClick={upload}>{uploading?"Caricamento…":"Carica e crea bozza"}</button><div className="muted small" style={{marginTop:8}}>ASTARTE duplica l’ultima dieta come base: nella revisione modifichi solo ciò che il nutrizionista ha cambiato. Il PDF resta privato.</div></div>
}
function DraftReview({plan,draft,options,weeklyMeals,equivalenceGroups,pending,startTransition}:{plan:any;draft:any;options:Option[];weeklyMeals:WeeklyMeal[];equivalenceGroups:any[];pending:boolean;startTransition:any}){const breakfasts=options.filter(o=>o.meal_type==="breakfast");const snacks=options.filter(o=>o.meal_type==="snack");return <div className="draft-review"><div className="section-title">Revisione nuova dieta</div><div className="notice">Confronta questa bozza con il PDF appena ricevuto e modifica gli alimenti/quantità cambiati. Quando è corretta, usa “Attiva nuova dieta”.</div><div className="section-title">Colazioni</div>{breakfasts.map(o=><PlanOption key={o.id} option={o} edit={true} table="option_foods" planId={plan.id} section={`Bozza v${draft.version_number} · Colazione ${o.option_name}`} pending={pending} startTransition={startTransition}/>)}<div className="section-title">Spuntini</div>{snacks.map(o=><PlanOption key={o.id} option={o} edit={true} table="option_foods" planId={plan.id} section={`Bozza v${draft.version_number} · Spuntino ${o.option_name}`} pending={pending} startTransition={startTransition}/>)}<div className="section-title">Pranzo e cena</div>{dayNames.slice(1).map((day,i)=>{const wd=i+1;const l=weeklyMeals.find(m=>m.weekday===wd&&m.meal_type==="lunch");const dn=weeklyMeals.find(m=>m.weekday===wd&&m.meal_type==="dinner");return <div className="card plan-day" key={day}><div className="meal-title">{day}</div><div style={{marginTop:10}}><strong>Pranzo</strong>{l&&<PlanFoods foods={l.weekly_meal_foods} edit={true} table="weekly_meal_foods" planId={plan.id} section={`Bozza v${draft.version_number} · ${day} pranzo`} pending={pending} startTransition={startTransition}/>}</div><div className="divider"/><div><strong>Cena</strong>{dn&&<PlanFoods foods={dn.weekly_meal_foods} edit={true} table="weekly_meal_foods" planId={plan.id} section={`Bozza v${draft.version_number} · ${day} cena`} pending={pending} startTransition={startTransition}/>}</div></div>})}<div className="section-title">Equivalenze</div>{equivalenceGroups.map((g:any)=><details className="card" key={g.id}><summary>{g.name}</summary><div style={{marginTop:9}}>{sortFoods(g.equivalence_items??[]).map((f,i)=><FoodRow key={i} food={f}/>)}</div></details>)}</div>}
function PlanOption({option,edit,table,planId,section,pending,startTransition}:{option:Option;edit:boolean;table:"option_foods"|"weekly_meal_foods";planId:string;section:string;pending:boolean;startTransition:any}){return <div className="card"><div className="between"><div className="meal-title">{option.option_name}</div>{option.pre_workout&&<span className="pill">pre-workout</span>}</div><PlanFoods foods={option.option_foods} edit={edit} table={table} planId={planId} section={section} pending={pending} startTransition={startTransition}/></div>}
function PlanFoods({foods,edit,table,planId,section,pending,startTransition}:{foods:Food[];edit:boolean;table:"option_foods"|"weekly_meal_foods";planId:string;section:string;pending:boolean;startTransition:any}){return <div style={{marginTop:8}}>{sortFoods(foods).map((f,i)=>edit?<EditableFood key={f.id??i} food={f} table={table} planId={planId} section={section} pending={pending} startTransition={startTransition}/>:<FoodRow key={f.id??i} food={f}/>)}</div>}
function EditableFood({food,table,planId,section,pending,startTransition}:{food:Food;table:"option_foods"|"weekly_meal_foods";planId:string;section:string;pending:boolean;startTransition:any}){const [name,setName]=useState(food.food_name);const [qty,setQty]=useState(food.quantity??"");return <div><div className="plan-edit"><input value={name} onChange={e=>setName(e.target.value)}/><input value={qty} onChange={e=>setQty(e.target.value)}/></div><button className="btn btn-soft btn-xs" disabled={pending||!food.id} onClick={()=>startTransition(async()=>{await updatePlanFood({table,id:food.id!,foodName:name,quantity:qty,planId,section,oldFoodName:food.food_name,oldQuantity:food.quantity??""});window.location.reload()})}>Salva modifica</button></div>}
