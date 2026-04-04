import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

type RouteContext = {
  params: Promise<{
    id: string;
    fotoId: string;
  }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id, fotoId } = await context.params;

    if (!id || !id.trim() || !fotoId || !fotoId.trim()) {
      return NextResponse.json({ message: "Identificador invalido para exclusao de foto." }, { status: 400 });
    }

    const authorizationHeader = (request.headers.get("authorization") ?? "").trim();

    if (!authorizationHeader) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const candidatePaths = [
      `/eventos/${encodeURIComponent(id)}/fotos/${encodeURIComponent(fotoId)}`,
      `/eventos/fotos/${encodeURIComponent(fotoId)}`,
    ];

    let latestPayload: unknown = null;
    let latestStatus = 404;

    for (const path of candidatePaths) {
      const backendResponse = await fetch(buildBackendUrl(path), {
        method: "DELETE",
        headers: {
          Authorization: authorizationHeader,
        },
        cache: "no-store",
      });

      const backendPayload = await parseBackendPayload(backendResponse);

      if (backendResponse.ok) {
        return NextResponse.json(backendPayload ?? { message: "Foto excluida." }, { status: backendResponse.status });
      }

      latestPayload = backendPayload;
      latestStatus = backendResponse.status;

      if (backendResponse.status !== 404 && backendResponse.status !== 405) {
        break;
      }
    }

    const message = getBackendErrorMessage(latestPayload) ?? "Nao foi possivel excluir a foto do evento.";
    return NextResponse.json({ message }, { status: latestStatus });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao excluir foto do evento." }, { status: 500 });
  }
}