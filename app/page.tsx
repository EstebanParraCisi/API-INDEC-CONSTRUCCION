import { cargarDatos } from "@/lib/data";
import { mesPorDefecto } from "@/lib/indicadores";
import { lineaFrescura } from "@/components/comunes";
import { Tablero } from "@/components/Tablero";

export default function Inicio() {
  const { series, status, nota } = cargarDatos();
  // Las series diarias solo hacen falta para la línea de frescura y el último dato del dólar.
  return <Tablero series={series} status={status} nota={nota} mesDefecto={mesPorDefecto(series)} frescura={lineaFrescura(series, status)} />;
}
