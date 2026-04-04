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

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authorizationHeader = request.headers.get("authorization") ?? "";
    const assinaturaId = id?.trim() ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    if (!assinaturaId) {
      return NextResponse.json({ message: "Id da assinatura nao informado." }, { status: 400 });
    }

    const backendResponse = await fetch(buildBackendUrl(`/assinaturas/${encodeURIComponent(assinaturaId)}`), {
      method: "GET",
      headers: {
        Authorization: authorizationHeader,
      },
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel consultar assinatura.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao consultar assinatura." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authorizationHeader = request.headers.get("authorization") ?? "";
    const assinaturaId = id?.trim() ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    if (!assinaturaId) {
      return NextResponse.json({ message: "Id da assinatura nao informado." }, { status: 400 });
    }

    const body = await request.json();

    const backendResponse = await fetch(buildBackendUrl(`/assinaturas/${encodeURIComponent(assinaturaId)}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorizationHeader,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel atualizar assinatura.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao atualizar assinatura." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authorizationHeader = request.headers.get("authorization") ?? "";
    const assinaturaId = id?.trim() ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    if (!assinaturaId) {
      return NextResponse.json({ message: "Id da assinatura nao informado." }, { status: 400 });
    }

    const backendResponse = await fetch(buildBackendUrl(`/assinaturas/${encodeURIComponent(assinaturaId)}`), {
      method: "DELETE",
      headers: {
        Authorization: authorizationHeader,
      },
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel inativar assinatura.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao inativar assinatura." }, { status: 500 });
  }
}
