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

function validateAuthHeader(request: Request): string {
  const authorizationHeader = request.headers.get("authorization") ?? "";
  return authorizationHeader.trim();
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || !id.trim()) {
      return NextResponse.json({ message: "Id do evento invalido." }, { status: 400 });
    }

    const authorizationHeader = validateAuthHeader(request);

    if (!authorizationHeader) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const formData = await request.formData();
    const payload = new FormData();

    for (const [key, value] of formData.entries()) {
      payload.append(key, value);
    }

    const routePath = `/eventos/${encodeURIComponent(id)}`;

    let backendResponse = await fetch(buildBackendUrl(routePath), {
      method: "PATCH",
      headers: {
        Authorization: authorizationHeader,
      },
      body: payload,
      cache: "no-store",
    });

    if (backendResponse.status === 404 || backendResponse.status === 405) {
      backendResponse = await fetch(buildBackendUrl(routePath), {
        method: "PUT",
        headers: {
          Authorization: authorizationHeader,
        },
        body: payload,
        cache: "no-store",
      });
    }

    const backendPayload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(backendPayload) ?? "Nao foi possivel atualizar evento.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(backendPayload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao atualizar evento." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id || !id.trim()) {
      return NextResponse.json({ message: "Id do evento invalido." }, { status: 400 });
    }

    const authorizationHeader = validateAuthHeader(request);

    if (!authorizationHeader) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const backendResponse = await fetch(buildBackendUrl(`/eventos/${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers: {
        Authorization: authorizationHeader,
      },
      cache: "no-store",
    });

    const backendPayload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(backendPayload) ?? "Nao foi possivel excluir evento.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(backendPayload ?? { message: "Evento excluido." }, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao excluir evento." }, { status: 500 });
  }
}