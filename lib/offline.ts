import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface LSASchema extends DBSchema {
  cargas_pending: {
    key: string
    value: {
      id: string
      fecha: string
      hora: string
      proveedor: string
      litros_t1: number
      litros_t2: number
      foto_base64?: string
      sync_pending: boolean
      timestamp_local: number
    }
    indexes: { by_timestamp: number }
  }
  mediciones_pending: {
    key: string
    value: {
      id: string
      fecha: string
      litros_real_t1: number
      litros_real_t2: number
      foto_base64?: string
      sync_pending: boolean
      timestamp_local: number
    }
    indexes: { by_timestamp: number }
  }
  envios_pending: {
    key: string
    value: {
      id: string
      compradorId: string
      compradorNombre: string
      litrosEnviados: number
      notas: string
      sync_pending: boolean
      timestamp_local: number
    }
    indexes: { by_timestamp: number }
  }
  gastos_pending: {
    key: string
    value: {
      id: string
      categoriaId: string
      categoriaNombre: string
      descripcion: string
      monto: number
      ivaIncluido: boolean
      foto_base64?: string
      sync_pending: boolean
      timestamp_local: number
    }
    indexes: { by_timestamp: number }
  }
  remanentes_pending: {
    key: string
    value: {
      id: string
      litrosT1: number
      litrosT2: number
      sync_pending: boolean
      timestamp_local: number
    }
    indexes: { by_timestamp: number }
  }
}

let dbPromise: Promise<IDBPDatabase<LSASchema>> | null = null

function getDB(): Promise<IDBPDatabase<LSASchema>> {
  if (!dbPromise) {
    dbPromise = openDB<LSASchema>('lsa_db', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const cargasStore = db.createObjectStore('cargas_pending', { keyPath: 'id' })
          cargasStore.createIndex('by_timestamp', 'timestamp_local')
          const medicionesStore = db.createObjectStore('mediciones_pending', { keyPath: 'id' })
          medicionesStore.createIndex('by_timestamp', 'timestamp_local')
        }
        if (oldVersion < 2) {
          const enviosStore = db.createObjectStore('envios_pending', { keyPath: 'id' })
          enviosStore.createIndex('by_timestamp', 'timestamp_local')
          const gastosStore = db.createObjectStore('gastos_pending', { keyPath: 'id' })
          gastosStore.createIndex('by_timestamp', 'timestamp_local')
          const remanentesStore = db.createObjectStore('remanentes_pending', { keyPath: 'id' })
          remanentesStore.createIndex('by_timestamp', 'timestamp_local')
        }
      },
    })
  }
  return dbPromise
}

export async function savePendingCarga(data: Omit<LSASchema['cargas_pending']['value'], 'id' | 'sync_pending' | 'timestamp_local'>): Promise<void> {
  const db = await getDB()
  const id = `carga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  await db.put('cargas_pending', { ...data, id, sync_pending: true, timestamp_local: Date.now() })
}

export async function savePendingMedicion(data: Omit<LSASchema['mediciones_pending']['value'], 'id' | 'sync_pending' | 'timestamp_local'>): Promise<void> {
  const db = await getDB()
  const id = `medicion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  await db.put('mediciones_pending', { ...data, id, sync_pending: true, timestamp_local: Date.now() })
}

export async function savePendingEnvio(data: Omit<LSASchema['envios_pending']['value'], 'id' | 'sync_pending' | 'timestamp_local'>): Promise<void> {
  const db = await getDB()
  const id = `envio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  await db.put('envios_pending', { ...data, id, sync_pending: true, timestamp_local: Date.now() })
}

export async function savePendingGasto(data: Omit<LSASchema['gastos_pending']['value'], 'id' | 'sync_pending' | 'timestamp_local'>): Promise<void> {
  const db = await getDB()
  const id = `gasto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  await db.put('gastos_pending', { ...data, id, sync_pending: true, timestamp_local: Date.now() })
}

