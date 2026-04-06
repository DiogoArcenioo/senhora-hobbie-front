import { NextResponse } from "next/server";
import {
  buildBackendUrl,
  getBackendErrorMessage,
  parseBackendPayload,
} from "@/app/lib/backend-api";

export async function GET() {
  try {
    const backendResponse = await fetch(buildBackendUrl("/imagens/site/home-destaque"), {
      method: "GET",
      cache: "no-store",
    });

    const payload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(payload) ?? "Nao foi possivel carregar a imagem.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao carregar imagem." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization") ?? "";

    if (!authorizationHeader.trim()) {
      return NextResponse.json({ message: "Token nao informado." }, { status: 401 });
    }

    const formData = await request.formData();
    const arquivo = formData.get("arquivo");

    if (!(arquivo instanceof File)) {
      return NextResponse.json({ message: "Arquivo nao informado." }, { status: 400 });
    }

    const payload = new FormData();
    payload.append("arquivo", arquivo);

    const backendResponse = await fetch(buildBackendUrl("/imagens/site/home-destaque"), {
      method: "POST",
      headers: {
        Authorization: authorizationHeader,
      },
      body: payload,
      cache: "no-store",
    });

    const backendPayload = await parseBackendPayload(backendResponse);

    if (!backendResponse.ok) {
      const message = getBackendErrorMessage(backendPayload) ?? "Nao foi possivel enviar a imagem.";
      return NextResponse.json({ message }, { status: backendResponse.status });
    }

    return NextResponse.json(backendPayload, { status: backendResponse.status });
  } catch {
    return NextResponse.json({ message: "Erro inesperado ao enviar imagem." }, { status: 500 });
  }
}
