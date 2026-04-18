import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const authorizationHeader = request.headers.get("authorization") ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const { id } = await context.params;
    const normalizedId = typeof id === "string" ? id.trim() : "";

    if (!normalizedId) {
      return NextResponse.json({ message: "Assinatura invalida." }, { status: 400 });
    }

    const encodedId = encodeURIComponent(normalizedId);
    const backendResponse = await fetch(
      buildBackendUrl(`/admin/gestao-assinaturas/${encodedId}/sync`),
      {
        method: "POST",
        headers: {
          Authorization: authorizationHeader,
        },
        cache: "no-store",
      },
    );

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message =
        getBackendErrorMessage(payload) ?? "Nao foi possivel sincronizar a assinatura.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao sincronizar a assinatura." },
      { status: 500 },
    );
  }
}
