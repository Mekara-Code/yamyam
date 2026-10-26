'use client';
import {useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {ArrowDownLeft,ShoppingBasket} from 'lucide-react';
import {useCart} from './cart-provider';
const StoreScene=dynamic(()=>import('./store-scene').then(module=>module.StoreScene),{ssr:false,loading:()=> <div className="shop-loading"><span className="loading-orbit"/><p>قفسه‌ها دارن آماده می‌شن…</p></div>});
export function ShopSection(){const ref=useRef<HTMLElement>(null);const[near,setNear]=useState(false);const{quantity,openCart}=useCart();useEffect(()=>{const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setNear(true);observer.disconnect()}},{rootMargin:'600px'});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect()},[]);
 return <section className="shop-section" id="shop" ref={ref} aria-labelledby="shop-title"><div className="container"><div className="shop-intro"><div><span className="eyebrow"><i/>حالا نوبت انتخاب توست</span><h2 id="shop-title">یک دور توی <em>فروشگاه</em> بزن.</h2></div><div className="shop-intro-copy"><p>دو قفسه، یک سبد، کلی انتخاب خوشمزه.<br/>حرکت کن و روی قوطی‌ها بزن؛ بقیه‌اش با یام‌یام.</p><ArrowDownLeft size={30} strokeWidth={1}/></div></div><div className="scene-mount">{near?<StoreScene/>:<div className="shop-loading"><span className="loading-orbit"/><p>فروشگاه یام‌یام</p></div>}</div><div className="shop-bottom"><span><i/>نمایش تعاملیِ محصول · قوطی ۸۰۰ گرمی</span><button onClick={openCart}>انتخاب‌هایت را ببین<ShoppingBasket size={18}/><strong>{quantity.toLocaleString('fa-IR')}</strong></button></div></div></section>
}