export async function savePendingRemanente(data: Omit<LSASchema['remanentes_pending']['value'], 'id' | 'sync_pending' | 'timestamp_local'>): Promise<void> {
  const db = await getDB()
  const id = `remanente_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  await db.put('remanentes_pending', { ...data, id, sync_pending: true, timestamp_local: Date.now() })
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  const [cargas, mediciones, envios, gastos, remanentes] = await Promise.all([
    db.countFromIndex('cargas_pending', 'by_timestamp'),
    db.countFromIndex('mediciones_pending', 'by_timestamp'),
    db.countFromIndex('envios_pending', 'by_timestamp'),
    db.countFromIndex('gastos_pending', 'by_timestamp'),
    db.countFromIndex('remanentes_pending', 'by_timestamp'),
  ])
  return cargas + mediciones + envios + gastos + remanentes
}

export async function syncPending(token: string): Promise<number> {
  const { apiCall } = await import('@/lib/api')
  const db = await getDB()
  let synced = 0

  // Sync cargas
  const cargas = await db.getAllFromIndex('cargas_pending', 'by_timestamp')
  for (const carga of cargas) {
    if (!carga.sync_pending) continue
    try {
      let fotoUrl: string | undefined
      if (carga.foto_base64) {
        const fotoRes = await apiCall<{ url: string }>('subirFoto', { base64: carga.foto_base64, fecha: carga.fecha }, token)
        if (fotoRes.success && fotoRes.data) fotoUrl = fotoRes.data.url
      }
      const res = await apiCall('saveCarga', { proveedor: carga.proveedor, litros_t1: carga.litros_t1, litros_t2: carga.litros_t2, foto_url: fotoUrl, fecha: carga.fecha, hora: carga.hora }, token)
      if (res.success) { await db.delete('cargas_pending', carga.id); synced++ }
    } catch (err) { console.error('[syncPending] carga error:', err) }
  }

  // Sync mediciones
  const mediciones = await db.getAllFromIndex('mediciones_pending', 'by_timestamp')
  for (const med of mediciones) {
    if (!med.sync_pending) continue
    try {
      let fotoUrl: string | undefined
      if (med.foto_base64) {
        const fotoRes = await apiCall<{ url: string }>('subirFoto', { base64: med.foto_base64, fecha: med.fecha }, token)
        if (fotoRes.success && fotoRes.data) fotoUrl = fotoRes.data.url
      }
      const res = await apiCall('saveMedicion', { litros_real_t1: med.litros_real_t1, litros_real_t2: med.litros_real_t2, foto_url: fotoUrl, fecha: med.fecha }, token)
      if (res.success) { await db.delete('mediciones_pending', med.id); synced++ }
    } catch (err) { console.error('[syncPending] medicion error:', err) }
  }

  // Sync envios
  const envios = await db.getAllFromIndex('envios_pending', 'by_timestamp')
  for (const envio of envios) {
    if (!envio.sync_pending) continue
    try {
      const res = await apiCall('saveEnvio', { compradorId: envio.compradorId, compradorNombre: envio.compradorNombre, litrosEnviados: envio.litrosEnviados, notas: envio.notas }, token)
      if (res.success) { await db.delete('envios_pending', envio.id); synced++ }
    } catch (err) { console.error('[syncPending] envio error:', err) }
  }

  // Sync gastos
  const gastos = await db.getAllFromIndex('gastos_pending', 'by_timestamp')
  for (const gasto of gastos) {
    if (!gasto.sync_pending) continue
    try {
      let fotoUrl: string | undefined
      if (gasto.foto_base64) {
        const fotoRes = await apiCall<{ url: string }>('subirFoto', { base64: gasto.foto_base64 }, token)
        if (fotoRes.success && fotoRes.data) fotoUrl = fotoRes.data.url
      }
      const res = await apiCall('saveGasto', { categoriaId: gasto.categoriaId, categoriaNombre: gasto.categoriaNombre, descripcion: gasto.descripcion, monto: gasto.monto, ivaIncluido: gasto.ivaIncluido, comprobanteUrl: fotoUrl }, token)
      if (res.success) { await db.delete('gastos_pending', gasto.id); synced++ }
    } catch (err) { console.error('[syncPending] gasto error:', err) }
  }

  // Sync remanentes
  const remanentes = await db.getAllFromIndex('remanentes_pending', 'by_timestamp')
  for (const rem of remanentes) {
    if (!rem.sync_pending) continue
    try {
      const res = await apiCall('saveRemanente', { litrosT1: rem.litrosT1, litrosT2: rem.litrosT2 }, token)
      if (res.success) { await db.delete('remanentes_pending', rem.id); synced++ }
    } catch (err) { console.error('[syncPending] remanente error:', err) }
  }

  return synced
}
