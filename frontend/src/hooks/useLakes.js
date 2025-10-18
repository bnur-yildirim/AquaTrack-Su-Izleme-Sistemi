/**
 * Göl verileri için custom hook
 * @deprecated Bu hook artık useApi.js içindeki useLakes hook'u ile değiştirildi
 */

import { useLakes as useLakesApi } from './useApi'

export function useLakes() {
  const { data, loading, error } = useLakesApi()
  return { 
    lakes: data?.lakes || {}, 
    loading, 
    error 
  }
}
