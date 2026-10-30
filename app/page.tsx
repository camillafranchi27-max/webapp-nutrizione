import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import Dashboard from "@/components/dashboard";
export default async function HomePage(){
 const supabase=await createClient();const {data:claimsData}=await supabase.auth.getClaims();if(!claimsData?.claims)redirect("/login");
 const {data:plans}=await supabase.from("nutrition_plans").select("id,name,current_version,created_at").order("created_at",{ascending:false}).limit(1);const plan=plans?.[0];
 if(!plan)return <main className="shell"><div className="card"><h2>Nessun piano trovato</h2></div></main>;
 const {data:versions}=await supabase.from("plan_versions").select("id,version_number,valid_from,notes").eq("plan_id",plan.id).order("version_number",{ascending:false}).limit(1);const version=versions?.[0];if(!version)return null;
 const [{data:options},{data:weeklyMeals},{data:dailyLogs},{data:equivalenceGroups},{data:planChanges}]=await Promise.all([
  supabase.from("meal_options").select(`id,meal_type,option_number,option_name,pre_workout,notes,sort_order,option_foods(id,food_name,quantity,unit,optional,sort_order)`).eq("plan_version_id",version.id).eq("active",true).order("sort_order"),
  supabase.from("weekly_meals").select(`id,weekday,meal_type,notes,weekly_meal_foods(id,food_name,quantity,unit,optional,sort_order)`).eq("plan_version_id",version.id).order("weekday"),
  supabase.from("daily_logs").select(`id,log_date,source_weekday,lunch_dinner_swapped,notes,workouts(id,workout_type),meal_logs(id,meal_type,snack_timing,status,notes,source_meal_option_id,source_weekly_meal_id,created_at,meal_log_items(id,food_name,quantity,unit,is_extra,sort_order))`).order("log_date",{ascending:false}).limit(180),
  supabase.from("equivalence_groups").select(`id,name,description,equivalence_items(id,food_name,quantity,unit,sort_order)`).eq("plan_version_id",version.id).order("created_at"),
  supabase.from("plan_changes").select("id,changed_at,section,old_value,new_value").eq("plan_id",plan.id).order("changed_at",{ascending:false}).limit(30)
 ]);
 return <Dashboard plan={plan} version={version} options={options??[]} weeklyMeals={weeklyMeals??[]} initialDailyLogs={dailyLogs??[]} equivalenceGroups={equivalenceGroups??[]} planChanges={planChanges??[]}/>;
}
