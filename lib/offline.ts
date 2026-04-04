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
}

let dbPromise: Promise<IDBPDatabase<LSASchema>> | null = null

function getDB(): Promise<IDBPDatabase<LSASchema>> {
  if (!dbPromise) {
    dbPromise = openDB<LSASchema>('lsa_db', 1, {
      upgrade(db) {
        const cargasStore = db.createObjectStore('cargas_pending', { keyPath: 'id' })
        cargasStore.createIndex('by_timestamp', 'timestamp_local')

        const medicionesStore = db.createObjectStore('mediciones_pending', { keyPath: 'id' })
        medicionesStore.createIndex('by_timestamp', 'timestamp_local')
      },
    })
  }
  return dbPromise
}

export async function savePendingCarga(data: Omit<LSASchema['cargas_pending']['value'], 'id' | 'sync_pending' | 'timestamp_local'>): Promise<void> {
  const db = await getDB()
  const id = `carga_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  await db.put('cargas_pending', {
    ...data,
    id,
    sync_pending: true,
    timestamp_local: Date.now(),
  })
}

export async function savePendingMedicion(data: Omit<LSASchema['mediciones_pending']['value'], 'id' | 'sync_pending' | 'timestamp_local'>): Promise<void> {
  const db = await getDB()
  const id = `medicion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  await db.put('mediciones_pending', {
    ...data,
    id,
    sync_pending: true,
    timestamp_local: Date.now(),
  })
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  const [cargas, mediciones] = await Promise.all([
    db.countFromIndex('cargas_pending', 'by_timestamp'),
    db.countFromIndex('mediciones_pending', 'by_timestamp'),
  ])
  return cargas + mediciones
}

export async function syncPending(token: string): Promise<number> {
  const { apiCall } = await import('@/lib/api')
  const db = await getDB()
  let synced = 0

  // Sync cargas in chronological order
  const cargas = await db.getAllFromIndex('cargas_pending', 'by_timestamp')
  for (const carga of cargas) {
    if (!carga.sync_pending) continue
    try {
      let fotoUrl: string | undefined
      if (carga.foto_base64) {
        const fotoRes = await apiCall<{ url: string }>('subirFoto', {
          base64: carga.foto_base64,
          fecha: carga.fecha,
        }, token)
        if (fotoRes.success && fotoRes.data) fotoUrl = fotoRes.data.url
      }

      const res = await apiCall('saveCarga', {
        proveedor: carga.proveedor,
        litros_t1: carga.litros_t1,
        litros_t2: carga.litros_t2,
        foto_url: fotoUrl,
        fecha: carga.fecha,
        hora: carga.hora,
      }, token)

      if (res.success) {
        await db.delete('cargas_pending', carga.id)
        synced++
      }
    } catch (err) {
      console.error('[syncPending] carga error:', err)
    }
  }

  // Sync mediciones in chronological order
  const mediciones = await db.getAllFromIndex('mediciones_pending', 'by_timestamp')
  for (const med of mediciones) {
    if (!med.sync_pending) continue
    try {
      let fotoUrl: string | undefined
      if (med.foto_base64) {
        const fotoRes = await apiCall<{ url: string }>('subirFoto', {
          base64: med.foto_base64,
          fecha: med.fecha,
        }, token)
        if (fotoRes.success && fotoRes.data) fotoUrl = fotoRes.data.url
      }

      const res = await apiCall('saveMedicion', {
        litros_real_t1: med.litros_real_t1,
        litros_real_t2: med.litros_real_t2,
        foto_url: fotoUrl,
        fecha: med.fecha,
      }, token)

      if (res.success) {
        await db.delete('mediciones_pending', med.id)
        synced++
      }
    } catch (err) {
      console.error('[syncPending] medicion error:', err)
    }
  }

  return synced
}
