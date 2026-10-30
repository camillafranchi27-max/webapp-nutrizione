"use client";
import {FormEvent,useState} from "react";
import {createClient} from "@/lib/supabase/client";
export default function LoginPage(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(false);
 async function login(e:FormEvent){e.preventDefault();setLoading(true);setMessage("");const supabase=createClient();const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setMessage(error.message);setLoading(false);return}window.location.href="/"}
 return <main className="login-wrap"><form className="login-card" onSubmit={login}><div className="eyebrow">WEBAPP PERSONALE</div><h1>Il mio piano</h1><p className="muted">Il tuo piano, il tuo diario, senza giudizi.</p><div className="field"><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></div><div className="field"><label>Password</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></div><button className="btn btn-primary btn-block" disabled={loading}>{loading?"Accesso...":"Accedi"}</button>{message&&<div className="error">{message}</div>}</form></main>
}
