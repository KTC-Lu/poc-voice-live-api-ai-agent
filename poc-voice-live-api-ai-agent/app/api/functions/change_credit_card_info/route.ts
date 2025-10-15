import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cardNumber, changeType, newValue } = body

    // 入力検証
    if (!cardNumber || !changeType || !newValue) {
      return NextResponse.json(
        { error: 'カード番号、変更種別、新しい値はすべて必須です' },
        { status: 400 }
      )
    }

    // 変更種別の検証
    const validChangeTypes = ['address', 'phone', 'email']
    if (!validChangeTypes.includes(changeType)) {
      return NextResponse.json(
        { error: '変更種別は address, phone, email のいずれかである必要があります' },
        { status: 400 }
      )
    }

    // カード番号の簡易検証（下4桁のみを想定）
    if (cardNumber.length < 4) {
      return NextResponse.json(
        { error: 'カード番号は最低4桁必要です' },
        { status: 400 }
      )
    }

    // 実際のシステムでは、ここでデータベースへの更新処理を行います
    // このPOCでは、成功レスポンスをシミュレートします

    const changeTypeNames: Record<string, string> = {
      address: '住所',
      phone: '電話番号',
      email: 'メールアドレス'
    }

    const response = {
      success: true,
      message: `カード番号下4桁 ${cardNumber.slice(-4)} の${changeTypeNames[changeType]}を正常に変更しました`,
      details: {
        cardNumberLast4: cardNumber.slice(-4),
        changeType: changeTypeNames[changeType],
        newValue: changeType === 'phone' ? maskPhoneNumber(newValue) : newValue,
        timestamp: new Date().toISOString()
      }
    }

    return NextResponse.json(response)
  } catch (e: any) {
    console.error('Credit card info change error:', e)
    return NextResponse.json(
      { error: e?.message || '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 電話番号の一部をマスキングする補助関数
function maskPhoneNumber(phone: string): string {
  if (phone.length <= 4) return phone
  const last4 = phone.slice(-4)
  const masked = '*'.repeat(phone.length - 4)
  return masked + last4
}
