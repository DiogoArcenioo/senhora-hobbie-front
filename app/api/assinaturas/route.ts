import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

export async function GET(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization") ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const backendResponse = await fetch(buildBackendUrl("/assinaturas"), {
      method: "GET",
      headers: {
        Authorization: authorizationHeader,
      },
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel consultar assinaturas.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao consultar assinaturas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization") ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const body = await request.json();

    const backendResponse = await fetch(buildBackendUrl("/assinaturas"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorizationHeader,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel criar assinatura.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao criar assinatura." }, { status: 500 });
  }
}
