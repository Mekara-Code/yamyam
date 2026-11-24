"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDownLeft, Mail, Menu, Phone, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

const phone = "+989128452467";
const email = "commercial@yamyamgroup.com";

function HeaderLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <nav className="navigation" aria-label="ناوبری اصلی">
        <a href="#story" onClick={onNavigate}>داستان یام‌یام</a>
        <a href="#about" onClick={onNavigate}>دربارهٔ محصول <ArrowDownLeft size={15} aria-hidden="true" /></a>
      </nav>
      <address className="header-contact">
        <a href={`tel:${phone}`} onClick={onNavigate} aria-label={`شماره تماس یام‌یام، ${phone}`}>
          <Phone size={15} aria-hidden="true" />
          <bdi dir="ltr">{phone}</bdi>
        </a>
        <a href={`mailto:${email}`} onClick={onNavigate} aria-label={`ایمیل یام‌یام، ${email}`}>
          <Mail size={15} aria-hidden="true" />
          <bdi dir="ltr">{email}</bdi>
        </a>
      </address>
    </>
  );
}

export function SiteHeader() {
  const menuRef = useRef<HTMLDialogElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const lift = useTransform(scrollY, [0, 220], [0, -7]);
  const logoScale = useTransform(scrollY, [0, 220], [1, 0.9]);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 680px)");
    function closeOnDesktop(event: MediaQueryListEvent) {
      if (!event.matches) menuRef.current?.close();
    }
    mobile.addEventListener("change", closeOnDesktop);
    return () => mobile.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <motion.header className="site-header" style={{ y: reducedMotion ? 0 : lift }}>
      <div className="container header-row">
        <motion.a href="#home" className="brand-link" aria-label="یام‌یام، ابتدای صفحه"
          style={{ scale: reducedMotion ? 1 : logoScale }}>
          <Image className="brand-logo" src="/images/yamyam-logo.png" width={192} height={192} alt="" loading="eager" />
        </motion.a>
        <div className="header-desktop-links">
          <HeaderLinks />
        </div>
        <button
          type="button"
          className="header-menu-button"
          aria-label="باز کردن منو"
          aria-haspopup="dialog"
          aria-controls="header-menu"
          onClick={() => menuRef.current?.showModal()}
        >
          <Menu size={27} aria-hidden="true" />
        </button>
      </div>
      <dialog
        id="header-menu"
        className="header-drawer"
        ref={menuRef}
        aria-label="منوی یام‌یام"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="header-drawer-content">
          <button
            type="button"
            className="header-drawer-close"
            aria-label="بستن منو"
            onClick={() => menuRef.current?.close()}
          >
            <X size={26} aria-hidden="true" />
          </button>
          <HeaderLinks onNavigate={() => menuRef.current?.close()} />
        </div>
      </dialog>
    </motion.header>
  );
}
