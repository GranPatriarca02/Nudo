import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * Instancia única de MMKV para toda la app. MMKV es síncrono y muy rápido,
 * ideal para hidratar el estado de Zustand sin esperas.
 */
export const storage = new MMKV({ id: 'nudo-storage' });

/**
 * Adaptador de MMKV con la forma que espera `zustand/middleware`'s
 * `createJSONStorage`. Solo trabaja con strings — la (de)serialización JSON
 * la hace `createJSONStorage` por nosotros.
 */
export const mmkvZustandStorage: StateStorage = {
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name, value) => {
    storage.set(name, value);
  },
  removeItem: (name) => {
    storage.delete(name);
  },
};

/**
 * Marca interna usada para serializar/deserializar objetos `Date` en JSON
 * sin perder el tipo. JSON.stringify convierte `Date` a string ISO por
 * defecto, pero al hacer JSON.parse el valor vuelve como string. Con esta
 * marca podemos detectar la fecha y reconstruirla.
 */
const DATE_TAG = '__nudo_date__';

export const dateReplacer = (_key: string, value: unknown): unknown => {
  if (value instanceof Date) {
    return { [DATE_TAG]: true, iso: value.toISOString() };
  }
  return value;
};

export const dateReviver = (_key: string, value: unknown): unknown => {
  if (
    value &&
    typeof value === 'object' &&
    (value as Record<string, unknown>)[DATE_TAG] === true &&
    typeof (value as { iso?: unknown }).iso === 'string'
  ) {
    return new Date((value as { iso: string }).iso);
  }
  return value;
};
