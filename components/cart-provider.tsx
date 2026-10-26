'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {MotionConfig} from 'framer-motion';
import {Check,X} from 'lucide-react';
export const MAX_ITEMS=12;
type CartContextValue={quantity:number;ready:boolean;isOpen:boolean;addOne:()=>boolean;removeOne:()=>void;clear:()=>void;openCart:()=>void;closeCart:()=>void};
const CartContext=createContext<CartContextValue|null>(null);
export function CartProvider({children}:{children:React.ReactNode}){
 const[quantity,setQuantity]=useState(0);const current=useRef(0);const[ready,setReady]=useState(false);const[isOpen,setOpen]=useState(false);const[notice,setNotice]=useState<{text:string;id:number}|null>(null);
 useEffect(()=>{try{const data=JSON.parse(localStorage.getItem('yamyam-cart-v1')||'null');if(Number.isInteger(data?.quantity)&&data.quantity>=0&&data.quantity<=MAX_ITEMS){current.current=data.quantity;setQuantity(data.quantity)}}catch{}setReady(true)},[]);
 useEffect(()=>{if(ready)try{localStorage.setItem('yamyam-cart-v1',JSON.stringify({quantity}))}catch{}},[quantity,ready]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(null),3500);return()=>clearTimeout(t)},[notice]);
 const addOne=useCallback(()=>{if(current.current>=MAX_ITEMS){setNotice({text:'سبد جا برای ۱۲ قوطی دارد؛ می‌توانید انتخاب‌هایتان را در سبد تغییر دهید.',id:Date.now()});return false}current.current+=1;setQuantity(current.current);setNotice({text:'یام‌یام به سبدت اضافه شد.',id:Date.now()});return true},[]);
 const removeOne=useCallback(()=>{current.current=Math.max(0,current.current-1);setQuantity(current.current)},[]);
 const clear=useCallback(()=>{current.current=0;setQuantity(0)},[]);
 const openCart=useCallback(()=>setOpen(true),[]);const closeCart=useCallback(()=>setOpen(false),[]);
 return <MotionConfig reducedMotion="user"><CartContext.Provider value={{quantity,ready,isOpen,addOne,removeOne,clear,openCart,closeCart}}>{children}<div className="toast-region" aria-live="polite" aria-atomic="true">{notice&&<div className="toast" key={notice.id}><Check size={18}/><span>{notice.text}</span><button aria-label="بستن پیام" onClick={()=>setNotice(null)}><X size={16}/></button></div>}</div></CartContext.Provider></MotionConfig>;
}
export function useCart(){const cart=useContext(CartContext);if(!cart)throw new Error('CartProvider is missing');return cart}
