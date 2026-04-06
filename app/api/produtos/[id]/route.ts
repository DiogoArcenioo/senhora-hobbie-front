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

function resolveProductId(id: string): string {
  return id?.trim() ?? "";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const produtoId = resolveProductId(id);

    if (!produtoId) {
      return NextResponse.json({ message: "Id do produto invalido." }, { status: 400 });
    }

    const authorizationHeader = (request.headers.get("authorization") ?? "").trim();
    const backendPath = authorizationHeader
      ? `/produtos/${encodeURIComponent(produtoId)}`
      : `/produtos/public/${encodeURIComponent(produtoId)}`;

    const backendResponse = await fetch(buildBackendUrl(backendPath), {
      method: "GET",
      headers: authorizationHeader
        ? {
            Authorization: authorizationHeader,
          }
        : undefined,
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel carregar produto.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao carregar produto." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const produtoId = resolveProductId(id);
    const authorizationHeader = (request.headers.get("authorization") ?? "").trim();

    if (!produtoId) {
      return NextResponse.json({ message: "Id do produto invalido." }, { status: 400 });
    }

    if (!authorizationHeader) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const formData = await request.formData();
    const payload = new FormData();

    for (const [key, value] of formData.entries()) {
      payload.append(key, value);
    }

    const backendResponse = await fetch(buildBackendUrl(`/produtos/${encodeURIComponent(produtoId)}`), {
      method: "PATCH",
      headers: {
        Authorization: authorizationHeader,
      },
      body: payload,
      cache: "no-store",
    });

    const backendPayload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(backendPayload) ?? "Nao foi possivel atualizar produto.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(backendPayload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao atualizar produto." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const produtoId = resolveProductId(id);
    const authorizationHeader = (request.headers.get("authorization") ?? "").trim();

    if (!produtoId) {
      return NextResponse.json({ message: "Id do produto invalido." }, { status: 400 });
    }

    if (!authorizationHeader) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const backendResponse = await fetch(buildBackendUrl(`/produtos/${encodeURIComponent(produtoId)}`), {
      method: "DELETE",
      headers: {
        Authorization: authorizationHeader,
      },
      cache: "no-store",
    });

    const backendPayload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(backendPayload) ?? "Nao foi possivel inativar produto.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(backendPayload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao inativar produto." }, { status: 500 });
  }
}
