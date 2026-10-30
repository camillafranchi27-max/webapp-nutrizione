import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Il mio piano",description:"Diario nutrizionale personale"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="it"><body>{children}</body></html>}
