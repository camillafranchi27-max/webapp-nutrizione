import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import Dashboard from "@/components/dashboard";
export default async function HomePage({searchParams}:{searchParams:Promise<{edit?:string;tab?:string}>}){
 const params=await searchParams;const initialEditDate: string | null = /^\d{4}-\d{2}-\d{2}$/.test(params.edit ?? "") ? (params.edit ?? null) : null;const initialTab=params.tab==="dieta"?"dieta":"oggi";
 const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();if(!claimsData?.claims)redirect("/login");
 const {data:plans}=await supabase.from("nutrition_plans").select("id,name,current_version,created_at").order("created_at",{ascending:false}).limit(1);const plan=plans?.[0];
 if(!plan)return <main className="shell"><div className="card"><h2>Nessun piano trovato</h2></div></main>;
 const today=new Date().toISOString().slice(0,10);const {data:versions}=await supabase.from("plan_versions").select("id,version_number,valid_from,valid_to,notes,status,source_document_name,source_document_path").eq("plan_id",plan.id).neq("status","draft").lte("valid_from",today).or(`valid_to.is.null,valid_to.gte.${today}`).order("version_number",{ascending:false}).limit(1);const version=versions?.[0];if(!version)return null;
 const {data:draftVersions}=await supabase.from("plan_versions").select("id,version_number,valid_from,notes,status,source_document_name,source_document_path,created_at").eq("plan_id",plan.id).eq("status","draft").order("version_number",{ascending:false});
 const latestDraft=draftVersions?.[0]??null;
 const [{data:options},{data:weeklyMeals},{data:dailyLogs},{data:equivalenceGroups},{data:planChanges}]=await Promise.all([
  supabase.from("meal_options").select(`id,meal_type,option_number,option_name,pre_workout,notes,sort_order,option_foods(id,food_name,quantity,unit,optional,sort_order)`).eq("plan_version_id",version.id).eq("active",true).order("sort_order"),
  supabase.from("weekly_meals").select(`id,weekday,meal_type,notes,weekly_meal_foods(id,food_name,quantity,unit,optional,sort_order)`).eq("plan_version_id",version.id).order("weekday"),
  supabase.from("daily_logs").select(`id,plan_version_id,log_date,source_weekday,lunch_dinner_swapped,notes,water_2l,mindfulness,no_alcohol,extras,workouts(id,workout_type),meal_logs(id,meal_type,snack_timing,status,notes,source_meal_option_id,source_weekly_meal_id,created_at,meal_log_items(id,food_name,quantity,unit,is_extra,sort_order))`).order("log_date",{ascending:false}).limit(730),
  supabase.from("equivalence_groups").select(`id,name,description,equivalence_items(id,food_name,quantity,unit,sort_order)`).eq("plan_version_id",version.id).order("created_at"),
  supabase.from("plan_changes").select("id,changed_at,section,old_value,new_value").eq("plan_id",plan.id).order("changed_at",{ascending:false}).limit(30)
 ]);
 let draftOptions:any[]=[];let draftWeeklyMeals:any[]=[];let draftEquivalenceGroups:any[]=[];
 if(latestDraft){const [{data:do1},{data:dm1},{data:de1}]=await Promise.all([
  supabase.from("meal_options").select(`id,meal_type,option_number,option_name,pre_workout,notes,sort_order,option_foods(id,food_name,quantity,unit,optional,sort_order)`).eq("plan_version_id",latestDraft.id).eq("active",true).order("sort_order"),
  supabase.from("weekly_meals").select(`id,weekday,meal_type,notes,weekly_meal_foods(id,food_name,quantity,unit,optional,sort_order)`).eq("plan_version_id",latestDraft.id).order("weekday"),
  supabase.from("equivalence_groups").select(`id,name,description,equivalence_items(id,food_name,quantity,unit,sort_order)`).eq("plan_version_id",latestDraft.id).order("created_at")
 ]);draftOptions=do1??[];draftWeeklyMeals=dm1??[];draftEquivalenceGroups=de1??[]}
 return <Dashboard initialTab={initialTab} initialEditDate={initialEditDate} plan={plan} version={version} options={options??[]} weeklyMeals={weeklyMeals??[]} initialDailyLogs={dailyLogs??[]} equivalenceGroups={equivalenceGroups??[]} planChanges={planChanges??[]} draftVersions={draftVersions??[]} latestDraft={latestDraft} draftOptions={draftOptions} draftWeeklyMeals={draftWeeklyMeals} draftEquivalenceGroups={draftEquivalenceGroups}/>;
}
