import type {Metadata} from 'next';
import '@fontsource-variable/vazirmatn';
import './globals.css';
import {CartProvider} from '@/components/cart-provider';
import {SiteHeader,Wordmark} from '@/components/site-header';
import {CartDrawer} from '@/components/cart-drawer';
export const metadata:Metadata={title:'yamyam | یک طعم، کلی قصه',description:'قصهٔ طعم یام‌یام را دنبال کن و در فروشگاه سه‌بعدی، قوطی دلخواهت را به سبد بفرست.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl" data-scroll-behavior="smooth"><body><CartProvider><a className="skip-link" href="#main-content">رفتن به محتوای اصلی</a><SiteHeader/><main id="main-content" tabIndex={-1}>{children}</main><footer className="site-footer"><div className="container footer-row"><a href="#home" aria-label="یام‌یام، ابتدای صفحه"><Wordmark/></a><p>برای لحظه‌هایی که دورِ یک سفره‌ایم.</p><a href="#home">برگردیم به شروع ↑</a><span>YAM YAM · 2026</span></div></footer><CartDrawer/></CartProvider></body></html>}
