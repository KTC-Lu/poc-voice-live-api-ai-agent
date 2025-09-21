import { NextResponse } from 'next/server'
import { getCosmosClient } from '../../../../lib/cosmosClient'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { locationId, startDate, endDate, vehicleType } = body
    if (!locationId || !startDate || !endDate) {
      return NextResponse.json({ error: 'locationId, startDate and endDate are required' }, { status: 400 })
    }
    const cosmos = getCosmosClient()
    if (cosmos) {
      const dbName = process.env.COSMOS_DB || 'rentacar-db'
      const containerName = process.env.COSMOS_LOCATIONS_CONTAINER || 'locations'
      const { database } = await cosmos.databases.createIfNotExists({ id: dbName })
      const { container } = await database.containers.createIfNotExists({ id: containerName })
      const { resources } = await container.items.query({ query: 'SELECT * FROM c WHERE c.id = @id', parameters: [{ name: '@id', value: locationId }] }).fetchAll()
      const loc = resources[0]
      const inv = (loc && loc.inventory) || []
      const filtered = vehicleType ? inv.filter((v: any) => v.vehicleType === vehicleType) : inv
      return NextResponse.json({ count: filtered.length, vehicles: filtered })
    }

    // Fallback sample
    const sampleInventory: Record<string, Array<any>> = {
      loc1: [
        { vehicleId: 'v-loc1-001', vehicleType: 'コンパクト', manufacturer: 'トヨタ', vehicleModel: 'ヤリス' },
        { vehicleId: 'v-loc1-002', vehicleType: 'SUV', manufacturer: 'ホンダ', vehicleModel: 'CR-V' }
      ],
      loc2: [
        { vehicleId: 'v-loc2-001', vehicleType: 'コンパクト', manufacturer: '日産', vehicleModel: 'マーチ' }
      ],
      loc3: [
        { vehicleId: 'v-loc3-001', vehicleType: 'コンパクト', manufacturer: 'トヨタ', vehicleModel: 'ヤリス' }
      ]
    }
    const inv = sampleInventory[locationId] || []
    const filtered = vehicleType ? inv.filter(v => v.vehicleType === vehicleType) : inv
    return NextResponse.json({ count: filtered.length, vehicles: filtered })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
