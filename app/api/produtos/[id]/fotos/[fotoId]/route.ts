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
    const produtoId = id?.trim() ?? "";
    const imagemId = fotoId?.trim() ?? "";
    const authorizationHeader = (request.headers.get("authorization") ?? "").trim();

    if (!produtoId || !imagemId) {
      return NextResponse.json({ message: "Identificador invalido para exclusao de foto." }, { status: 400 });
    }

    if (!authorizationHeader) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const backendResponse = await fetch(
      buildBackendUrl(`/produtos/${encodeURIComponent(produtoId)}/fotos/${encodeURIComponent(imagemId)}`),
      {
        method: "DELETE",
        headers: {
          Authorization: authorizationHeader,
        },
        cache: "no-store",
      },
    );

    const backendPayload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(backendPayload) ?? "Nao foi possivel excluir a foto do produto.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(backendPayload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao excluir foto do produto." }, { status: 500 });
  }
}
