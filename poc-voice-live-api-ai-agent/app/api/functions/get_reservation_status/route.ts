import { NextResponse } from 'next/server'
import { getCosmosClient } from '../../../../lib/cosmosClient'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { customerName } = body
    if (!customerName) return NextResponse.json({ error: 'customerName required' }, { status: 400 })

    const cosmos = getCosmosClient()
    if (cosmos) {
      const dbName = process.env.COSMOS_DB || 'rentacar-db'
      const containerName = process.env.COSMOS_RESERVATIONS_CONTAINER || 'reservations'
      const { database } = await cosmos.databases.createIfNotExists({ id: dbName })
      const { container } = await database.containers.createIfNotExists({ id: containerName })

      // Simple SQL query to find by customerName (case-sensitive per default; can change)
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.customerName = @name',
        parameters: [{ name: '@name', value: customerName }]
      }
      const { resources } = await container.items.query(querySpec).fetchAll()
      return NextResponse.json({ count: resources.length, results: resources })
    }

    // Fallback to in-memory
    let globalAny: any
    try { globalAny = globalThis as any } catch (_) { globalAny = {} }
    const matches = (globalAny.__rentacar_reservations || []).filter((r: any) => r.customerName === customerName)
    return NextResponse.json({ count: matches.length, results: matches })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
