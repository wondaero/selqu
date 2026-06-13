import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')?.trim()
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase 서버에 GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    if (req.method === 'GET') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`
      const response = await fetch(url)
      const data = await response.json()
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const requestBody = await req.json()
    const { model, contents, generationConfig } = requestBody

    if (!model || !contents) {
      return new Response(
        JSON.stringify({ error: '요청 바디에 model 또는 contents 필드가 누락되었습니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    const modelClean = model.trim()
    console.log(`[gemini-proxy] Calling model: "${modelClean}", API Key Length: ${geminiApiKey.length}`)

    // Gemini API 호출 URL 구성
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelClean}:generateContent?key=${geminiApiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: Deno.env.get('GEMINI_API_KEY') ? {
        'Content-Type': 'application/json'
      } : {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        generationConfig
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(
        JSON.stringify({ error: `Gemini API 호출 중 에러 발생: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
      )
    }

    const resData = await response.json()
    return new Response(
      JSON.stringify(resData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }
})
