import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token = searchParams.get('token')

  if (token) {
    // Redirect to home with token — the auth context will pick it up
    return NextResponse.redirect(`${origin}?token=${token}`)
  }

  return NextResponse.redirect(`${origin}?verified=error&reason=no-token`)
}
