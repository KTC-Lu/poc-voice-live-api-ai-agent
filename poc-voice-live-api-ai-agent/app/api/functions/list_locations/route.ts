import { NextResponse } from 'next/server'
import { getCosmosClient } from '../../../../lib/cosmosClient'

const sampleLocations = [
  { id: 'loc1', name: '東京レンタカー', address: '東京都千代田区1-1', phone: '+81-3-0000-0001' },
  { id: 'loc2', name: '大阪レンタカー', address: '大阪市北区2-2', phone: '+81-6-0000-0002' },
  { id: 'loc3', name: '名古屋レンタカー', address: '名古屋市中区3-3', phone: '+81-52-0000-0003' }
]

export async function GET() {
  try {
    const cosmos = getCosmosClient()
    if (cosmos) {
      const dbName = process.env.COSMOS_DB || 'rentacar-db'
      const containerName = process.env.COSMOS_LOCATIONS_CONTAINER || 'locations'
      const { database } = await cosmos.databases.createIfNotExists({ id: dbName })
      const { container } = await database.containers.createIfNotExists({ id: containerName })
      const { resources } = await container.items.query({ query: 'SELECT * FROM c' }).fetchAll()
      return NextResponse.json({ locations: resources })
    }
    return NextResponse.json({ locations: sampleLocations })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

export async function POST() {
  // also accept POST for tools/call style if invoked with empty params
  return GET()
}
