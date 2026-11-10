import type { Metadata } from "next";
import { cargarDatos } from "@/lib/data";
import { mesPorDefecto } from "@/lib/indicadores";
import { lineaFrescura } from "@/components/comunes";
import { Informe } from "@/components/Informe";
import "./informe.css";

export const metadata: Metadata = { title: "Informe mensual — Observatorio de la Construcción 2026" };

export default function PaginaInforme() {
  const { series, status, nota } = cargarDatos();
  return <Informe series={series} status={status} nota={nota} mesDefecto={mesPorDefecto(series)} frescura={lineaFrescura(series, status)} />;
}
