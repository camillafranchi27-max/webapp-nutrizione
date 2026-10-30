"use server";
import {revalidatePath} from "next/cache";
import {createClient} from "@/lib/supabase/server";

async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)throw new Error("Non autenticata");return {supabase,userId}}
async function ensureDay(supabase:any,userId:string,input:{date:string;planVersionId:string;sourceWeekday:number;swapped:boolean}){
 const {data,error}=await supabase.from("daily_logs").upsert({user_id:userId,log_date:input.date,plan_version_id:input.planVersionId,source_weekday:input.sourceWeekday,lunch_dinner_swapped:input.swapped},{onConflict:"user_id,log_date"}).select("id").single();
 if(error||!data)throw new Error(error?.message??"Errore diario");return data.id as string;
}
export async function saveDaySettings(input:{date:string;planVersionId:string;sourceWeekday:number;swapped:boolean}){const {supabase,userId}=await auth();await ensureDay(supabase,userId,input);revalidatePath("/")}
export async function saveWorkout(input:{date:string;planVersionId:string;sourceWeekday:number;swapped:boolean;labels:string[]}){
 const {supabase,userId}=await auth();const dailyLogId=await ensureDay(supabase,userId,input);await supabase.from("workouts").delete().eq("daily_log_id",dailyLogId);
 const map:Record<string,string>={Nessuno:"None",Yoga:"Yoga",Corsa:"Running",Trekking:"Trekking",Camminata:"Walking",Gym:"Gym"};
 const labels=input.labels.length?input.labels:["Nessuno"];const {error}=await supabase.from("workouts").insert(labels.map(label=>({user_id:userId,daily_log_id:dailyLogId,workout_type:map[label]??label})));if(error)throw new Error(error.message);revalidatePath("/")
}
export async function replaceMeal(input:{date:string;planVersionId:string;sourceWeekday:number;swapped:boolean;mealType:"breakfast"|"snack"|"lunch"|"dinner";snackTiming?:"mid_morning"|"mid_afternoon";sourceMealOptionId?:string;sourceWeeklyMealId?:string;status:"according_to_plan"|"modified"|"free";notes?:string;items:{food_name:string;quantity?:string|null;unit?:string|null;is_extra?:boolean}[]}){
 const {supabase,userId}=await auth();const dailyLogId=await ensureDay(supabase,userId,input);
 let q=supabase.from("meal_logs").select("id").eq("daily_log_id",dailyLogId).eq("meal_type",input.mealType);
 if(input.mealType==="snack")q=q.eq("snack_timing",input.snackTiming!);
 const {data:existing,error:findErr}=await q;if(findErr)throw new Error(findErr.message);
 if(existing?.length){const ids=existing.map((x:any)=>x.id);const {error}=await supabase.from("meal_logs").delete().in("id",ids);if(error)throw new Error(error.message)}
 const {data:meal,error:mealError}=await supabase.from("meal_logs").insert({user_id:userId,daily_log_id:dailyLogId,meal_type:input.mealType,snack_timing:input.mealType==="snack"?input.snackTiming:null,source_meal_option_id:input.sourceMealOptionId??null,source_weekly_meal_id:input.sourceWeeklyMealId??null,status:input.status,notes:input.notes??null}).select("id").single();
 if(mealError||!meal)throw new Error(mealError?.message??"Errore pasto");
 if(input.items.length){const {error}=await supabase.from("meal_log_items").insert(input.items.map((x,i)=>({user_id:userId,meal_log_id:meal.id,food_name:x.food_name,quantity:x.quantity??null,unit:x.unit??null,is_extra:!!x.is_extra,sort_order:i})));if(error)throw new Error(error.message)}
 revalidatePath("/")
}
export async function deleteMeal(mealLogId:string){const {supabase}=await auth();const {error}=await supabase.from("meal_logs").delete().eq("id",mealLogId);if(error)throw new Error(error.message);revalidatePath("/")}
export async function updatePlanFood(input:{table:"option_foods"|"weekly_meal_foods";id:string;foodName:string;quantity:string;planId:string;section:string;oldFoodName:string;oldQuantity:string}){
 const {supabase,userId}=await auth();const {error}=await supabase.from(input.table).update({food_name:input.foodName,quantity:input.quantity}).eq("id",input.id);if(error)throw new Error(error.message);
 await supabase.from("plan_changes").insert({user_id:userId,plan_id:input.planId,section:input.section,item_reference:input.id,old_value:{food_name:input.oldFoodName,quantity:input.oldQuantity},new_value:{food_name:input.foodName,quantity:input.quantity}});revalidatePath("/")
}
