import { NextResponse } from "next/server";
import { buildBackendUrl, getBackendErrorMessage, parseBackendPayload } from "@/app/lib/backend-api";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authorizationHeader = request.headers.get("authorization") ?? "";
    const planoId = id?.trim() ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    if (!planoId) {
      return NextResponse.json({ message: "Id do plano nao informado." }, { status: 400 });
    }

    const backendResponse = await fetch(buildBackendUrl(`/planos/${encodeURIComponent(planoId)}`), {
      method: "GET",
      headers: {
        Authorization: authorizationHeader,
      },
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel consultar o plano.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Erro inesperado ao consultar plano." },
      { status: 500 },
    );
  }
}
