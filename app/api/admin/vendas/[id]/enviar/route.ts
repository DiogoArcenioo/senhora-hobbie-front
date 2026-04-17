import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authorizationHeader = request.headers.get("authorization") ?? "";
    const vendaId = id?.trim() ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    if (!vendaId) {
      return NextResponse.json({ message: "Id da venda nao informado." }, { status: 400 });
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const backendResponse = await fetch(
      buildBackendUrl(`/admin/vendas/${encodeURIComponent(vendaId)}/enviar`),
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
        },
        body: JSON.stringify(body ?? {}),
        cache: "no-store",
      },
    );

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel marcar como enviado.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao marcar como enviado." },
      { status: 500 },
    );
  }
}
