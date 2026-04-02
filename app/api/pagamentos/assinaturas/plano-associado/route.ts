import { NextResponse } from "next/server";
import { buildBackendUrl, getBackendErrorMessage, parseBackendPayload } from "@/app/lib/backend-api";

type CreateSubscriptionBody = {
  planoId?: string;
};

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization") ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const body = (await request.json()) as CreateSubscriptionBody;
    const planoId = body.planoId?.trim() ?? "";

    if (!planoId) {
      return NextResponse.json({ message: "planoId e obrigatorio." }, { status: 400 });
    }

    const backendResponse = await fetch(buildBackendUrl("/pagamentos/assinaturas/plano-associado"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorizationHeader,
      },
      body: JSON.stringify({ planoId }),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel iniciar assinatura no Mercado Pago.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao iniciar assinatura no Mercado Pago." },
      { status: 500 },
    );
  }
}
