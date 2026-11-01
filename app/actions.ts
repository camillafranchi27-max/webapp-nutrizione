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

export async function saveWellbeing(input:{date:string;planVersionId:string;sourceWeekday:number;swapped:boolean;water2l:boolean;mindfulness:string[]}){
 const {supabase,userId}=await auth();
 const dailyLogId=await ensureDay(supabase,userId,input);
 const allowed=new Set(["Respirazione","Meditazione","Journaling","Off Grid"]);
 const mindfulness=[...new Set(input.mindfulness.filter(x=>allowed.has(x)))];
 const {error}=await supabase.from("daily_logs").update({water_2l:input.water2l,mindfulness}).eq("id",dailyLogId);
 if(error)throw new Error(error.message);
 revalidatePath("/");
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


export async function createDraftPlanVersion(input:{planId:string;validFrom:string;sourceDocumentPath:string;sourceDocumentName:string;notes?:string}){
 const {supabase,userId}=await auth();
 const {data:source,error:sourceErr}=await supabase.from("plan_versions").select("id,version_number,notes").eq("plan_id",input.planId).eq("user_id",userId).neq("status","draft").lte("valid_from",new Date().toISOString().slice(0,10)).order("version_number",{ascending:false}).limit(1).single();
 if(sourceErr||!source)throw new Error(sourceErr?.message??"Piano attivo non trovato");
 const nextVersion=(source.version_number??0)+1;
 const {data:newVersion,error:vErr}=await supabase.from("plan_versions").insert({user_id:userId,plan_id:input.planId,version_number:nextVersion,valid_from:input.validFrom,status:"draft",notes:input.notes??source.notes??null,source_document_path:input.sourceDocumentPath,source_document_name:input.sourceDocumentName}).select("id,version_number,valid_from,status,source_document_name").single();
 if(vErr||!newVersion)throw new Error(vErr?.message??"Impossibile creare la nuova versione");

 const {data:opts,error:oErr}=await supabase.from("meal_options").select("id,meal_type,option_number,option_name,pre_workout,active,notes,sort_order").eq("plan_version_id",source.id).order("sort_order");
 if(oErr)throw new Error(oErr.message);
 for(const o of opts??[]){
   const {data:no,error:noErr}=await supabase.from("meal_options").insert({user_id:userId,plan_version_id:newVersion.id,meal_type:o.meal_type,option_number:o.option_number,option_name:o.option_name,pre_workout:o.pre_workout,active:o.active,notes:o.notes,sort_order:o.sort_order}).select("id").single();
   if(noErr||!no)throw new Error(noErr?.message??"Errore copia opzioni");
   const {data:foods,error:fErr}=await supabase.from("option_foods").select("food_name,quantity,unit,optional,sort_order").eq("meal_option_id",o.id).order("sort_order");
   if(fErr)throw new Error(fErr.message);
   if(foods?.length){const {error}=await supabase.from("option_foods").insert(foods.map(f=>({user_id:userId,meal_option_id:no.id,...f})));if(error)throw new Error(error.message)}
 }

 const {data:meals,error:mErr}=await supabase.from("weekly_meals").select("id,weekday,meal_type,notes").eq("plan_version_id",source.id).order("weekday");
 if(mErr)throw new Error(mErr.message);
 for(const m of meals??[]){
   const {data:nm,error:nmErr}=await supabase.from("weekly_meals").insert({user_id:userId,plan_version_id:newVersion.id,weekday:m.weekday,meal_type:m.meal_type,notes:m.notes}).select("id").single();
   if(nmErr||!nm)throw new Error(nmErr?.message??"Errore copia pasti");
   const {data:foods,error:fErr}=await supabase.from("weekly_meal_foods").select("food_name,quantity,unit,optional,sort_order").eq("weekly_meal_id",m.id).order("sort_order");
   if(fErr)throw new Error(fErr.message);
   if(foods?.length){const {error}=await supabase.from("weekly_meal_foods").insert(foods.map(f=>({user_id:userId,weekly_meal_id:nm.id,...f})));if(error)throw new Error(error.message)}
 }

 const {data:groups,error:gErr}=await supabase.from("equivalence_groups").select("id,name,description").eq("plan_version_id",source.id).order("created_at");
 if(gErr)throw new Error(gErr.message);
 for(const g of groups??[]){
   const {data:ng,error:ngErr}=await supabase.from("equivalence_groups").insert({user_id:userId,plan_version_id:newVersion.id,name:g.name,description:g.description}).select("id").single();
   if(ngErr||!ng)throw new Error(ngErr?.message??"Errore copia equivalenze");
   const {data:items,error:iErr}=await supabase.from("equivalence_items").select("food_name,quantity,unit,sort_order").eq("equivalence_group_id",g.id).order("sort_order");
   if(iErr)throw new Error(iErr.message);
   if(items?.length){const {error}=await supabase.from("equivalence_items").insert(items.map(i=>({user_id:userId,equivalence_group_id:ng.id,...i})));if(error)throw new Error(error.message)}
 }
 revalidatePath("/");
 return newVersion;
}

export async function activatePlanVersion(input:{planId:string;versionId:string}){
 const {supabase,userId}=await auth();
 const {data:next,error:nErr}=await supabase.from("plan_versions").select("id,version_number,valid_from,status").eq("id",input.versionId).eq("plan_id",input.planId).eq("user_id",userId).single();
 if(nErr||!next)throw new Error(nErr?.message??"Versione non trovata");
 if(next.status!=="draft")throw new Error("Solo una bozza può essere attivata");
 const start=new Date(next.valid_from+"T12:00:00"); start.setDate(start.getDate()-1); const prevEnd=start.toISOString().slice(0,10);
 const {error:aErr}=await supabase.from("plan_versions").update({status:"archived",valid_to:prevEnd}).eq("plan_id",input.planId).eq("user_id",userId).neq("status","draft").lt("valid_from",next.valid_from).is("valid_to",null);if(aErr)throw new Error(aErr.message);
 const today=new Date().toISOString().slice(0,10);const nextStatus=next.valid_from>today?"scheduled":"active";
 const {error:nvErr}=await supabase.from("plan_versions").update({status:nextStatus,valid_to:null}).eq("id",input.versionId).eq("user_id",userId);if(nvErr)throw new Error(nvErr.message);
 const {error:pErr}=await supabase.from("nutrition_plans").update({current_version:next.version_number}).eq("id",input.planId).eq("user_id",userId);if(pErr)throw new Error(pErr.message);
 revalidatePath("/");
}

export async function deleteDraftPlanVersion(input:{versionId:string}){
 const {supabase,userId}=await auth();
 const {data:v,error:vErr}=await supabase.from("plan_versions").select("source_document_path,status").eq("id",input.versionId).eq("user_id",userId).single();
 if(vErr||!v)throw new Error(vErr?.message??"Bozza non trovata");
 if(v.status!=="draft")throw new Error("Solo una bozza può essere eliminata");
 if(v.source_document_path)await supabase.storage.from("nutrition-documents").remove([v.source_document_path]);
 const {error}=await supabase.from("plan_versions").delete().eq("id",input.versionId).eq("user_id",userId);if(error)throw new Error(error.message);
 revalidatePath("/");
}
