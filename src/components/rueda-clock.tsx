"use client";

import { useEffect, useState } from "react";
import { horaCordoba } from "@/lib/format";

/** Reloj de la rueda en hora de Córdoba, actualiza cada segundo. */
export function RuedaClock() {
  const [t, setT] = useState("--:--:--");

  useEffect(() => {
    const upd = () => setT(horaCordoba(new Date(), true));
    upd();
    const id = setInterval(upd, 1000);
    return () => clearInterval(id);
  }, []);

  return <time suppressHydrationWarning>{t}</time>;
}
