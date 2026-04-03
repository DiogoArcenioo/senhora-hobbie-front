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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || !id.trim()) {
      return NextResponse.json({ message: "Id do evento invalido." }, { status: 400 });
    }

    const backendResponse = await fetch(
      buildBackendUrl(`/eventos/public/${encodeURIComponent(id)}/album`),
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel carregar o album.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao carregar album." }, { status: 500 });
  }
}
