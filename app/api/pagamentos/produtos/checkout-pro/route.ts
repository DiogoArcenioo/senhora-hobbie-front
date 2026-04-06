import { NextResponse } from "next/server";
import { buildBackendUrl, getBackendErrorMessage, parseBackendPayload } from "@/app/lib/backend-api";

type ProdutoCheckoutBody = {
  produtoId?: string;
};

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization") ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const body = (await request.json()) as ProdutoCheckoutBody;
    const produtoId = body.produtoId?.trim() ?? "";

    if (!produtoId) {
      return NextResponse.json({ message: "produtoId e obrigatorio." }, { status: 400 });
    }

    const backendResponse = await fetch(buildBackendUrl("/pagamentos/produtos/checkout-pro"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorizationHeader,
      },
      body: JSON.stringify({ produtoId }),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel iniciar checkout do produto no Mercado Pago.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao iniciar checkout do produto no Mercado Pago." },
      { status: 500 },
    );
  }
}
