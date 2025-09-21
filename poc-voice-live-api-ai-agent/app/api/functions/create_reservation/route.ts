import { NextResponse } from 'next/server'
import { getCosmosClient } from '../../../../lib/cosmosClient'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { locationId, startDate, endDate, customerName, vehicleType, vehicleId, customerContact } = body
    if (!locationId || !startDate || !endDate || !customerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cosmos = getCosmosClient()
    if (cosmos) {
      const dbName = process.env.COSMOS_DB || 'rentacar-db'
      const containerName = process.env.COSMOS_RESERVATIONS_CONTAINER || 'reservations'
      const { database } = await cosmos.databases.createIfNotExists({ id: dbName })
      const { container } = await database.containers.createIfNotExists({ id: containerName })

      const id = `r-${Date.now().toString(36)}`
      const item = {
        id,
        locationId,
        startDate,
        endDate,
        customerName,
        customerContact: customerContact || null,
        vehicleType: vehicleType || null,
        vehicleId: vehicleId || null,
        status: 'reserved',
        createdAt: new Date().toISOString()
      }

      await container.items.create(item)
      return NextResponse.json({ success: true, reservation: item })
    }

    // Fallback to in-memory store if Cosmos not configured
    let globalAny: any
    try { globalAny = globalThis as any } catch (_) { globalAny = {} }
    if (!globalAny.__rentacar_reservations) globalAny.__rentacar_reservations = []
    if (!globalAny.__rentacar_nextId) globalAny.__rentacar_nextId = 1
    const id = `r-${String(globalAny.__rentacar_nextId++).padStart(4, '0')}`
    const res = {
      id,
      locationId,
      startDate,
      endDate,
      customerName,
      customerContact: customerContact || null,
      vehicleType: vehicleType || null,
      vehicleId: vehicleId || null,
      status: 'reserved',
      createdAt: new Date().toISOString()
    }
    globalAny.__rentacar_reservations.push(res)
    return NextResponse.json({ success: true, reservation: res })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
